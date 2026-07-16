import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Phòng Kín - Họp ở đây, dừng ở đây',
  description: 'Phòng chat riêng tư theo thời gian. Không tài khoản. Không lưu lại.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-dark-900 antialiased">
        {children}
      </body>
    </html>
  );
}
