// DarkTalk - Clean Build
import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'Phòng Kín - Họp ở đây, an toàn ở đây',
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
      <head>
        {/* Anti-flash: set theme NGAY khi parse HTML, trước khi React hydrate.
            Đọc pk:theme:<token> từ localStorage (token = last URL segment).
            Default = 'meeting' (slate/neutral). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname.split('/').filter(Boolean).pop()||'';var t=localStorage.getItem('pk:theme:'+p);if(t!=='romance'&&t!=='meeting')t='meeting';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','meeting');}})();`,
          }}
        />
      </head>
      <body className="min-h-dvh bg-bg-900 antialiased overscroll-none">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
