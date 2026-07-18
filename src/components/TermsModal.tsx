'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface TermsModalProps {
  isOpen: boolean;
  type: 'terms' | 'privacy';
  onClose: () => void;
  onAgree: () => void;
}

export default function TermsModal({ isOpen, type, onClose, onAgree }: TermsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setHasScrolledToBottom(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  if (!isOpen) return null;

  const isTerms = type === 'terms';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-bg-900 rounded-2xl border border-bg-700 shadow-2xl flex flex-col overflow-hidden animate-in"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-bg-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-600 to-accent-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isTerms ? 'Điều khoản sử dụng' : 'Chính sách quyền riêng tư'}
              </h2>
              <p className="text-xs text-gray-500">
                Vui lòng đọc kỹ trước khi đồng ý
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-800 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-6"
          onScroll={handleScroll}
        >
          {isTerms ? (
            <div className="space-y-6 text-sm text-gray-300">
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">1. Giới thiệu</h3>
                <p className="leading-relaxed">
                  Chào mừng bạn đến với Phòng Kín. Khi sử dụng dịch vụ của chúng tôi, bạn đồng ý 
                  tuân thủ các Điều khoản sử dụng này.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">2. Mô tả dịch vụ</h3>
                <p className="leading-relaxed">
                  Phòng Kín là nền tảng cung cấp dịch vụ tạo phòng trò chuyện riêng tư có thời hạn. 
                  Phòng chat được tạo sẽ tự động hết hạn sau thời gian do người dùng chọn và 
                  tất cả dữ liệu sẽ bị xóa khi phòng kết thúc.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">3. Trách nhiệm của người dùng</h3>
                <p className="leading-relaxed">
                  Người dùng chịu trách nhiệm hoàn toàn đối với nội dung và hành vi của mình khi sử dụng dịch vụ, 
                  bao gồm nội dung tin nhắn, file đính kèm và giao tiếp với các thành viên khác.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">4. Hành vi bị nghiêm cấm</h3>
                <p className="leading-relaxed">
                  Nghiêm cấm sử dụng dịch vụ cho các mục đích: vi phạm pháp luật Việt Nam hoặc quốc tế, 
                  xâm phạm quyền và lợi ích hợp pháp của người khác, phát tán nội dung độc hại, 
                  hoạt động lừa đảo, spam, hoặc quấy rối.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">5. Quyền của nền tảng</h3>
                <p className="leading-relaxed">
                  Nền tảng Phòng Kín có quyền từ chối cung cấp dịch vụ, khóa hoặc xóa phòng chat 
                  nếu phát hiện vi phạm, và báo cáo hành vi vi phạm pháp luật cho cơ quan có thẩm quyền.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">6. Xóa dữ liệu</h3>
                <p className="leading-relaxed">
                  Dữ liệu phòng trò chuyện (tin nhắn, file đính kèm, thông tin thành viên) sẽ được 
                  xử lý theo chính sách tự động xóa của hệ thống sau khi phòng kết thúc. 
                  Người dùng đồng ý với chính sách tự động xóa dữ liệu này.
                </p>
              </section>

              <div className="pt-4 border-t border-bg-700 space-y-3">
                <p className="text-xs text-gray-500 italic">
                  Để biết thêm chi tiết, vui lòng xem trang{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-400 hover:text-accent-300 underline"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/terms', '_blank');
                    }}
                  >
                    Điều khoản sử dụng
                  </Link>{' '}
                  đầy đủ.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-sm text-gray-300">
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">1. Thông tin chúng tôi thu thập</h3>
                <p className="leading-relaxed">
                  Để vận hành dịch vụ và xử lý thanh toán, chúng tôi thu thập: thông tin thanh toán 
                  (số tiền, mã tham chiếu), thông tin vận hành (IP đã băm, cookie), và dữ liệu trong phòng chat (tạm thời).
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">2. Dữ liệu được tự động xóa</h3>
                <p className="leading-relaxed">
                  Theo thiết kế của hệ thống, tất cả tin nhắn, file đính kèm, thông tin thành viên, 
                  link mời và metadata của phòng sẽ được tự động xóa khi phòng kết thúc.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">3. Dữ liệu được lưu theo yêu cầu pháp luật</h3>
                <p className="leading-relaxed">
                  Một số thông tin giao dịch có thể được lưu trữ theo yêu cầu của pháp luật Việt Nam 
                  về hóa đơn điện tử, xử lý khiếu nại, hoặc yêu cầu từ cơ quan có thẩm quyền.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">4. Cookie và bảo mật</h3>
                <p className="leading-relaxed">
                  Chúng tôi sử dụng cookie để nhận diện phiên làm việc và ngăn chặn spam. 
                  Chúng tôi không sử dụng cookie cho mục đích quảng cáo hoặc theo dõi hành vi trên các trang web khác.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">5. Dữ liệu chúng tôi KHÔNG thu thập</h3>
                <p className="leading-relaxed">
                  Chúng tôi không thu thập: họ tên, email, số điện thoại, thông tin thiết bị nhận dạng cá nhân, 
                  nội dung tin nhắn sau khi phòng kết thúc, dữ liệu vị trí GPS, hoặc thông tin tài khoản mạng xã hội.
                </p>
              </section>

              <div className="pt-4 border-t border-bg-700 space-y-3">
                <p className="text-xs text-gray-500 italic">
                  Để biết thêm chi tiết, vui lòng xem trang{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-400 hover:text-accent-300 underline"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/privacy', '_blank');
                    }}
                  >
                    Chính sách quyền riêng tư
                  </Link>{' '}
                  đầy đủ.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-bg-700 bg-bg-800/50">
          {!hasScrolledToBottom ? (
            <p className="text-xs text-gray-500 text-center">
              Vui lòng cuộn xuống để đọc toàn bộ nội dung trước khi đồng ý
            </p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-3">
                <button
                  onClick={() => window.open(isTerms ? '/terms' : '/privacy', '_blank')}
                  className="text-xs text-accent-400 hover:text-accent-300 underline"
                >
                  Xem trang đầy đủ
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="btn btn-secondary px-5"
                >
                  Không đồng ý
                </button>
                <button
                  onClick={onAgree}
                  className="btn btn-primary px-5"
                >
                  Tôi đã đọc và đồng ý
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
