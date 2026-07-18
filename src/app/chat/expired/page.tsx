import Link from 'next/link';

export default function RoomExpiredPage() {
  return (
    <div className="min-h-dvh bg-dark-950 flex items-center justify-center p-4">
      <div className="text-center space-y-5 max-w-md card p-10">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Phòng đã kết thúc</h1>
          <p className="text-gray-400 text-sm">
            Cuộc trò chuyện đã kết thúc và toàn bộ dữ liệu đã được xóa để bảo vệ quyền riêng tư của bạn.
          </p>
        </div>
        <Link href="/" className="btn btn-primary w-full block text-center">
          Tạo phòng mới
        </Link>
      </div>
    </div>
  );
}
