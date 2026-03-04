/**
 * Veto API Routes
 *
 * GET  /api/spam-list/latest.bin  — Download the pre-sorted binary spam list
 * GET  /api/spam-list/meta        — Metadata about the current spam list
 * GET  /api/reputation/:phone     — Real-time reputation check (optional upstream)
 * POST /api/report                — Anonymous community spam report
 */

'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const { addCommunityReport } = require('./spamBuilder');

const DATA_DIR       = path.join(__dirname, 'data');
const SPAM_BIN_PATH  = path.join(DATA_DIR, 'spam_list.bin');
const SPAM_META_PATH = path.join(DATA_DIR, 'spam_meta.json');

// ─── GET /api/spam-list/latest.bin ────────────────────────────────────────────
/**
 * Returns the pre-sorted binary spam list file.
 * The iOS app downloads this weekly and imports it via importBlocklist().
 *
 * The ETag header is the file's last-modified timestamp so the app can
 * perform a conditional GET and skip the download when nothing has changed.
 */
router.get('/spam-list/latest.bin', (req, res) => {
  if (!fs.existsSync(SPAM_BIN_PATH)) {
    return res.status(503).json({
      error  : 'Spam database not ready',
      message: 'The spam database is being built. Please try again in a few minutes.',
    });
  }

  const stats = fs.statSync(SPAM_BIN_PATH);
  const etag  = `"${stats.mtime.getTime()}"`;

  // Conditional GET support — skip transfer if client already has latest
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.set({
    'Content-Type'        : 'application/octet-stream',
    'Content-Disposition' : 'attachment; filename="veto_spam_list.bin"',
    'Content-Length'      : stats.size,
    'ETag'                : etag,
    'Cache-Control'       : 'public, max-age=86400', // 24 h client cache
    'X-Entry-Count'       : Math.floor(stats.size / 8),
  });

  fs.createReadStream(SPAM_BIN_PATH).pipe(res);
});

// ─── GET /api/spam-list/meta ──────────────────────────────────────────────────
/**
 * Returns metadata about the current spam list (entry count, build time, etc.)
 * The app calls this first to decide whether to download a fresh list.
 */
router.get('/spam-list/meta', (req, res) => {
  if (!fs.existsSync(SPAM_META_PATH)) {
    return res.status(503).json({
      error  : 'Spam database not ready',
      message: 'The spam database is being built.',
    });
  }

  try {
    const meta = JSON.parse(fs.readFileSync(SPAM_META_PATH, 'utf8'));
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read metadata' });
  }
});

// ─── GET /api/reputation/:phoneNumber ─────────────────────────────────────────
/**
 * Real-time reputation check for a single phone number.
 *
 * If CALL_CONTROL_API_KEY is set in .env, the request is forwarded to the
 * Call Control API (server-side — the key is never exposed to the client).
 * Otherwise, a local binary search against the spam list is performed.
 *
 * Privacy guarantee: no user-identifying information is ever forwarded.
 */
router.get('/reputation/:phoneNumber', async (req, res) => {
  const { phoneNumber } = req.params;
  const digits = phoneNumber.replace(/\D/g, '');

  if (!digits || digits.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  // ── Option A: upstream Call Control API ──────────────────────────────────
  if (process.env.CALL_CONTROL_API_KEY) {
    try {
      const axios    = require('axios');
      const response = await axios.get(
        `https://www.callcontrol.com/api/2014-11-01/Enterprise/Reputation/${digits}`,
        {
          headers : { 'ApiKey': process.env.CALL_CONTROL_API_KEY },
          timeout : 5000,
        }
      );
      return res.json({
        phoneNumber : digits,
        source      : 'callcontrol',
        score       : response.data.Score ?? null,
        tags        : response.data.Tags  ?? [],
        isSpam      : (response.data.Score ?? 0) > 50,
      });
    } catch (err) {
      console.warn(`[Reputation] Call Control API error: ${err.message} — falling back to local`);
    }
  }

  // ── Option B: local binary search ────────────────────────────────────────
  if (!fs.existsSync(SPAM_BIN_PATH)) {
    return res.json({ phoneNumber: digits, source: 'local', isSpam: false, score: 0 });
  }

  try {
    const target  = parseInt('1' + digits.slice(-10), 10);
    const buf     = fs.readFileSync(SPAM_BIN_PATH);
    const entries = buf.length / 8;
    let lo = 0, hi = entries - 1, found = false;

    while (lo <= hi) {
      const mid   = (lo + hi) >>> 1;
      const lo32  = buf.readUInt32LE(mid * 8);
      const hi32  = buf.readUInt32LE(mid * 8 + 4);
      const val   = hi32 * 0x100000000 + lo32;

      if (val === target)      { found = true; break; }
      else if (val < target)   { lo = mid + 1; }
      else                     { hi = mid - 1; }
    }

    res.json({
      phoneNumber : digits,
      source      : 'local',
      isSpam      : found,
      score       : found ? 100 : 0,
      tags        : found ? ['Spam'] : [],
    });
  } catch (err) {
    console.error('[Reputation] Local search error:', err.message);
    res.status(500).json({ error: 'Reputation check failed' });
  }
});

// ─── POST /api/report ─────────────────────────────────────────────────────────
/**
 * Accepts an anonymous community spam report.
 * The server records ONLY the phone number and label — never the reporter's
 * identity, IP address, or any other user-identifying information.
 */
router.post('/report', (req, res) => {
  const { phoneNumber, label } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'phoneNumber is required' });
  }

  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  try {
    addCommunityReport(digits, label || 'Spam');
    // Note: we intentionally do NOT log the request IP or any user context.
    console.log(`[Report] Anonymous report received for ${digits.slice(0, 3)}*******`);
    res.json({ success: true, message: 'Report submitted anonymously. Thank you.' });
  } catch (err) {
    console.error('[Report] Error saving report:', err.message);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

module.exports = router;
