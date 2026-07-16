'use client';

import Link from 'next/link';
import { PRICING, DURATION_LABELS, MEMBER_LIMITS, formatVND, type Duration } from '@/lib/pricing';

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Riêng tư',
    desc: 'Không tài khoản. Không lưu lại. Dữ liệu tự xóa khi hết giờ.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Mở là vào',
    desc: 'Chỉ cần chia sẻ link. Không cần nhập mã hay mật khẩu.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Tự hết hạn',
    desc: 'Phòng đóng sau khi hết thời gian bạn chọn. Tất cả tin nhắn, file bị xóa.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Lên đến 20 người',
    desc: 'Phòng 1-1 hoặc nhóm. Thành viên tham gia qua link chia sẻ.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="border-b border-dark-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-600 to-accent-800 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-semibold text-white">Phòng Kín</span>
          </div>
          <Link href="/create" className="btn btn-primary text-sm">
            Tạo phòng
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
          Họp ở đây,{' '}
          <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
            dừng ở đây
          </span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
          Phòng chat riêng tư theo thời gian. Không cần tài khoản. Không cần cài đặt.
          Mở link là vào, hết giờ là xóa.
        </p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 btn btn-primary text-lg py-4 px-8 rounded-xl shadow-lg shadow-accent-600/25 hover:shadow-accent-500/30 transition-all"
        >
          Tạo phòng ngay
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="card p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-accent-600/20 text-accent-400 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Bảng giá</h2>
          <p className="text-gray-400">Thanh toán một lần, dùng đến khi hết giờ.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-sm font-medium text-gray-400 p-3 border-b border-dark-700">
                  Thời gian
                </th>
                {MEMBER_LIMITS.map((m) => (
                  <th
                    key={m}
                    className="text-center text-sm font-medium text-gray-400 p-3 border-b border-dark-700"
                  >
                    {m} người
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(DURATION_LABELS) as unknown as Duration[]).map((d) => (
                <tr key={d}>
                  <td className="p-3 border-b border-dark-800 font-medium text-white">
                    {DURATION_LABELS[d]}
                  </td>
                  {MEMBER_LIMITS.map((m) => (
                    <td
                      key={m}
                      className="text-center p-3 border-b border-dark-800 text-accent-400 font-semibold"
                    >
                      {formatVND(PRICING[`${d}_${m}` as keyof typeof PRICING])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-8">
          <Link href="/create" className="btn btn-primary text-base py-3 px-6">
            Tạo phòng theo nhu cầu
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-10">Câu hỏi thường gặp</h2>
        <div className="space-y-4">
          <FaqItem
            q="Dữ liệu của tôi có được lưu lại không?"
            a="Không. Tất cả tin nhắn, file và thông tin phòng bị xóa hoàn toàn khi hết thời gian."
          />
          <FaqItem
            q="Có cần đăng ký tài khoản không?"
            a="Không. Bạn chỉ cần thanh toán, nhận link, chia sẻ cho người khác. Mở link là vào phòng."
          />
          <FaqItem
            q="Phòng có giới hạn người không?"
            a="Có. Tùy theo gói bạn chọn: 2, 5, 10 hoặc 20 người. Khi đủ người, link sẽ không vào được nữa."
          />
          <FaqItem
            q="Có thể gia hạn phòng không?"
            a="Hiện tại chưa hỗ trợ. Bạn có thể tạo phòng mới với thời gian dài hơn khi cần."
          />
          <FaqItem
            q="Thanh toán như thế nào?"
            a="Chuyển khoản ngân hàng qua mã QR (VietQR/SePay). Xác nhận tự động trong vài giây."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          © 2026 Phòng Kín · Họp ở đây, dừng ở đây.
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="card p-4 group">
      <summary className="font-medium text-white cursor-pointer list-none flex items-center justify-between">
        {q}
        <svg
          className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <p className="mt-3 text-sm text-gray-400">{a}</p>
    </details>
  );
}
