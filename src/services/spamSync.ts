/**
 * spamSync.ts
 *
 * Manages the weekly "pull-only" download of the Veto spam database from the
 * backend proxy.  The downloaded binary file is imported directly into the
 * local SQLite database and then synced to the CallDirectoryHandler extension.
 *
 * Privacy guarantee: the request carries NO user-identifying headers.
 * The server returns a pre-built file — it never learns which numbers a
 * specific user has blocked or what calls they have received.
 *
 * Sync strategy:
 *  1. Check /api/spam-list/meta to get the server's current build timestamp.
 *  2. Compare against the locally stored timestamp (AsyncStorage).
 *  3. If the server has a newer list, download /api/spam-list/latest.bin.
 *  4. Parse the binary file into phone number strings.
 *  5. Bulk-import into SQLite via importBlocklist() (duplicates are skipped).
 *  6. syncBlocklistToExtension() is called automatically by importBlocklist().
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { importBlocklist } from './database';

// ─── Configuration ────────────────────────────────────────────────────────────

const PROXY_BASE_URL =
  process.env.EXPO_PUBLIC_PROXY_URL || 'https://api.vetospam.app';

const STORAGE_KEYS = {
  LAST_SYNC_TIMESTAMP : 'veto_spam_sync_timestamp',
  LAST_SYNC_COUNT     : 'veto_spam_sync_count',
  LAST_SYNC_ERROR     : 'veto_spam_sync_error',
};

// Minimum interval between syncs (7 days in ms)
const MIN_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpamSyncMeta {
  builtAt     : string;
  totalEntries: number;
  sources     : { ftcDnc: number; community: number };
}

export interface SpamSyncResult {
  skipped    : boolean;   // true if the local list was already up-to-date
  imported   : number;    // number of new entries added to local DB
  totalServer: number;    // total entries in the server list
  timestamp  : string;    // ISO timestamp of the server list
  error?     : string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses a binary buffer (sorted Int64 little-endian) into an array of
 * E.164 phone number strings (digits only, no + sign).
 */
function parseBinarySpamList(buffer: ArrayBuffer): string[] {
  const view    = new DataView(buffer);
  const count   = buffer.byteLength / 8;
  const numbers : string[] = [];

  for (let i = 0; i < count; i++) {
    const lo  = view.getUint32(i * 8,     true); // little-endian
    const hi  = view.getUint32(i * 8 + 4, true);
    const val = hi * 0x100000000 + lo;
    if (val > 0) {
      // Convert integer back to digit string (strip leading country code 1)
      const str = val.toString();
      numbers.push(str.startsWith('1') ? str.slice(1) : str);
    }
  }

  return numbers;
}

/**
 * Fetches JSON from the proxy with a timeout.
 */
async function fetchJson<T>(url: string, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal : controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches binary data from the proxy with ETag conditional-GET support.
 * Returns null if the server responds 304 Not Modified.
 */
async function fetchBinary(
  url     : string,
  etag?   : string,
  timeoutMs = 60_000
): Promise<{ buffer: ArrayBuffer; etag: string } | null> {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {};
  if (etag) headers['If-None-Match'] = etag;

  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    if (res.status === 304) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer    = await res.arrayBuffer();
    const newEtag   = res.headers.get('ETag') || '';
    return { buffer, etag: newEtag };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Checks whether a sync is due based on the last sync timestamp.
 * Returns true if no sync has occurred or if MIN_SYNC_INTERVAL_MS has elapsed.
 */
export async function isSyncDue(): Promise<boolean> {
  try {
    const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP);
    if (!lastSync) return true;
    const elapsed = Date.now() - new Date(lastSync).getTime();
    return elapsed >= MIN_SYNC_INTERVAL_MS;
  } catch {
    return true;
  }
}

/**
 * Returns the last sync result metadata stored in AsyncStorage.
 */
export async function getLastSyncInfo(): Promise<{
  timestamp : string | null;
  count     : number;
  error     : string | null;
}> {
  const [timestamp, countStr, error] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP),
    AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_COUNT),
    AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_ERROR),
  ]);
  return {
    timestamp,
    count: countStr ? parseInt(countStr, 10) : 0,
    error,
  };
}

/**
 * Main sync function.  Downloads the latest spam list from the backend and
 * imports it into the local database.
 *
 * @param force  — Set to true to bypass the 7-day interval check.
 */
export async function syncSpamDatabase(force = false): Promise<SpamSyncResult> {
  try {
    // ── 1. Check if sync is due ──────────────────────────────────────────────
    if (!force && !(await isSyncDue())) {
      return { skipped: true, imported: 0, totalServer: 0, timestamp: '' };
    }

    // ── 2. Fetch metadata ────────────────────────────────────────────────────
    const meta = await fetchJson<SpamSyncMeta>(
      `${PROXY_BASE_URL}/api/spam-list/meta`
    );

    // ── 3. Download binary list ──────────────────────────────────────────────
    const result = await fetchBinary(`${PROXY_BASE_URL}/api/spam-list/latest.bin`);

    if (!result) {
      // 304 Not Modified — nothing to do
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC_TIMESTAMP,
        new Date().toISOString()
      );
      return {
        skipped    : true,
        imported   : 0,
        totalServer: meta.totalEntries,
        timestamp  : meta.builtAt,
      };
    }

    // ── 4. Parse binary file ─────────────────────────────────────────────────
    const phoneNumbers = parseBinarySpamList(result.buffer);
    console.log(`[SpamSync] Downloaded ${phoneNumbers.length.toLocaleString()} numbers`);

    // ── 5. Bulk-import into SQLite (importBlocklist calls syncBlocklistToExtension) ──
    const entries = phoneNumbers.map(p => ({ phoneNumber: p, label: 'Spam' }));
    const imported = importBlocklist(entries);

    // ── 6. Persist sync metadata ─────────────────────────────────────────────
    const now = new Date().toISOString();
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP, now),
      AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_COUNT, imported.toString()),
      AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC_ERROR),
    ]);

    console.log(`[SpamSync] Sync complete: ${imported.toLocaleString()} new entries imported`);
    return {
      skipped    : false,
      imported,
      totalServer: meta.totalEntries,
      timestamp  : meta.builtAt,
    };

  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    console.error('[SpamSync] Sync failed:', message);
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_ERROR, message);
    return {
      skipped    : false,
      imported   : 0,
      totalServer: 0,
      timestamp  : '',
      error      : message,
    };
  }
}
