'use client';

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-bg-950">
      {/* Header */}
      <header className="border-b border-bg-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bg-600 to-bg-800 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <Link href="/" className="font-semibold text-white hover:text-bg-400 transition-colors">
              Phòng Kín
            </Link>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Điều khoản sử dụng</h1>
          <p className="text-gray-400 text-sm">Cập nhật lần cuối: 16 tháng 7 năm 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <div className="card p-8 space-y-6">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">1. Giới thiệu</h2>
              <p className="text-gray-300 leading-relaxed">
                Chào mừng bạn đến với Phòng Kín. Khi sử dụng dịch vụ của chúng tôi, bạn đồng ý tuân thủ 
                các Điều khoản sử dụng này. Vui lòng đọc kỹ trước khi sử dụng dịch vụ.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">2. Mô tả dịch vụ</h2>
              <p className="text-gray-300 leading-relaxed">
                Phòng Kín là nền tảng cung cấp dịch vụ tạo phòng trò chuyện riêng tư có thời hạn. 
                Người dùng có thể tạo phòng chat tạm thời với thời gian và số lượng thành viên được giới hạn.
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Phòng chat được tạo sẽ tự động hết hạn sau thời gian do người dùng chọn</li>
                <li>Tất cả dữ liệu trong phòng (tin nhắn, file đính kèm) sẽ bị xóa khi phòng kết thúc</li>
                <li>Người dùng không cần đăng ký tài khoản để sử dụng dịch vụ</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">3. Trách nhiệm của người dùng</h2>
              <p className="text-gray-300 leading-relaxed">
                Người dùng chịu trách nhiệm hoàn toàn đối với nội dung và hành vi của mình khi sử dụng dịch vụ, bao gồm nhưng không giới hạn:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Nội dung tin nhắn và file đính kèm</li>
                <li>Hành vi giao tiếp với các thành viên khác trong phòng</li>
                <li>Bảo mật thông tin truy cập phòng của mình</li>
                <li>Đảm bảo nội dung không vi phạm Điều khoản này hoặc pháp luật hiện hành</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">4. Hành vi bị nghiêm cấm</h2>
              <p className="text-gray-300 leading-relaxed">
                Nghiêm cấm sử dụng dịch vụ cho các mục đích:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Vi phạm pháp luật Việt Nam hoặc quốc tế</li>
                <li>Xâm phạm quyền và lợi ích hợp pháp của người khác</li>
                <li>Phát tán nội dung độc hại, thông tin sai lệch</li>
                <li>Hoạt động lừa đảo, đánh cắp thông tin</li>
                <li>Quấy rối, đe dọa, tấn công từ chối dịch vụ (DDoS)</li>
                <li>Phát tán phần mềm độc hại hoặc mã độc</li>
                <li>Spam hoặc gửi tin nhắn hàng loạt không có sự đồng ý</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">5. Quyền của nền tảng</h2>
              <p className="text-gray-300 leading-relaxed">
                Nền tảng Phòng Kín có quyền:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Từ chối cung cấp dịch vụ cho người dùng vi phạm Điều khoản</li>
                <li>Khóa hoặc xóa phòng chat nếu phát hiện vi phạm</li>
                <li>Thay đổi, cập nhật hoặc ngừng cung cấp dịch vụ mà không cần thông báo trước</li>
                <li>Báo cáo hành vi vi phạm pháp luật cho cơ quan có thẩm quyền</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">6. Thanh toán và hoàn tiền</h2>
              <p className="text-gray-300 leading-relaxed">
                Thanh toán dịch vụ được thực hiện qua chuyển khoản ngân hàng hoặc mã QR. Chính sách hoàn tiền:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Phòng đã được tạo thành công sẽ không được hoàn tiền</li>
                <li>Thanh toán chưa hoàn tất trong thời hạn 10 phút sẽ tự động bị hủy</li>
                <li>Không hỗ trợ chuyển đổi sang gói khác sau khi thanh toán</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">7. Giới hạn trách nhiệm</h2>
              <p className="text-gray-300 leading-relaxed">
                Phòng Kín không chịu trách nhiệm đối với:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Nội dung do người dùng tạo ra trong phòng chat</li>
                <li>Hành vi của người dùng khi sử dụng dịch vụ</li>
                <li>Thiệt hại gián tiếp hoặc do mất dữ liệu (do phòng hết hạn theo thiết kế)</li>
                <li>Gián đoạn dịch vụ do lỗi kỹ thuật không nằm trong tầm kiểm soát</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">8. Xóa dữ liệu</h2>
              <p className="text-gray-300 leading-relaxed">
                Theo thiết kế của hệ thống, dữ liệu phòng trò chuyện (tin nhắn, file đính kèm, thông tin thành viên) 
                sẽ được xử lý theo chính sách tự động xóa của hệ thống sau khi phòng kết thúc. 
                Người dùng đồng ý rằng việc đồng ý với Điều khoản sử dụng này đồng nghĩa với việc chấp nhận chính sách tự động xóa dữ liệu.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">9. Thay đổi Điều khoản</h2>
              <p className="text-gray-300 leading-relaxed">
                Chúng tôi có thể cập nhật Điều khoản sử dụng theo thời gian. Phiên bản mới sẽ có 
                thông tin ngày cập nhật rõ ràng. Việc tiếp tục sử dụng dịch vụ sau khi có thay đổi 
                đồng nghĩa với việc bạn chấp nhận Điều khoản mới.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">10. Liên hệ</h2>
              <p className="text-gray-300 leading-relaxed">
                Nếu có câu hỏi về Điều khoản sử dụng, vui lòng liên hệ qua kênh hỗ trợ của nền tảng.
              </p>
            </section>

            <section className="space-y-4 pt-4 border-t border-bg-700">
              <p className="text-gray-400 text-sm italic">
                Lưu ý: Việc đồng ý với Điều khoản sử dụng không làm mất hoặc hạn chế các quyền và nghĩa vụ 
                của các bên theo quy định pháp luật hiện hành của nước Cộng hòa xã hội chủ nghĩa Việt Nam.
              </p>
            </section>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/privacy" className="text-bg-400 hover:text-bg-300 text-sm">
            Xem Chính sách quyền riêng tư →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-bg-800 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          © 2026 Phòng Kín · Họp ở đây, an toàn ở đây.
        </div>
      </footer>
    </div>
  );
}
