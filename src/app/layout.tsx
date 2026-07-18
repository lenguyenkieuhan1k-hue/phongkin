import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'Phòng Kín - Họp ở đây, dừng ở đây',
  description: 'Phòng chat riêng tư theo thời gian. Không tài khoản. Không lưu lại.',
  icons: {
    icon: '/favicon.png',
    apple: '/icon-192.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Phòng Kín',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0f0f12',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-dvh bg-dark-900 antialiased overscroll-none">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
