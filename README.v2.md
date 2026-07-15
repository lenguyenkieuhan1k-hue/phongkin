# DarkTalk

> Anonymous, ephemeral 1-to-1 chat. All data auto-purges after 2 hours.
> Built for privacy. Deploy free forever on Oracle Cloud Always Free.

## ✨ Features

- 🔒 Anonymous: get a Dark ID, no email/phone required
- 💬 Real-time messaging via Socket.IO
- 📎 File/image/video sharing (25MB / 200MB / 30MB limits)
- ⏱️ Anti-forensic: ALL data (messages, files, sessions) auto-purges after 2h
- 🌐 Web app (PWA-ready), no install needed
- 🚀 **$0/month cost** on Oracle Cloud Always Free

## 🏗️ Architecture

```
Browser
  │
  ├── DNS (DuckDNS, free subdomain)
  ▼
Oracle Cloud Always Free VM (4 vCPU / 24GB ARM / 200GB disk)
  ├── Nginx reverse proxy + SSL (Let's Encrypt)
  ├── Next.js 14 + Socket.IO
  ├── PostgreSQL 16 (local)
  └── Redis 7 (local, for Socket.IO adapter + rate limit)
  │
  │ File upload/download (HTTPS)
  ▼
Cloudflare R2 (10GB storage, free forever, zero egress)
```

## 💻 Tech Stack

- **Frontend**: Next.js 14 App Router, React 18, TailwindCSS
- **Backend**: Custom Node.js server, Socket.IO, Prisma ORM
- **Database**: PostgreSQL 16
- **Cache**: Redis 7 (Socket.IO adapter, rate limit)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Deployment**: PM2 + Nginx + Let's Encrypt

## 📦 Local Development

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- (optional) Cloudflare R2 account

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres + Redis (Docker)
docker-compose -f docker-compose.dev.yml up -d

# 3. Configure env
cp .env.example .env
# Edit .env: DATABASE_URL, REDIS_URL, R2_* keys

# 4. Generate Prisma client + run migrations
npx prisma generate
npx prisma migrate dev

# 5. Run dev server
npm run dev
# Server: http://localhost:3000
# Health: http://localhost:3000/api/health
```

### Test without R2 (local-only)

If you don't have R2 credentials yet, leave the `R2_*` vars empty in `.env`. The app will fail when you try to upload files, but chat/messages work fine.

## 🚀 Production Deployment (Oracle Cloud Free Tier)

**Total cost**: $0/month forever (with credit card for verification)

### One-time setup:

1. **Oracle Cloud Free Tier account**
   - https://cloud.oracle.com/free
   - Always Free: 4 ARM Ampere vCPU, 24GB RAM, 200GB storage
   - Verify with credit card (not charged)

2. **Create Ubuntu 24.04 VM**
   - Shape: `VM.Standard.A1.Flex` (4 OCPU / 24 GB)
   - VCN: default, public subnet
   - Download SSH key

3. **SSH + run setup script**
   ```bash
   ssh ubuntu@<your_vm_ip>
   wget https://raw.githubusercontent.com/YOUR_USER/darktalk/main/deploy/oracle-setup.sh
   bash oracle-setup.sh
   ```

4. **Configure secrets** (do this manually for security)
   - PostgreSQL password
   - Redis password
   - R2 API keys
   - DuckDNS token

5. **Clone repo + activate migration**
   ```bash
   cd /home/darktalk/app
   git clone https://github.com/YOUR_USER/darktalk.git .
   bash deploy/activate-migration.sh
   ```

6. **Nginx + SSL**
   ```bash
   sudo cp deploy/nginx-darktalk.conf /etc/nginx/sites-available/darktalk
   sudo ln -sf /etc/nginx/sites-available/darktalk /etc/nginx/sites-enabled/darktalk
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d yourname.duckdns.org
   ```

7. **Verify**
   - Open `https://yourname.duckdns.org`
   - Should see the chat UI
   - Test create session + chat

### DuckDNS (free dynamic DNS)

```bash
# Update IP every 5 minutes (cron)
*/5 * * * * curl "https://www.duckdns.org/update?domains=YOURNAME&token=YOUR_TOKEN&ip=" > /dev/null
```

## 🔄 Updating Code

```bash
cd /home/darktalk/app
git pull origin main
npm ci --omit=dev
npx prisma migrate deploy
npm run build
pm2 restart darktalk
```

## 🧪 Testing

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Seed test data (optional)
npm run db:seed
```

Test users get created with Dark IDs:
- DT-TEST-M001 (token: test-token-1)
- DT-TEST-M002 (token: test-token-2)

## 📊 Cost Breakdown

| Service | Free Tier | Limit |
|---------|-----------|-------|
| Oracle Cloud ARM A1 | **Always Free** | 4 OCPU / 24GB RAM / 200GB disk / 10TB egress/mo |
| Cloudflare R2 | **Always Free** | 10GB storage / 1M Class A / 10M Class B writes/mo |
| Cloudflare DNS | Free | unlimited |
| Let's Encrypt SSL | Free | unlimited |
| DuckDNS | Free | unlimited subdomains |
| **Total** | **$0/month** | - |

## 🛡️ Privacy & Anti-Forensic Design

- **No accounts**: temporary session only
- **2-hour TTL**: everything purges automatically (cron runs every 10 min)
- **No logs of messages on disk**: data lives only in DB for 2h
- **No IP logging in messages**: only hashed for rate limiting
- **File uploads**: stored in R2 with same TTL (objects deleted by cron)

## 🤝 Contributing

Pull requests welcome. Please open an issue first for major changes.

## 📝 License

MIT
