import Link from 'next/link';

export default function PaymentExpiredPage() {
  return (
    <div className="min-h-dvh bg-bg-950 flex items-center justify-center p-4">
      <div className="text-center space-y-5 max-w-md card p-10">
        <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Thanh toán đã hết hạn</h1>
          <p className="text-gray-400 text-sm">
            Mã QR thanh toán chỉ có hiệu lực trong 10 phút. Vui lòng tạo phòng mới.
          </p>
        </div>
        <Link href="/" className="btn btn-primary w-full block text-center">
          Tạo phòng mới
        </Link>
      </div>
    </div>
  );
}
