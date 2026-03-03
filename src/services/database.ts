import * as SQLite from 'expo-sqlite';
import { Platform, NativeModules } from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';

const APP_GROUP = 'group.com.kacicalvaresi.veto';

// Native module for writing binary blocklist files to App Group container.
// Provides O(log n) binary search capability for the Call Directory Extension.
const { VetoSyncModule } = NativeModules;

// Lazy DB singleton — opened on first use, not at module load time.
// This prevents a crash when the native SQLite module isn't ready yet.
let _db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
    if (!_db) {
        _db = SQLite.openDatabaseSync('veto.db');
    }
    return _db;
}

export interface BlockedNumber {
    id: number;
    phoneNumber: string;
    label?: string;
    createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Binary Sync (primary path)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exports the entire blocklist as a sorted binary flat-file to the App Group
 * container via the VetoSyncModule native bridge.
 *
 * File format: sorted array of Int64 (little-endian, 8 bytes each)
 * The CallDirectoryHandler extension performs O(log n) binary search on this
 * file, staying well within the iOS extension 6-10 MB memory limit.
 *
 * Also writes a compact JSON labels file for caller-ID identification entries.
 */
export const syncBlocklistToExtension = async (): Promise<void> => {
    if (Platform.OS !== 'ios') return;

    try {
        const db = getDb();
        const rows = db.getAllSync(
            'SELECT phoneNumber, label FROM blocklist ORDER BY CAST(phoneNumber AS INTEGER) ASC'
        ) as { phoneNumber: string; label: string | null }[];

        if (rows.length === 0) {
            // Write empty files so the extension sees a clean state
            if (VetoSyncModule?.writeBinaryBlocklist) {
                await VetoSyncModule.writeBinaryBlocklist('', '[]');
            }
            return;
        }

        // Build sorted Int64 binary buffer
        // Each phone number is stored as a signed 64-bit integer (little-endian)
        const buffer = new ArrayBuffer(rows.length * 8);
        const view = new DataView(buffer);

        rows.forEach((row, i) => {
            const num = parseInt(row.phoneNumber, 10);
            if (!isNaN(num) && num > 0) {
                // Write as two 32-bit halves (DataView doesn't support Int64 natively)
                // Numbers fit in 53-bit safe integer range for all E.164 numbers
                const lo = num >>> 0;                      // lower 32 bits
                const hi = Math.floor(num / 0x100000000); // upper bits
                view.setUint32(i * 8, lo, true);           // little-endian
                view.setUint32(i * 8 + 4, hi, true);
            }
        });

        // Convert to Base64 for transfer over the React Native bridge
        const uint8 = new Uint8Array(buffer);
        let binary = '';
        uint8.forEach(byte => { binary += String.fromCharCode(byte); });
        const base64Data = btoa(binary);

        // Build compact labels JSON
        const labelsArray = rows
            .filter(r => r.label && r.label.trim().length > 0)
            .map(r => ({ p: r.phoneNumber, l: r.label!.trim() }));
        const labelsJson = JSON.stringify(labelsArray);

        // Write via native module
        if (VetoSyncModule?.writeBinaryBlocklist) {
            const entryCount = await VetoSyncModule.writeBinaryBlocklist(base64Data, labelsJson);
            console.log(`[Sync] Binary blocklist written: ${entryCount} entries`);
        } else {
            // Fallback: legacy UserDefaults sync (pre-VetoSyncModule builds)
            console.warn('[Sync] VetoSyncModule not available, falling back to UserDefaults');
            await syncToExtensionLegacy(rows);
        }
    } catch (error) {
        console.error('[Sync] Error syncing blocklist to extension:', error);
        // Don't throw — database operations must succeed even if sync fails
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Legacy Sync (UserDefaults fallback)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Legacy sync path using SharedGroupPreferences / UserDefaults.
 * Used as fallback when VetoSyncModule is not available (older builds).
 */
const syncToExtensionLegacy = async (
    rows: { phoneNumber: string; label: string | null }[]
): Promise<void> => {
    try {
        const phoneNumbers = rows.map(r => r.phoneNumber);
        await SharedGroupPreferences.setItem('veto_list', phoneNumbers, APP_GROUP);

        const fullData = rows.map(r => ({
            phoneNumber: r.phoneNumber,
            label: r.label || 'Spam',
        }));
        await SharedGroupPreferences.setItem('veto_list_full', fullData, APP_GROUP);
        console.log(`[Sync] Legacy UserDefaults sync: ${phoneNumbers.length} numbers`);
    } catch (error) {
        console.error('[Sync] Legacy sync error:', error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Database Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initializes the database and creates the blocklist table.
 * Triggers an initial sync to the extension on startup.
 */
export const initDatabase = () => {
    try {
        const db = getDb();
        db.execSync(`
            CREATE TABLE IF NOT EXISTS blocklist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phoneNumber TEXT NOT NULL UNIQUE,
                label TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Database initialized successfully');
        // Sync existing data to extension on app launch
        syncBlocklistToExtension();
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

/**
 * Adds a phone number to the blocklist.
 * @param phoneNumber - Phone number in E.164 format (digits only, no + sign)
 * @param label - Optional label for the number (e.g. "Spam", "Robocall")
 * @returns true if successful, false otherwise
 */
export const addBlockedNumber = (phoneNumber: string, label?: string): boolean => {
    try {
        const db = getDb();
        db.runSync(
            'INSERT INTO blocklist (phoneNumber, label) VALUES (?, ?)',
            [phoneNumber, label || null]
        );
        // Sync binary blocklist to extension
        syncBlocklistToExtension();
        console.log(`Added ${phoneNumber} to blocklist`);
        return true;
    } catch (error: any) {
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            console.log(`Number ${phoneNumber} already in blocklist`);
        } else {
            console.error('Error adding blocked number:', error);
        }
        return false;
    }
};

/**
 * Removes a phone number from the blocklist.
 * @param id - Database ID of the blocked number
 * @returns true if successful, false otherwise
 */
export const removeBlockedNumber = (id: number): boolean => {
    try {
        const db = getDb();
        db.runSync('DELETE FROM blocklist WHERE id = ?', [id]);
        // Sync binary blocklist to extension
        syncBlocklistToExtension();
        console.log(`Removed number with ID ${id} from blocklist`);
        return true;
    } catch (error) {
        console.error('Error removing blocked number:', error);
        return false;
    }
};

/**
 * Gets all blocked numbers from the database.
 * @returns Array of blocked numbers ordered by most recently added
 */
export const getBlocklist = (): BlockedNumber[] => {
    try {
        const db = getDb();
        const result = db.getAllSync('SELECT * FROM blocklist ORDER BY createdAt DESC');
        return result as BlockedNumber[];
    } catch (error) {
        console.error('Error fetching blocklist:', error);
        return [];
    }
};

/**
 * Checks if a phone number is in the blocklist.
 * @param phoneNumber - Phone number to check
 * @returns true if blocked, false otherwise
 */
export const isNumberBlocked = (phoneNumber: string): boolean => {
    try {
        const db = getDb();
        const result = db.getFirstSync(
            'SELECT COUNT(*) as count FROM blocklist WHERE phoneNumber = ?',
            [phoneNumber]
        ) as { count: number };
        return result.count > 0;
    } catch (error) {
        console.error('Error checking if number is blocked:', error);
        return false;
    }
};

/**
 * Gets the count of blocked numbers.
 * @returns Number of blocked numbers in the blocklist
 */
export const getBlockedCount = (): number => {
    try {
        const db = getDb();
        const result = db.getFirstSync(
            'SELECT COUNT(*) as count FROM blocklist'
        ) as { count: number };
        return result.count;
    } catch (error) {
        console.error('Error getting blocked count:', error);
        return 0;
    }
};

/**
 * Clears all blocked numbers from the database.
 * WARNING: This is irreversible.
 * @returns true if successful, false otherwise
 */
export const clearBlocklist = (): boolean => {
    try {
        const db = getDb();
        db.runSync('DELETE FROM blocklist');
        // Sync empty state to extension
        syncBlocklistToExtension();
        console.log('Cleared all blocked numbers');
        return true;
    } catch (error) {
        console.error('Error clearing blocklist:', error);
        return false;
    }
};

/**
 * Bulk-imports an array of phone numbers into the blocklist.
 * Uses a transaction for performance. Duplicate numbers are silently skipped.
 * @param numbers - Array of {phoneNumber, label} objects
 * @returns Number of successfully imported entries
 */
export const importBlocklist = (
    numbers: { phoneNumber: string; label?: string }[]
): number => {
    let imported = 0;
    try {
        const db = getDb();
        db.execSync('BEGIN TRANSACTION');
        for (const { phoneNumber, label } of numbers) {
            try {
                db.runSync(
                    'INSERT OR IGNORE INTO blocklist (phoneNumber, label) VALUES (?, ?)',
                    [phoneNumber, label || null]
                );
                imported++;
            } catch {
                // Skip duplicates or invalid entries
            }
        }
        db.execSync('COMMIT');
        // Sync binary blocklist to extension after bulk import
        syncBlocklistToExtension();
        console.log(`Imported ${imported} numbers to blocklist`);
    } catch (error) {
        console.error('Error importing blocklist:', error);
        try { getDb().execSync('ROLLBACK'); } catch { /* ignore */ }
    }
    return imported;
};
