import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import SharedPreferences from 'react-native-shared-preferences';

const APP_GROUP = 'group.com.kacicalvaresi.veto';
const ANDROID_PREFS_NAME = 'VetoBlocklist';

const db = SQLite.openDatabaseSync('veto.db');

export interface BlockedNumber {
    id: number;
    phoneNumber: string;
    label?: string;
    createdAt: string;
}

/**
 * Syncs the blocklist to the native extensions
 * iOS: Uses App Groups to share with Call Directory Extension
 * Android: Uses SharedPreferences to share with CallScreeningService
 */
const syncToExtension = async () => {
    try {
        const result = db.getAllSync('SELECT phoneNumber, label FROM blocklist');
        const phoneNumbers = (result as any[]).map(r => r.phoneNumber);

        if (Platform.OS === 'ios') {
            // iOS: Sync to App Group for Call Directory Extension
            // Store as array of phone numbers for blocking
            await SharedGroupPreferences.setItem('veto_list', phoneNumbers, APP_GROUP);
            
            // Also store full data with labels for identification
            const fullData = (result as any[]).map(r => ({
                phoneNumber: r.phoneNumber,
                label: r.label || 'Spam'
            }));
            await SharedGroupPreferences.setItem('veto_list_full', fullData, APP_GROUP);
            
            console.log(`[iOS] Synced ${phoneNumbers.length} numbers to App Group`);
        } else if (Platform.OS === 'android') {
            // Android: Sync to SharedPreferences for CallScreeningService
            await SharedPreferences.setItem(
                'blocklist',
                JSON.stringify(phoneNumbers),
                ANDROID_PREFS_NAME
            );
            
            console.log(`[Android] Synced ${phoneNumbers.length} numbers to SharedPreferences`);
        }
    } catch (error) {
        console.error('Error syncing to extension:', error);
        // Don't throw - we want the database operation to succeed even if sync fails
    }
};

/**
 * Initializes the database and creates the blocklist table
 */
export const initDatabase = () => {
    try {
        db.execSync(`
            CREATE TABLE IF NOT EXISTS blocklist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phoneNumber TEXT NOT NULL UNIQUE,
                label TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log('Database initialized successfully');
        
        // Sync existing data to extensions on init
        syncToExtension();
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

/**
 * Adds a phone number to the blocklist
 * @param phoneNumber - Phone number in E.164 format (without + sign)
 * @param label - Optional label for the number
 * @returns true if successful, false otherwise
 */
export const addBlockedNumber = (phoneNumber: string, label?: string): boolean => {
    try {
        db.runSync(
            'INSERT INTO blocklist (phoneNumber, label) VALUES (?, ?)',
            [phoneNumber, label || null]
        );
        
        // Sync to native extensions
        syncToExtension();
        
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
 * Removes a phone number from the blocklist
 * @param id - Database ID of the blocked number
 * @returns true if successful, false otherwise
 */
export const removeBlockedNumber = (id: number): boolean => {
    try {
        db.runSync('DELETE FROM blocklist WHERE id = ?', [id]);
        
        // Sync to native extensions
        syncToExtension();
        
        console.log(`Removed number with ID ${id} from blocklist`);
        return true;
    } catch (error) {
        console.error('Error removing blocked number:', error);
        return false;
    }
};

/**
 * Gets all blocked numbers from the database
 * @returns Array of blocked numbers
 */
export const getBlocklist = (): BlockedNumber[] => {
    try {
        const result = db.getAllSync('SELECT * FROM blocklist ORDER BY createdAt DESC');
        return result as BlockedNumber[];
    } catch (error) {
        console.error('Error fetching blocklist:', error);
        return [];
    }
};

/**
 * Checks if a phone number is in the blocklist
 * @param phoneNumber - Phone number to check
 * @returns true if blocked, false otherwise
 */
export const isNumberBlocked = (phoneNumber: string): boolean => {
    try {
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
 * Gets the count of blocked numbers
 * @returns Number of blocked numbers
 */
export const getBlockedCount = (): number => {
    try {
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
 * Clears all blocked numbers from the database
 * WARNING: This is irreversible
 * @returns true if successful, false otherwise
 */
export const clearBlocklist = (): boolean => {
    try {
        db.runSync('DELETE FROM blocklist');
        
        // Sync to native extensions
        syncToExtension();
        
        console.log('Cleared all blocked numbers');
        return true;
    } catch (error) {
        console.error('Error clearing blocklist:', error);
        return false;
    }
};
