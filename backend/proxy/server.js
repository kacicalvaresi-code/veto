/**
 * Veto Backend Proxy Server
 *
 * Production-ready Node.js/Express server that:
 *  1. Fetches the FTC Do-Not-Call reported-calls CSV weekly and merges it with
 *     community-reported numbers to build a master spam list.
 *  2. Exports a pre-sorted binary flat-file (.bin) that the iOS app can pull
 *     and hand straight to the CallDirectoryHandler extension.
 *  3. Accepts anonymous community spam reports from the app.
 *  4. Provides a real-time reputation check endpoint (falls back to local DB
 *     when the upstream API key is not configured).
 *
 * No user-identifying data is ever stored or logged.
 */

'use strict';

const express      = require('express');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const cron         = require('node-cron');
const path         = require('path');
const fs           = require('fs');
require('dotenv').config();

const app  = express();
const port = process.env.PORT || 3000;

// ─── Routes ──────────────────────────────────────────────────────────────────
const proxyRoutes = require('./routes');

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:8081'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (native mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs : parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max      : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message  : 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const spamDbPath = path.join(__dirname, 'data', 'spam_list.bin');
  const dbExists   = fs.existsSync(spamDbPath);
  const dbStats    = dbExists ? fs.statSync(spamDbPath) : null;

  res.json({
    status      : 'healthy',
    timestamp   : new Date().toISOString(),
    environment : process.env.NODE_ENV || 'development',
    spamDatabase: {
      ready      : dbExists,
      sizeBytes  : dbStats ? dbStats.size : 0,
      entryCount : dbStats ? Math.floor(dbStats.size / 8) : 0,
      lastUpdated: dbStats ? dbStats.mtime.toISOString() : null,
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', proxyRoutes);

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name     : 'Veto Proxy Server',
    version  : '2.0.0',
    status   : 'running',
    endpoints: {
      health    : 'GET  /health',
      spamList  : 'GET  /api/spam-list/latest.bin',
      spamMeta  : 'GET  /api/spam-list/meta',
      reputation: 'GET  /api/reputation/:phoneNumber',
      report    : 'POST /api/report',
    },
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error  : 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ─── Weekly Spam DB Refresh (cron) ────────────────────────────────────────────
// Runs every Sunday at 02:00 server time.
// The spamBuilder module fetches the FTC DNC CSV, normalises numbers, merges
// community reports, and writes a fresh sorted binary file.
const { buildSpamDatabase } = require('./spamBuilder');

cron.schedule('0 2 * * 0', async () => {
  console.log('[Cron] Starting weekly spam database refresh…');
  try {
    const count = await buildSpamDatabase();
    console.log(`[Cron] Spam database refreshed: ${count.toLocaleString()} numbers`);
  } catch (err) {
    console.error('[Cron] Spam database refresh failed:', err.message);
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Veto Proxy Server v2.0.0 running on port ${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ')}`);

  // Build the spam database on first boot if it doesn't exist yet
  const spamDbPath = path.join(__dirname, 'data', 'spam_list.bin');
  if (!fs.existsSync(spamDbPath)) {
    console.log('[Boot] No spam database found — building initial database…');
    try {
      const count = await buildSpamDatabase();
      console.log(`[Boot] Initial spam database built: ${count.toLocaleString()} numbers`);
    } catch (err) {
      console.error('[Boot] Initial spam database build failed:', err.message);
      console.error('[Boot] Server will continue; retry on next cron run (Sunday 02:00)');
    }
  } else {
    const stats = fs.statSync(spamDbPath);
    console.log(`[Boot] Spam database ready: ${Math.floor(stats.size / 8).toLocaleString()} numbers`);
  }
});
