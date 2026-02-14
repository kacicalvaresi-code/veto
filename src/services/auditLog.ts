import AsyncStorage from '@react-native-async-storage/async-storage';

const AUDIT_LOG_KEY = '@veto_audit_log';
const MAX_LOG_ENTRIES = 1000; // Keep last 1000 entries

export interface AuditLogEntry {
    id: string;
    phoneNumber: string;
    type: 'call' | 'text';
    action: 'blocked' | 'reported';
    timestamp: string;
    label?: string; // Optional label (e.g., "Telemarketer", "Scam Likely")
}

/**
 * Get all audit log entries
 */
export async function getAuditLog(): Promise<AuditLogEntry[]> {
    try {
        const data = await AsyncStorage.getItem(AUDIT_LOG_KEY);
        if (!data) return [];
        
        const entries: AuditLogEntry[] = JSON.parse(data);
        // Sort by timestamp (newest first)
        return entries.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    } catch (error) {
        console.error('Error loading audit log:', error);
        return [];
    }
}

/**
 * Add a new entry to the audit log
 */
export async function addAuditLogEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
        const entries = await getAuditLog();
        
        const newEntry: AuditLogEntry = {
            ...entry,
            id: generateId(),
            timestamp: new Date().toISOString(),
        };
        
        // Add to beginning of array (newest first)
        entries.unshift(newEntry);
        
        // Keep only the last MAX_LOG_ENTRIES
        const trimmedEntries = entries.slice(0, MAX_LOG_ENTRIES);
        
        await AsyncStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedEntries));
    } catch (error) {
        console.error('Error adding audit log entry:', error);
    }
}

/**
 * Clear all audit log entries
 */
export async function clearAuditLog(): Promise<void> {
    try {
        await AsyncStorage.removeItem(AUDIT_LOG_KEY);
    } catch (error) {
        console.error('Error clearing audit log:', error);
    }
}

/**
 * Filter audit log entries
 */
export function filterAuditLog(
    entries: AuditLogEntry[],
    filters: {
        type?: 'call' | 'text';
        action?: 'blocked' | 'reported';
        searchQuery?: string;
    }
): AuditLogEntry[] {
    let filtered = entries;
    
    if (filters.type) {
        filtered = filtered.filter(entry => entry.type === filters.type);
    }
    
    if (filters.action) {
        filtered = filtered.filter(entry => entry.action === filters.action);
    }
    
    if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(entry =>
            entry.phoneNumber.includes(query) ||
            entry.label?.toLowerCase().includes(query)
        );
    }
    
    return filtered;
}

/**
 * Get audit log statistics
 */
export interface AuditLogStats {
    totalBlocked: number;
    totalReported: number;
    callsBlocked: number;
    textsFiltered: number;
    lastBlockedAt?: string;
}

export async function getAuditLogStats(): Promise<AuditLogStats> {
    const entries = await getAuditLog();
    
    const stats: AuditLogStats = {
        totalBlocked: entries.filter(e => e.action === 'blocked').length,
        totalReported: entries.filter(e => e.action === 'reported').length,
        callsBlocked: entries.filter(e => e.type === 'call' && e.action === 'blocked').length,
        textsFiltered: entries.filter(e => e.type === 'text' && e.action === 'blocked').length,
    };
    
    if (entries.length > 0) {
        stats.lastBlockedAt = entries[0].timestamp;
    }
    
    return stats;
}

/**
 * Export audit log as JSON string
 */
export async function exportAuditLog(): Promise<string> {
    const entries = await getAuditLog();
    return JSON.stringify(entries, null, 2);
}

/**
 * Generate a unique ID for audit log entries
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
