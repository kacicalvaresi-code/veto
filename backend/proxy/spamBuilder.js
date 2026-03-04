/**
 * spamBuilder.js
 *
 * Builds and maintains the Veto spam number database.
 *
 * Data sources (in priority order):
 *  1. FTC Do-Not-Call Reported Calls CSV  — public domain, updated weekdays
 *     https://www.ftc.gov/policy-notices/open-government/data-sets/do-not-call-data
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
const { parse } = require('csv-parse/sync');

const DATA_DIR          = path.join(__dirname, 'data');
const SPAM_BIN_PATH     = path.join(DATA_DIR, 'spam_list.bin');
const SPAM_META_PATH    = path.join(DATA_DIR, 'spam_meta.json');
const COMMUNITY_PATH    = path.join(DATA_DIR, 'community_reports.json');

// FTC publishes weekly CSV files.  The "last 30 days" aggregate is the most
// useful signal because it captures the freshest reported numbers.
const FTC_CSV_URL =
  'https://www.ftc.gov/system/files/ftc_gov/csv/do-not-call-dnc-reported-calls-data.csv';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Ensure the data directory exists */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Downloads a URL to a local file path.
 * Follows up to 5 redirects.
 */
function downloadFile(url, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));

    const protocol = url.startsWith('https') ? https : http;
    const file     = fs.createWriteStream(destPath);

    protocol.get(url, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(destPath, () => {});
        return downloadFile(res.headers.location, destPath, redirectCount + 1)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
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

// ─── FTC CSV Fetch ────────────────────────────────────────────────────────────

async function fetchFtcNumbers() {
  ensureDataDir();
  const tmpPath = path.join(DATA_DIR, 'ftc_dnc_tmp.csv');

  console.log('[spamBuilder] Downloading FTC DNC CSV…');
  try {
    await downloadFile(FTC_CSV_URL, tmpPath);
  } catch (err) {
    console.warn(`[spamBuilder] FTC download failed: ${err.message}`);
    // Return empty set — community reports will still be used
    return new Set();
  }

  const raw     = fs.readFileSync(tmpPath, 'utf8');
  const records = parse(raw, {
    columns         : true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const numbers = new Set();
  for (const row of records) {
    // The FTC CSV column is named "Company Phone Number" or similar
    const raw = row['Company Phone Number'] || row['company_phone_number'] || row['Phone Number'] || '';
    const normalised = normalisePhone(raw);
    if (normalised) numbers.add(normalised);
  }

  // Clean up temp file
  try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }

  console.log(`[spamBuilder] FTC CSV parsed: ${numbers.size.toLocaleString()} unique numbers`);
  return numbers;
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
