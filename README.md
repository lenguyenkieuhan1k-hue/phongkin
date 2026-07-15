# DarkTalk

Anonymous peer-to-peer chat application. No accounts. No tracking. 2-hour ephemeral sessions.

## Features

- Anonymous chat with auto-generated Dark IDs
- Real-time messaging via WebSocket
- Text, emoji, images, files, and voice messages
- Read receipts and typing indicators
- Message recall and delete
- 2-hour auto-expiring sessions
- No data retention after session ends

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Socket.IO 4
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis 7
- **Storage**: MinIO (S3-compatible)
- **Container**: Docker Compose

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or pnpm

### Setup

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start all services:
   ```bash
   docker-compose up -d
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

6. Push schema to database:
   ```bash
   npm run db:push
   ```

7. Start development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Development

### Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run db:generate # Generate Prisma client
npm run db:push    # Push schema to database
npm run db:migrate # Run migrations
npm run db:studio # Open Prisma Studio
npm run db:seed   # Seed database with test data
```

### Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── api/          # REST API routes
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Home page
├── components/       # React components
│   ├── Chat/         # Chat UI components
│   └── Invite/       # Invitation components
├── hooks/            # Custom React hooks
├── lib/              # Utilities and clients
│   ├── prisma.ts     # Prisma client
│   ├── redis.ts      # Redis client
│   ├── storage.ts    # MinIO client
│   └── validators/   # Input validation
├── services/         # Business logic
│   ├── session.service.ts
│   ├── room.service.ts
│   ├── message.service.ts
│   └── invite.service.ts
├── socket/           # Socket.IO handlers
│   ├── handlers/     # Event handlers
│   ├── auth.middleware.ts
│   └── events.ts     # Event definitions
└── types/            # TypeScript types
```

## Architecture

### Session Flow

1. User visits site → Server creates session
2. Session includes random token + Dark ID
3. Stored in Redis (hot) + PostgreSQL (cold)
4. 2-hour TTL, auto-extends on activity
5. On expiry → all data deleted

### Connection Flow

1. User A enters User B's Dark ID
2. Server creates PENDING room
3. User B receives invitation popup
4. User B accepts → room becomes ACTIVE
5. Both users join room, can chat

### Message Flow

1. Client sends via Socket.IO
2. Server validates + persists to PostgreSQL
3. Server caches in Redis for fast retrieval
4. Broadcasts to room via Socket.IO
5. Recipient receives in real-time

## Security

- HttpOnly, Secure, SameSite cookies
- SHA-256 hashed IPs
- High-entropy Dark IDs (1 trillion combinations)
- Rate limiting on all endpoints
- File type/size validation
- Input sanitization

## License

MIT
