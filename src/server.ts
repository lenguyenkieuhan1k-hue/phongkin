import { createServer, IncomingMessage, ServerResponse } from 'http';
import next from 'next';
import { URL } from 'url';
import { initSocketIO } from './socket';
import { startRoomLifecycleLoop } from './services/room-lifecycle.service';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const cspHeader = dev
  ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://qr.sepay.vn; media-src 'self' data: blob:; connect-src 'self' ws: wss: https://qr.sepay.vn https://*.onrender.com https://phongkin.pro; frame-src 'none'; object-src 'none'"
  : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://qr.sepay.vn; media-src 'self' data: blob:; connect-src 'self' ws: wss: https://qr.sepay.vn https://*.onrender.com https://phongkin.pro; frame-src 'none'; object-src 'none'";

const hstsHeader = dev
  ? ''
  : 'max-age=31536000; includeSubDomains; preload';

app.prepare().then(async () => {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const reqUrl = req.url || '/';
    const parsedUrl = new URL(reqUrl, `http://${req.headers.host || 'localhost:3000'}`);
    const query: Record<string, string | string[]> = {};
    parsedUrl.searchParams.forEach((value, key) => {
      query[key] = value;
    });
    handle(req, res, { url: reqUrl, query, pathname: parsedUrl.pathname } as any);
  });

  // Apply security headers to all responses
  server.on('request', (req: IncomingMessage, res: ServerResponse) => {
    // Set security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.setHeader('Content-Security-Policy', cspHeader);
    if (hstsHeader) {
      res.setHeader('Strict-Transport-Security', hstsHeader);
    }
  });

  await initSocketIO(server);

  // Khởi động cleanup loops (expire room, expire payment, purge cũ)
  const stopLifecycle = startRoomLifecycleLoop();

  server.listen(port, () => {
    console.log(`> Phòng Kín ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO ready`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n> Received ${signal}, shutting down gracefully...`);
    stopLifecycle();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
});
