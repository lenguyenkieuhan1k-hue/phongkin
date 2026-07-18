'use client';

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-white mb-2">Chính sách quyền riêng tư</h1>
          <p className="text-gray-400 text-sm">Cập nhật lần cuối: 16 tháng 7 năm 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <div className="card p-8 space-y-6">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">1. Giới thiệu</h2>
              <p className="text-gray-300 leading-relaxed">
                Chính sách quyền riêng tư này giải thích cách Phòng Kín thu thập, sử dụng và bảo vệ 
                thông tin của bạn khi sử dụng dịch vụ. Chúng tôi cam kết bảo vệ quyền riêng tư của bạn 
                theo quy định pháp luật hiện hành.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">2. Thông tin chúng tôi thu thập</h2>
              <p className="text-gray-300 leading-relaxed">
                Để vận hành dịch vụ và xử lý thanh toán, chúng tôi có thể thu thập các thông tin sau:
              </p>
              
              <div className="space-y-3">
                <div className="bg-bg-900 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">Thông tin thanh toán</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Số tiền giao dịch</li>
                    <li>• Mã tham chiếu thanh toán (từ cổng thanh toán SePay)</li>
                    <li>• Thời gian thanh toán</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">
                    Chúng tôi không lưu trữ số tài khoản hoặc thông tin thẻ của bạn. 
                    Thông tin này được xử lý bởi cổng thanh toán SePay.
                  </p>
                </div>

                <div className="bg-bg-900 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">Thông tin vận hành</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Địa chỉ IP (được băm để chống spam, không lưu dạng gốc)</li>
                    <li>• ID tạm thời của trình duyệt (cookie)</li>
                    <li>• Thông tin phòng: thời hạn, số thành viên tối đa</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">
                    Cookie được sử dụng để nhận diện phiên làm việc, không phải để theo dõi hoạt động của bạn.
                  </p>
                </div>

                <div className="bg-bg-900 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">Dữ liệu trong phòng chat (tạm thời)</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Tin nhắn văn bản</li>
                    <li>• File đính kèm (hình ảnh, video, tài liệu, ghi âm)</li>
                    <li>• Biệt danh của người dùng trong phòng</li>
                    <li>• Thông tin tham gia rời phòng</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">
                    Dữ liệu này chỉ tồn tại trong thời gian phòng hoạt động và sẽ bị xóa khi phòng kết thúc.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">3. Dữ liệu được tự động xóa</h2>
              <p className="text-gray-300 leading-relaxed">
                Theo thiết kế của hệ thống, các loại dữ liệu sau sẽ được tự động xử lý xóa khi phòng kết thúc:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Tất cả tin nhắn trong phòng chat</li>
                <li>Tất cả file đính kèm (hình ảnh, video, tài liệu, ghi âm)</li>
                <li>Thông tin thành viên tham gia phòng</li>
                <li>Link mời tham gia phòng</li>
                <li>Metadata của phòng (thời gian tạo, thời gian kết thúc)</li>
              </ul>
              <div className="bg-bg-600/10 border border-bg-600/30 rounded-lg p-4 mt-4">
                <p className="text-sm text-bg-300">
                  <span className="font-semibold">Lưu ý quan trọng:</span> Sau khi phòng kết thúc, dữ liệu không thể khôi phục. 
                  Hãy đảm bảo bạn đã lưu trữ những thông tin cần thiết trước khi phòng hết hạn.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">4. Dữ liệu được lưu theo yêu cầu pháp luật</h2>
              <p className="text-gray-300 leading-relaxed">
                Một số thông tin giao dịch có thể được lưu trữ theo yêu cầu của pháp luật Việt Nam về:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Hóa đơn điện tử và chứng từ kế toán</li>
                <li>Xử lý khiếu nại, tranh chấp liên quan đến giao dịch</li>
                <li>Yêu cầu từ cơ quan có thẩm quyền theo quy định pháp luật</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Các thông tin này được lưu trữ riêng biệt và không liên kết với nội dung cuộc trò chuyện 
                trong phòng chat.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">5. Cookie và công nghệ theo dõi</h2>
              <p className="text-gray-300 leading-relaxed">
                Chúng tôi sử dụng cookie với các mục đích:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><span className="text-white">Nhận diện phiên làm việc</span> — Cookie `phongkin_guest` lưu ID tạm thời 
                    để xác định người dùng trong phiên làm việc</li>
                <li><span className="text-white">Ngăn chặn spam</span> — Địa chỉ IP được băm để giới hạn số lượng 
                    yêu cầu từ cùng một nguồn</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Chúng tôi không sử dụng cookie cho mục đích quảng cáo hoặc theo dõi hành vi người dùng 
                trên các trang web khác.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">6. Bảo mật dữ liệu</h2>
              <p className="text-gray-300 leading-relaxed">
                Chúng tôi áp dụng các biện pháp bảo mật phù hợp để bảo vệ dữ liệu của bạn:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Mã hóa dữ liệu khi truyền tải (HTTPS)</li>
                <li>Hạn chế quyền truy cập vào cơ sở dữ liệu</li>
                <li>Thiết kế hệ thống tự động xóa dữ liệu nhạy cảm</li>
                <li>Không lưu trữ thông tin thanh toán nhạy cảm (số thẻ, CVV, mật khẩu)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">7. Quyền của bạn</h2>
              <p className="text-gray-300 leading-relaxed">
                Bạn có quyền:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Yêu cầu thông tin về dữ liệu của bạn mà chúng tôi lưu trữ (nếu có)</li>
                <li>Yêu cầu xóa dữ liệu trong phạm vi pháp luật cho phép</li>
                <li>Từ chối sử dụng cookie bằng cách cài đặt trình duyệt</li>
                <li>Phản hồi về bất kỳ câu hỏi nào về cách chúng tôi xử lý dữ liệu của bạn</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">8. Dữ liệu chúng tôi KHÔNG thu thập</h2>
              <p className="text-gray-300 leading-relaxed">
                Chúng tôi không thu thập:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Họ và tên, email, số điện thoại (không yêu cầu đăng ký)</li>
                <li>Địa chỉ IP đầy đủ (chỉ băm để chống spam)</li>
                <li>Thông tin thiết bị nhận dạng cá nhân</li>
                <li>Nội dung tin nhắn sau khi phòng kết thúc</li>
                <li>Dữ liệu vị trí GPS</li>
                <li>Thông tin tài khoản mạng xã hội</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">9. Thay đổi Chính sách</h2>
              <p className="text-gray-300 leading-relaxed">
                Chúng tôi có thể cập nhật Chính sách quyền riêng tư này theo thời gian. 
                Phiên bản mới sẽ có thông tin ngày cập nhật rõ ràng tại đầu trang. 
                Việc tiếp tục sử dụng dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận Chính sách mới.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white">10. Liên hệ</h2>
              <p className="text-gray-300 leading-relaxed">
                Nếu có câu hỏi về Chính sách quyền riêng tư hoặc cách chúng tôi xử lý dữ liệu của bạn, 
                vui lòng liên hệ qua kênh hỗ trợ của nền tảng.
              </p>
            </section>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/terms" className="text-bg-400 hover:text-bg-300 text-sm">
            ← Xem Điều khoản sử dụng
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
