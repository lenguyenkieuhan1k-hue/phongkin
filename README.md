# Phòng Kín

> **Họp ở đây, dừng ở đây.**

Nền tảng tạo phòng chat riêng tư theo thời gian. Không tài khoản. Không cài đặt. Không lưu lại.

## Tính năng

- 🔒 **Riêng tư tuyệt đối** — Không cần đăng ký, không cần email
- ⚡ **Mở là vào** — Chia sẻ link, không cần nhập mã
- ⏱️ **Tự hết hạn** — Phòng đóng sau khi hết giờ, dữ liệu bị xóa
- 👥 **Lên đến 20 người** — Phòng 1-1 hoặc nhóm
- 💬 **Chat đầy đủ** — Text, emoji, ảnh, video, voice, file
- 💳 **Thanh toán QR** — Tích hợp SePay/VietQR

## Tech stack

- **Framework**: Next.js 14 (App Router) + React 18
- **Realtime**: Socket.IO 4 (custom Node server, `tsx`)
- **Database**: SQLite + Prisma 5
- **Cache**: Redis 7
- **Storage**: MinIO (S3-compatible)
- **Payment**: SePay webhook

## Cài đặt

```bash
# 1. Cài dependencies
npm install

# 2. Tạo .env (copy từ .env.example)
cp .env.example .env

# 3. Khởi tạo database
npx prisma db push

# 4. Chạy dev
npm run dev
```

Server sẽ chạy ở `http://localhost:3000`.

### Yêu cầu môi trường

| Service | Port | Mục đích |
|---|---|---|
| Node 18+ | 3000 | Web app |
| Redis | 6379 | Socket.IO scaling (optional trong dev) |
| MinIO | 9000 | File storage |

**Dev không cần Redis** — Socket.IO sẽ tự chạy ở chế độ single-node.

## Cấu trúc dự án

```
src/
├── app/
│   ├── page.tsx                      # LandingPage
│   ├── create/page.tsx               # Chọn plan
│   ├── payment/[id]/page.tsx         # QR + polling
│   ├── payment/[id]/success/page.tsx # Share link
│   ├── r/[token]/page.tsx            # Redirect → chat
│   ├── chat/[token]/page.tsx         # Phòng chat
│   └── api/
│       ├── payment/{create,webhook,[id]/status}/route.ts
│       ├── rooms/[token]/route.ts
│       ├── media/upload/route.ts
│       ├── upload/{presign,complete}/route.ts
│       └── health/route.ts
├── components/
│   ├── Landing/                      # Hero + pricing + FAQ
│   └── Chat/                         # ChatInterface, Message*, RoomHeader
├── hooks/                            # useSocket, useRoomTimer, useStore
├── lib/
│   ├── pricing.ts                    # Bảng giá + helpers
│   ├── sepay.ts                      # SePay wrapper
│   ├── rooms.ts                      # In-memory cache
│   ├── messages.ts                   # In-memory chat
│   ├── storage.ts                    # MinIO
│   ├── storage-local.ts              # Filesystem fallback
│   ├── rateLimit.ts
│   ├── guest.ts                      # Cookie-based guestId
│   ├── invite-token.ts               # nanoid(18)
│   └── prisma.ts
├── services/
│   ├── room.service.ts               # Prisma Room layer
│   ├── message.service.ts            # Send/recall/delete
│   ├── payment.service.ts            # Invoice + webhook
│   ├── room-lifecycle.service.ts     # Cron cleanup
│   └── upload.service.ts
├── socket/                           # Socket.IO
│   ├── index.ts
│   ├── events.ts
│   ├── auth.middleware.ts
│   └── handlers/{chat,message,presence}.ts
└── server.ts                         # HTTP + Next + Socket.IO bootstrap

prisma/schema.prisma                  # Payment, Room, RoomMember, Message, Attachment
```

## Flow

```
1. Visitor → /
2. → /create → chọn duration + members
3. POST /api/payment/create → trả { paymentId, qrContent }
4. → /payment/[id] (polling mỗi 3s)
5. User quét QR, chuyển khoản qua app ngân hàng
6. SePay POST /api/payment/webhook → tạo Room
7. → /payment/[id]/success → hiển thị link
8. Chia sẻ link cho người khác → /r/{token} → /chat/{token}
9. Cron mỗi 60s check rooms hết hạn → set EXPIRED + emit room:closed
10. Sau 7 ngày EXPIRED → xóa hoàn toàn khỏi DB
```

## Bảng giá

| Thời gian | 2 người | 5 người | 10 người | 20 người |
|---|---|---|---|---|
| **10 phút** | 10.000đ | 20.000đ | 35.000đ | 60.000đ |
| **30 phút** | 25.000đ | 40.000đ | 65.000đ | 100.000đ |
| **1 giờ** | 40.000đ | 65.000đ | 100.000đ | 150.000đ |
| **2 giờ** | 65.000đ | 100.000đ | 150.000đ | 250.000đ |

## Test webhook (dev)

```bash
# Tạo invoice trước bằng cách vào UI
# Sau đó giả lập SePay callback:
npx tsx scripts/test-webhook.ts <paymentId>
```

## Cấu hình SePay production

1. Đăng ký tài khoản SePay Business tại https://my.sepay.vn
2. Lấy thông tin: số tài khoản, mã ngân hàng, API key
3. Cập nhật `.env`:
   ```
   SEPAY_ACCOUNT_NUMBER="0123456789"
   SEPAY_BANK="MBBank"
   SEPAY_ACCOUNT_NAME="TEN CUA BAN"
   SEPAY_API_KEY="your_real_api_key"
   ```
4. Trong dashboard SePay, set webhook URL = `https://yourdomain.com/api/payment/webhook`
5. **TODO**: Implement signature verification trong `src/app/api/payment/webhook/route.ts`

## Scripts

```bash
npm run dev          # Chạy dev (tsx watch)
npm run build        # Build Next.js
npm start            # Production server
npm run db:push      # Apply schema lên SQLite
npm run db:studio    # Mở Prisma Studio
```

## Anti-forensic

- ✅ Mọi tin nhắn, file, member join/leave đều có TTL
- ✅ Cron cleanup tự động
- ✅ Không log IP (trừ counter chống spam)
- ✅ Không cần email/SĐT
- ✅ Guest ID chỉ tồn tại trong cookie, không liên kết với identity
- ✅ Room bị xóa hoàn toàn sau 7 ngày EXPIRED

## License

Private.
