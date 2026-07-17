'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatVND } from '@/lib/pricing';

type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const paymentId = params.id;

  const [status, setStatus] = useState<PaymentStatus>('PENDING');
  const [qrContent, setQrContent] = useState<string>('');
  const [sepayRef, setSepayRef] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [duration, setDuration] = useState<number>(60);
  const [maxMembers, setMaxMembers] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('10:00');

  // Lấy thông tin invoice
  useEffect(() => {
    fetch(`/api/payment/${paymentId}/status`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => {
        setStatus(data.status);
        setAmount(data.amount);
        setDuration(data.duration);
        setMaxMembers(data.maxMembers);
        setSepayRef(data.sepayRef);
        // Nếu đã EXPIRED hoặc FAILED → redirect
        if (data.status === 'EXPIRED') {
          router.replace('/payment/expired');
        }
      })
      .catch(() => setError('Không tìm thấy thanh toán'));
  }, [paymentId, router]);

  // Lấy QR content (từ POST create, mình cache state khi navigate)
  useEffect(() => {
    const cached = sessionStorage.getItem(`payment:${paymentId}`);
    if (cached) {
      const data = JSON.parse(cached);
      setQrContent(data.qrContent);
      setSepayRef(data.sepayRef);
      setAmount(data.amount);
      setDuration(data.duration);
      setMaxMembers(data.maxMembers);
      setStatus(data.status);
      if (data.status === 'EXPIRED') {
        router.replace('/payment/expired');
      }
    } else {
      setError('Phiên thanh toán đã hết. Vui lòng tạo lại.');
    }
  }, [paymentId, router]);

  // Polling status mỗi 3s
  useEffect(() => {
    if (status !== 'PENDING') return;

    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/payment/${paymentId}/status`);
        if (!r.ok) return;
        const data = await r.json();
        setStatus(data.status);
        if (data.status === 'SUCCESS') {
          clearInterval(poll);
          sessionStorage.setItem(
            `payment:${paymentId}`,
            JSON.stringify({
              ...JSON.parse(sessionStorage.getItem(`payment:${paymentId}`) || '{}'),
              status: 'SUCCESS',
              inviteToken: data.inviteToken,
              roomId: data.roomId,
            })
          );
          router.push(`/payment/${paymentId}/success`);
        } else if (data.status === 'EXPIRED' || data.status === 'FAILED') {
          clearInterval(poll);
          router.replace('/payment/expired');
        }
      } catch {}
    }, 3000);

    return () => clearInterval(poll);
  }, [paymentId, status, router]);

  // Đếm ngược
  useEffect(() => {
    if (status !== 'PENDING') return;
    const tick = () => {
      const createdAt = sessionStorage.getItem(`payment:${paymentId}:createdAt`);
      if (!createdAt) return;
      const elapsed = Math.floor((Date.now() - parseInt(createdAt, 10)) / 1000);
      const remaining = 10 * 60 - elapsed;
      if (remaining <= 0) {
        setTimeLeft('00:00');
        setStatus('EXPIRED');
        router.replace('/payment/expired');
        return;
      }
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      setTimeLeft(`${m}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [paymentId, status, router]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sepayRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-dark-950 py-10">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Quét QR để thanh toán</h1>
          <p className="text-gray-400 text-sm mt-1">
            Mở app ngân hàng và quét mã QR bên dưới.
          </p>
        </div>

        <div className="card p-6 text-center space-y-4">
          {qrContent ? (
            <div className="bg-white p-3 rounded-xl inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrContent} alt="QR thanh toán" className="w-64 h-64" />
            </div>
          ) : (
            <div className="w-64 h-64 mx-auto bg-dark-700 rounded-xl flex items-center justify-center">
              <span className="text-gray-500">Đang tải QR...</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-3xl font-bold text-accent-400">{formatVND(amount)}</div>
            <div className="text-sm text-gray-400">
              Phòng {duration === 30 ? '30 phút' : duration === 60 ? '1 giờ' : '2 giờ'} · Tối đa{' '}
              {maxMembers} người
            </div>
          </div>

          <div className="bg-dark-900 rounded-lg p-3 flex items-center justify-between">
            <div className="text-left">
              <div className="text-xs text-gray-500">Nội dung chuyển khoản</div>
              <div className="font-mono text-white">{sepayRef}</div>
            </div>
            <button
              onClick={handleCopy}
              className="btn btn-secondary text-xs px-3 py-1.5"
              disabled={!sepayRef}
            >
              {copied ? 'Đã copy!' : 'Copy'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                status === 'PENDING'
                  ? 'bg-yellow-500 animate-pulse'
                  : status === 'SUCCESS'
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-gray-400">
              {status === 'PENDING' && `Đang chờ thanh toán · còn ${timeLeft}`}
              {status === 'SUCCESS' && 'Thanh toán thành công!'}
              {status === 'EXPIRED' && 'Đã hết thời gian thanh toán'}
              {status === 'FAILED' && 'Thanh toán thất bại'}
            </span>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          Phòng sẽ tự động tạo ngay sau khi nhận được thanh toán.
        </div>
      </div>
    </div>
  );
}
