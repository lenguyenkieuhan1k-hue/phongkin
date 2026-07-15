// PM2 process manager configuration for DarkTalk
// Run: pm2 start ecosystem.config.js
// Save: pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name: 'darktalk',
      script: 'node',
      args: 'server.js',  // Uses Next.js standalone output
      cwd: '/home/darktalk/app',
      instances: 1,        // t3.micro has 1 vCPU; Oracle free has more
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '400M',
      // Logging
      out_file: '/home/darktalk/logs/out.log',
      error_file: '/home/darktalk/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Auto-restart settings
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      // Watch
      watch: false,  // Set to false in prod (use CI/CD instead)
    },
  ],
};
