'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DURATION_LABELS,
  MEMBER_LIMITS,
  PRICING,
  formatVND,
  type Duration,
  type MaxMembers,
} from '@/lib/pricing';
import { TERMS_VERSION } from '@/lib/pricing';
import TermsModal from '@/components/TermsModal';

export default function CreatePage() {
  const router = useRouter();
  const [duration, setDuration] = useState<Duration>(60);
  const [maxMembers, setMaxMembers] = useState<MaxMembers>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedAt, setAgreedAt] = useState<Date | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsType, setTermsType] = useState<'terms' | 'privacy'>('terms');

  const price = PRICING[`${duration}_${maxMembers}` as keyof typeof PRICING];

  const openTermsModal = (type: 'terms' | 'privacy') => {
    setTermsType(type);
    setShowTermsModal(true);
  };

  const handleAgreeToTerms = () => {
    setAgreedToTerms(true);
    setAgreedAt(new Date());
    setShowTermsModal(false);
  };

  const handleCreate = async () => {
    if (!agreedToTerms || !agreedAt) {
      setError('Bạn phải đồng ý với Điều khoản sử dụng để tiếp tục.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration,
          maxMembers,
          agreedToTerms,
          agreedAt: agreedAt.toISOString(),
          termsVersion: TERMS_VERSION,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể tạo thanh toán');
        return;
      }

      // BYPASS: tạo phòng luôn → vào thẳng phòng
      if (data.inviteToken) {
        router.push(`/r/${data.inviteToken}`);
        return;
      }

      // Cache invoice để payment page đọc lại (chỉ trong tab này)
      sessionStorage.setItem(
        `payment:${data.paymentId}`,
        JSON.stringify({
          qrContent: data.qrContent,
          sepayRef: data.sepayRef,
          amount: data.amount,
          duration,
          maxMembers,
          status: 'PENDING',
          agreedToTerms: true,
          agreedAt: agreedAt.toISOString(),
          termsVersion: TERMS_VERSION,
        })
      );
      sessionStorage.setItem(`payment:${data.paymentId}:createdAt`, String(Date.now()));

      router.push(`/payment/${data.paymentId}`);
    } catch (e) {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 py-10">
      <TermsModal
        isOpen={showTermsModal}
        type={termsType}
        onClose={() => setShowTermsModal(false)}
        onAgree={handleAgreeToTerms}
      />

      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Trang chủ
          </button>
          <h1 className="text-3xl font-bold text-white mt-3">Tạo phòng mới</h1>
          <p className="text-gray-400 mt-1">Chọn thời lượng và số người tham gia.</p>
        </div>

        <div className="card p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Thời lượng phòng
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(DURATION_LABELS) as unknown as string[]).map((key) => {
                const d = Number(key) as Duration;
                return (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    duration === d
                      ? 'border-accent-500 bg-accent-600/10 text-white'
                      : 'border-dark-700 hover:border-dark-600 text-gray-300'
                  }`}
                >
                  <div className="text-lg font-semibold">{DURATION_LABELS[d]}</div>
                </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Số lượng thành viên tối đa
            </label>
            <div className="grid grid-cols-4 gap-3">
              {MEMBER_LIMITS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMaxMembers(m)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    maxMembers === m
                      ? 'border-accent-500 bg-accent-600/10 text-white'
                      : 'border-dark-700 hover:border-dark-600 text-gray-300'
                  }`}
                >
                  <div className="text-xl font-bold">{m}</div>
                  <div className="text-xs text-gray-500">người</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-dark-700">
            <div className="flex items-baseline justify-between">
              <span className="text-gray-400">Tổng thanh toán</span>
              <span className="text-3xl font-bold text-accent-400">{formatVND(price)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Phòng tự động đóng sau {DURATION_LABELS[duration]}. Toàn bộ dữ liệu sẽ được xóa.
            </p>
          </div>

          {/* Terms Agreement */}
          <div className="pt-4 border-t border-dark-700 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreedToTerms}
                onChange={(e) => {
                  if (e.target.checked) {
                    setAgreedToTerms(true);
                    setAgreedAt(new Date());
                  } else {
                    setAgreedToTerms(false);
                    setAgreedAt(null);
                  }
                }}
                className="mt-1 w-5 h-5 rounded border-dark-600 bg-dark-800 text-accent-600 focus:ring-accent-500 focus:ring-offset-dark-900"
              />
              <label htmlFor="agree-terms" className="text-sm text-gray-300 leading-relaxed">
                Tôi đã đọc, hiểu và đồng ý với{' '}
                <button
                  type="button"
                  onClick={() => openTermsModal('terms')}
                  className="text-accent-400 hover:text-accent-300 underline underline-offset-2"
                >
                  Điều khoản sử dụng
                </button>{' '}
                và{' '}
                <button
                  type="button"
                  onClick={() => openTermsModal('privacy')}
                  className="text-accent-400 hover:text-accent-300 underline underline-offset-2"
                >
                  Chính sách quyền riêng tư
                </button>{' '}
                của Phòng Kín.
              </label>
            </div>

            {agreedToTerms && agreedAt && (
              <p className="text-xs text-gray-500 pl-8">
                Đã đồng ý lúc {agreedAt.toLocaleString('vi-VN')}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !agreedToTerms}
            className="w-full btn btn-primary text-lg py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang tạo phòng...' : `Vào phòng ${formatVND(price)}`}
          </button>

          {!agreedToTerms && (
            <p className="text-xs text-gray-500 text-center">
              Vui lòng đồng ý với Điều khoản sử dụng để tiếp tục
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
