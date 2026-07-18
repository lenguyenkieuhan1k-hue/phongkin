import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-dark-950 flex items-center justify-center p-4">
      <div className="text-center space-y-5 max-w-md">
        <div className="text-8xl font-bold text-accent-500/20 select-none">404</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Trang không tồn tại</h1>
          <p className="text-gray-400 text-sm">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
          </p>
        </div>
        <Link href="/" className="btn btn-primary inline-block">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
