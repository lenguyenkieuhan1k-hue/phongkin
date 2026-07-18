'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const paymentId = params.id;

  const [inviteToken, setInviteToken] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Lấy inviteToken từ API
    fetch(`/api/payment/${paymentId}/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data.inviteToken) {
          setInviteToken(data.inviteToken);
        } else {
          // retry sau 2s
          setTimeout(() => {
            fetch(`/api/payment/${paymentId}/status`)
              .then((r) => r.json())
              .then((d) => d.inviteToken && setInviteToken(d.inviteToken));
          }, 2000);
        }
      });
  }, [paymentId]);

  const inviteUrl = inviteToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${inviteToken}`
    : '';

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    if (inviteToken) router.push(`/chat/${inviteToken}`);
  };

  return (
    <div className="min-h-dvh bg-bg-950 py-10 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="card p-8 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">Thanh toán thành công!</h1>
            <p className="text-gray-400 text-sm mt-1">Phòng chat của bạn đã sẵn sàng.</p>
          </div>

          {inviteToken ? (
            <>
              <div className="bg-bg-900 rounded-lg p-4 text-left">
                <div className="text-xs text-gray-500 mb-2">Link mời tham gia phòng</div>
                <div className="font-mono text-sm text-bg-300 break-all">{inviteUrl}</div>
              </div>

              <button onClick={handleCopy} className="btn btn-secondary w-full">
                {copied ? 'Đã copy!' : 'Copy link'}
              </button>

              <button onClick={handleJoin} className="btn btn-primary w-full text-lg py-3">
                Vào phòng ngay
              </button>

              <p className="text-xs text-gray-500">
                Gửi link trên cho người khác để họ tham gia. Mỗi phòng có một link duy nhất.
              </p>
            </>
          ) : (
            <div className="text-gray-400">
              <div className="w-6 h-6 mx-auto border-2 border-bg-500 border-t-transparent rounded-full animate-spin mb-2" />
              Đang tạo phòng...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
