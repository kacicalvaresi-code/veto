import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    getAuditLog,
    filterAuditLog,
    exportAuditLog,
    AuditLogEntry,
} from '../services/auditLog';
import { formatPhoneNumber } from '../utils/phoneNumber';

export default function AuditLogScreen() {
    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<AuditLogEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'call' | 'text'>('all');
    const [filterAction, setFilterAction] = useState<'all' | 'blocked' | 'reported'>('all');

    useEffect(() => {
        loadAuditLog();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [entries, searchQuery, filterType, filterAction]);

    const loadAuditLog = async () => {
        const log = await getAuditLog();
        setEntries(log);
    };

    const applyFilters = () => {
        const filtered = filterAuditLog(entries, {
            type: filterType !== 'all' ? filterType : undefined,
            action: filterAction !== 'all' ? filterAction : undefined,
            searchQuery: searchQuery || undefined,
        });
        setFilteredEntries(filtered);
    };

    const handleExport = async () => {
        try {
            const jsonData = await exportAuditLog();
            await Share.share({
                message: jsonData,
                title: 'Veto Audit Log Export',
            });
        } catch (error) {
            console.error('Error exporting audit log:', error);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    };

    const renderEntry = ({ item }: { item: AuditLogEntry }) => (
        <View style={styles.entryCard}>
            <View style={styles.entryHeader}>
                <View style={styles.entryType}>
                    <Text style={styles.entryIcon}>
                        {item.type === 'call' ? '📞' : '💬'}
                    </Text>
                    <Text style={styles.entryTypeText}>
                        {item.type === 'call' ? 'Call' : 'Text'}
                    </Text>
                </View>
                <View style={[
                    styles.entryBadge,
                    item.action === 'blocked' ? styles.blockedBadge : styles.reportedBadge
                ]}>
                    <Text style={styles.entryBadgeText}>
                        {item.action === 'blocked' ? 'Blocked' : 'Reported'}
                    </Text>
                </View>
            </View>

            <Text style={styles.entryPhoneNumber}>
                {formatPhoneNumber(item.phoneNumber)}
            </Text>

            {item.label && (
                <Text style={styles.entryLabel}>{item.label}</Text>
            )}

            <Text style={styles.entryTimestamp}>
                {formatTimestamp(item.timestamp)}
            </Text>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>No Activity Yet</Text>
            <Text style={styles.emptyDescription}>
                Your call and text blocking activity will appear here
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Audit Log</Text>
                {entries.length > 0 && (
                    <TouchableOpacity onPress={handleExport}>
                        <Text style={styles.exportButton}>Export</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search phone numbers..."
                    placeholderTextColor="#636366"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    keyboardType="phone-pad"
                />
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <View style={styles.filterGroup}>
                    <TouchableOpacity
                        style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
                        onPress={() => setFilterType('all')}
                    >
                        <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>
                            All
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filterType === 'call' && styles.filterButtonActive]}
                        onPress={() => setFilterType('call')}
                    >
                        <Text style={[styles.filterButtonText, filterType === 'call' && styles.filterButtonTextActive]}>
                            Calls
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filterType === 'text' && styles.filterButtonActive]}
                        onPress={() => setFilterType('text')}
                    >
                        <Text style={[styles.filterButtonText, filterType === 'text' && styles.filterButtonTextActive]}>
                            Texts
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.filterGroup}>
                    <TouchableOpacity
                        style={[styles.filterButton, filterAction === 'all' && styles.filterButtonActive]}
                        onPress={() => setFilterAction('all')}
                    >
                        <Text style={[styles.filterButtonText, filterAction === 'all' && styles.filterButtonTextActive]}>
                            All
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filterAction === 'blocked' && styles.filterButtonActive]}
                        onPress={() => setFilterAction('blocked')}
                    >
                        <Text style={[styles.filterButtonText, filterAction === 'blocked' && styles.filterButtonTextActive]}>
                            Blocked
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filterAction === 'reported' && styles.filterButtonActive]}
                        onPress={() => setFilterAction('reported')}
                    >
                        <Text style={[styles.filterButtonText, filterAction === 'reported' && styles.filterButtonTextActive]}>
                            Reported
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Results Count */}
            {filteredEntries.length > 0 && (
                <View style={styles.resultsContainer}>
                    <Text style={styles.resultsText}>
                        {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                    </Text>
                </View>
            )}

            {/* List */}
            <FlatList
                data={filteredEntries}
                renderItem={renderEntry}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmptyState}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    title: {
        fontSize: 34,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    exportButton: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    searchInput: {
        backgroundColor: '#1C1C1E',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#FFFFFF',
    },
    filtersContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    filterGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    filterButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    filterButtonText: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '600',
    },
    filterButtonTextActive: {
        color: '#FFFFFF',
    },
    resultsContainer: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    resultsText: {
        fontSize: 13,
        color: '#8E8E93',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    entryCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    entryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    entryType: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    entryIcon: {
        fontSize: 20,
    },
    entryTypeText: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '600',
    },
    entryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    blockedBadge: {
        backgroundColor: 'rgba(255, 59, 48, 0.2)',
    },
    reportedBadge: {
        backgroundColor: 'rgba(255, 149, 0, 0.2)',
    },
    entryBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    entryPhoneNumber: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
        fontFamily: 'Courier',
    },
    entryLabel: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 8,
    },
    entryTimestamp: {
        fontSize: 13,
        color: '#636366',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
