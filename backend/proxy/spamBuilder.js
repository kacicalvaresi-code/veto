/**
 * spamBuilder.js
 *
 * Builds and maintains the Veto spam number database.
 *
 * Data sources (in priority order):
 *  1. FTC Do-Not-Call Reported Calls API — public domain, updated weekdays
 *     https://www.ftc.gov/developer/api/v0/endpoints/do-not-call-dnc-reported-calls-data-api
 *     NOTE: The old bulk CSV download (do-not-call-dnc-reported-calls-data.csv)
 *     was removed by the FTC in 2024. The API is the official replacement.
 *     We page through the last 30 days of complaints using the JSON API.
 *  2. Community reports stored locally in community_reports.json
 *
 * Output:
 *  - data/spam_list.bin   — sorted Int64 little-endian binary file
 *  - data/spam_meta.json  — metadata (count, build time, source stats)
 *
 * The binary format is identical to what the iOS app's VetoSyncModule writes
 * for the CallDirectoryHandler, so the app can drop the downloaded file
 * directly into the App Group container.
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const http    = require('http');
const DATA_DIR          = path.join(__dirname, 'data');
const SPAM_BIN_PATH     = path.join(DATA_DIR, 'spam_list.bin');
const SPAM_META_PATH    = path.join(DATA_DIR, 'spam_meta.json');
const COMMUNITY_PATH    = path.join(DATA_DIR, 'community_reports.json');

// FTC DNC Complaints API — no API key required for basic access (DEMO_KEY works
// for up to 30 requests/hour).  Set FTC_API_KEY in .env for higher rate limits.
// Docs: https://www.ftc.gov/developer/api/v0/endpoints/do-not-call-dnc-reported-calls-data-api
const FTC_API_BASE   = 'https://api.ftc.gov/v0/dnc-complaints';
const FTC_API_KEY    = process.env.FTC_API_KEY || 'DEMO_KEY';
const FTC_PAGE_LIMIT = 500;   // max records per API call
const FTC_MAX_PAGES  = 200;   // cap at 100,000 records to avoid runaway fetches

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Ensure the data directory exists */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Normalises a raw phone number string to a 10-digit US number (digits only).
 * Returns null for invalid / non-US numbers.
 */
function normalisePhone(raw) {
  if (!raw) return null;
  // Strip all non-digit characters
  const digits = raw.replace(/\D/g, '');
  // Accept 10-digit US numbers or 11-digit with leading 1
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits[0] === '1') return digits.slice(1);
  return null;
}

/**
 * Converts a 10-digit string to the E.164 Int64 value used in the binary file.
 * Prepends country code 1 → "1XXXXXXXXXX" → parsed as a JS safe integer.
 */
function toE164Int(tenDigit) {
  return parseInt('1' + tenDigit, 10);
}

// ─── FTC API Fetch ───────────────────────────────────────────────────────────

/**
 * Fetches DNC complaint numbers from the FTC JSON API.
 * Pages through results until no more data or FTC_MAX_PAGES is reached.
 * Returns a Set of normalised 10-digit strings.
 */
async function fetchFtcNumbers() {
  ensureDataDir();
  const numbers = new Set();
  let page = 0;

  console.log('[spamBuilder] Fetching FTC DNC complaints via API…');

  while (page < FTC_MAX_PAGES) {
    const offset = page * FTC_PAGE_LIMIT;
    const url = `${FTC_API_BASE}?api_key=${FTC_API_KEY}&limit=${FTC_PAGE_LIMIT}&offset=${offset}`;

    let body;
    try {
      body = await fetchJson(url);
    } catch (err) {
      console.warn(`[spamBuilder] FTC API fetch failed at page ${page}: ${err.message}`);
      break;
    }

    const records = body && body.data ? body.data : [];
    if (records.length === 0) break;

    for (const record of records) {
      const raw = record.attributes && record.attributes['company-phone-number'];
      const normalised = normalisePhone(String(raw || ''));
      if (normalised) numbers.add(normalised);
    }

    page++;

    // Respect rate limits — small delay between pages
    await new Promise(r => setTimeout(r, 150));

    if (records.length < FTC_PAGE_LIMIT) break; // last page
  }

  console.log(`[spamBuilder] FTC API fetched: ${numbers.size.toLocaleString()} unique numbers (${page} pages)`);
  return numbers;
}

