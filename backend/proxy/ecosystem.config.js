/**
 * PM2 Ecosystem Configuration — Veto Backend Proxy
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 reload ecosystem.config.js   # zero-downtime reload
 *   pm2 stop veto-api
 *   pm2 delete veto-api
 */

module.exports = {
  apps: [
    {
      // ── Identity ────────────────────────────────────────────────────────────
      name        : 'veto-api',
      script      : 'server.js',
      cwd         : '/opt/veto/backend/proxy',

      // ── Runtime ─────────────────────────────────────────────────────────────
      // Use cluster mode to take advantage of both vCPUs on the Spaceship VPS.
      // 'max' automatically spawns one worker per CPU core.
      instances   : 'max',
      exec_mode   : 'cluster',

      // ── Environment ─────────────────────────────────────────────────────────
      // Production values are read from /opt/veto/backend/proxy/.env
      // Do NOT hard-code secrets here; use the .env file instead.
      env_production: {
        NODE_ENV: 'production',
      },

      // ── Reliability ─────────────────────────────────────────────────────────
      // Restart the process if it crashes, but stop after 10 rapid restarts
      // to avoid an infinite crash loop consuming server resources.
      autorestart       : true,
      max_restarts      : 10,
      min_uptime        : '10s',
      restart_delay     : 4000,

      // ── Memory guard ────────────────────────────────────────────────────────
      // Restart a worker if it exceeds 512 MB (well above normal usage).
      max_memory_restart: '512M',

      // ── Logging ─────────────────────────────────────────────────────────────
      out_file        : '/var/log/veto/api-out.log',
      error_file      : '/var/log/veto/api-error.log',
      merge_logs      : true,
      log_date_format : 'YYYY-MM-DD HH:mm:ss Z',

      // ── Watch (disabled in production) ──────────────────────────────────────
      watch           : false,
    },
  ],
};