/**
 * Fetches a JSON URL and returns the parsed body.
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

// ─── Community Reports ────────────────────────────────────────────────────────

function loadCommunityReports() {
  if (!fs.existsSync(COMMUNITY_PATH)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(COMMUNITY_PATH, 'utf8'));
    const numbers = new Set();
    for (const entry of data) {
      const normalised = normalisePhone(entry.phoneNumber);
      if (normalised) numbers.add(normalised);
    }
    console.log(`[spamBuilder] Community reports loaded: ${numbers.size.toLocaleString()} numbers`);
    return numbers;
  } catch (err) {
    console.warn(`[spamBuilder] Failed to load community reports: ${err.message}`);
    return new Set();
  }
}

// ─── Binary Builder ───────────────────────────────────────────────────────────

/**
 * Merges all number sets, converts to sorted Int64 binary file.
 * Returns the total entry count.
 */
function writeBinaryFile(numberSets) {
  // Merge all sets into one deduplicated set of E.164 integers
  const allInts = new Set();
  for (const set of numberSets) {
    for (const num of set) {
      const intVal = toE164Int(num);
      if (!isNaN(intVal) && intVal > 0) allInts.add(intVal);
    }
  }

  // Sort ascending (required for binary search in the extension)
  const sorted = Array.from(allInts).sort((a, b) => a - b);

  // Write as little-endian Int64 pairs (JS safe integer range covers all E.164)
  const buffer = Buffer.allocUnsafe(sorted.length * 8);
  for (let i = 0; i < sorted.length; i++) {
    const val = sorted[i];
    const lo  = val >>> 0;
    const hi  = Math.floor(val / 0x100000000);
    buffer.writeUInt32LE(lo, i * 8);
    buffer.writeUInt32LE(hi, i * 8 + 4);
  }

  ensureDataDir();
  fs.writeFileSync(SPAM_BIN_PATH, buffer);
  console.log(`[spamBuilder] Binary file written: ${sorted.length.toLocaleString()} entries (${buffer.length} bytes)`);
  return sorted.length;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main entry point.  Fetches all data sources, merges them, and writes the
 * binary output file.  Returns the total number of entries written.
 */
async function buildSpamDatabase() {
  const [ftcNumbers, communityNumbers] = await Promise.all([
    fetchFtcNumbers(),
    Promise.resolve(loadCommunityReports()),
  ]);

  const totalCount = writeBinaryFile([ftcNumbers, communityNumbers]);

  // Write metadata
  const meta = {
    builtAt       : new Date().toISOString(),
    totalEntries  : totalCount,
    sources: {
      ftcDnc     : ftcNumbers.size,
      community  : communityNumbers.size,
    },
  };
  fs.writeFileSync(SPAM_META_PATH, JSON.stringify(meta, null, 2));

  return totalCount;
}

/**
 * Appends a single community-reported number to the community_reports.json
 * store.  Deduplication happens at build time.
 */
function addCommunityReport(phoneNumber, label) {
  ensureDataDir();
  let reports = [];
  if (fs.existsSync(COMMUNITY_PATH)) {
    try { reports = JSON.parse(fs.readFileSync(COMMUNITY_PATH, 'utf8')); } catch { /* ignore */ }
  }
  reports.push({
    phoneNumber,
    label      : label || 'Spam',
    reportedAt : new Date().toISOString(),
  });
  fs.writeFileSync(COMMUNITY_PATH, JSON.stringify(reports, null, 2));
}

module.exports = { buildSpamDatabase, addCommunityReport };
