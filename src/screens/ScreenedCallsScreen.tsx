/**
 * ScreenedCallsScreen.tsx
 *
 * The "Smart Voicemail Screening" inbox.
 *
 * Displays calls from unknown numbers that were sent to voicemail and
 * analysed on-device by VetoVoicemailModule.  Each card shows:
 *   - Caller number (and name if available from Contacts)
 *   - AI-generated one-sentence summary
 *   - Classification badge (Spam / Likely Spam / Likely Legit / Unknown)
 *   - Detected intent (Appointment, Delivery, etc.)
 *   - Full transcript (expandable)
 *   - Action buttons: Call Back · Mark Safe · Block · Dismiss
 *
 * All data is stored locally in the App Group container.
 * Nothing is sent to any server.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    getScreenedCalls,
    markCallHandled,
    deleteScreenedCall,
    classificationMeta,
    intentLabel,
    type ScreenedCall,
    type ScreenedCallAction,
} from '../modules/VoicemailModule';
import { addBlockedNumber } from '../services/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
    const date  = new Date(isoString);
    const now   = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins  = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays  = Math.floor(diffHours / 24);

    if (diffMins < 1)    return 'Just now';
    if (diffMins < 60)   return `${diffMins}m ago`;
    if (diffHours < 24)  return `${diffHours}h ago`;
    if (diffDays < 7)    return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatPhoneNumber(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits[0] === '1') {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return raw;
}

// ─── ScreenedCallCard ─────────────────────────────────────────────────────────

interface CardProps {
    call         : ScreenedCall;
    onAction     : (id: string, action: ScreenedCallAction, phoneNumber: string) => void;
    onDelete     : (id: string) => void;
}

function ScreenedCallCard({ call, onAction, onDelete }: CardProps) {
    const [expanded, setExpanded] = useState(false);
    const meta = classificationMeta(call.analysis?.classification ?? 'unknown');

    const isPending = call.action === 'pending';

    return (
        <View style={[styles.card, !isPending && styles.cardHandled]}>
            {/* ── Header row ──────────────────────────────────────────────── */}
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.phoneNumber}>
                        {call.callerName
                            ? call.callerName
                            : formatPhoneNumber(call.phoneNumber)}
                    </Text>
                    {call.callerName && (
                        <Text style={styles.phoneNumberSub}>
                            {formatPhoneNumber(call.phoneNumber)}
                        </Text>
                    )}
                    <Text style={styles.timeAgo}>
                        {formatRelativeTime(call.screenedAt)}
                    </Text>
                </View>

                <View style={styles.cardHeaderRight}>
                    <View style={[styles.classificationBadge, { backgroundColor: meta.color + '22' }]}>
                        <Text style={[styles.classificationText, { color: meta.color }]}>
                            {meta.icon}  {meta.label}
                        </Text>
                    </View>
                    {call.analysis?.detectedIntent && call.analysis.detectedIntent !== 'unknown' && (
                        <Text style={styles.intentLabel}>
                            {intentLabel(call.analysis.detectedIntent)}
                        </Text>
                    )}
                </View>
            </View>

            {/* ── AI Summary ──────────────────────────────────────────────── */}
            {call.analysis?.summary ? (
                <Text style={styles.summary}>{call.analysis.summary}</Text>
            ) : (
                <Text style={styles.summaryEmpty}>No voicemail left.</Text>
            )}

            {/* ── Expandable transcript ────────────────────────────────────── */}
            {call.analysis?.transcript && call.analysis.transcript.length > 0 && (
                <TouchableOpacity
                    onPress={() => setExpanded(e => !e)}
                    style={styles.transcriptToggle}
                >
                    <Text style={styles.transcriptToggleText}>
                        {expanded ? 'Hide transcript ▲' : 'View full transcript ▼'}
                    </Text>
                </TouchableOpacity>
            )}
            {expanded && call.analysis?.transcript && (
                <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptText}>{call.analysis.transcript}</Text>
                </View>
            )}

            {/* ── Action buttons (only shown for pending calls) ─────────────── */}
            {isPending && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionCallBack]}
                        onPress={() => onAction(call.id, 'called_back', call.phoneNumber)}
                    >
                        <Text style={styles.actionBtnText}>Call Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionSafe]}
                        onPress={() => onAction(call.id, 'marked_safe', call.phoneNumber)}
                    >
                        <Text style={styles.actionBtnText}>Mark Safe</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBlock]}
                        onPress={() => onAction(call.id, 'blocked', call.phoneNumber)}
                    >
                        <Text style={styles.actionBtnText}>Block</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionDismiss]}
                        onPress={() => onAction(call.id, 'dismissed', call.phoneNumber)}
                    >
                        <Text style={styles.actionBtnTextDim}>Dismiss</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Handled state label ──────────────────────────────────────── */}
            {!isPending && (
                <View style={styles.handledRow}>
                    <Text style={styles.handledText}>
                        {call.action === 'called_back' && '↩ Called back'}
                        {call.action === 'marked_safe' && '✓ Marked safe'}
                        {call.action === 'blocked'     && '🚫 Blocked'}
                        {call.action === 'dismissed'   && '✕ Dismissed'}
                    </Text>
                    <TouchableOpacity onPress={() => onDelete(call.id)}>
                        <Text style={styles.deleteText}>Remove</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── ScreenedCallsScreen ──────────────────────────────────────────────────────

export default function ScreenedCallsScreen() {
    const [calls, setCalls]         = useState<ScreenedCall[]>([]);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadCalls = useCallback(async () => {
        try {
            const data = await getScreenedCalls();
            setCalls(data);
        } catch (e) {
            // Module may not be available
            setCalls([]);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { loadCalls(); }, [loadCalls]);

    const handleAction = useCallback(async (
        id          : string,
        action      : ScreenedCallAction,
        phoneNumber : string
    ) => {
        if (action === 'called_back') {
            const tel = `tel:${phoneNumber}`;
            const canCall = await Linking.canOpenURL(tel);
            if (canCall) {
                await markCallHandled(id, 'called_back');
                Linking.openURL(tel);
            } else {
                Alert.alert('Cannot Place Call', 'Unable to open the phone dialler.');
                return;
            }
        } else if (action === 'blocked') {
            Alert.alert(
                'Block This Number?',
                `${formatPhoneNumber(phoneNumber)} will be added to your blocklist and all future calls will be silenced.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Block',
                        style: 'destructive',
                        onPress: async () => {
                            addBlockedNumber(phoneNumber, 'Spam');
                            await markCallHandled(id, 'blocked');
                            loadCalls();
                        },
                    },
                ]
            );
            return;
        } else {
            await markCallHandled(id, action);
        }
        loadCalls();
    }, [loadCalls]);

    const handleDelete = useCallback(async (id: string) => {
        await deleteScreenedCall(id);
        loadCalls();
    }, [loadCalls]);

    const handleClearAll = () => {
        Alert.alert(
            'Clear All Screened Calls',
            'This will remove all screened call records. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        for (const call of calls) {
                            await deleteScreenedCall(call.id);
                        }
                        loadCalls();
                    },
                },
            ]
        );
    };

    const pendingCount = calls.filter(c => c.action === 'pending').length;

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading screened calls…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* ── Header ────────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Screened Calls</Text>
                    {pendingCount > 0 && (
                        <Text style={styles.subtitle}>
                            {pendingCount} call{pendingCount !== 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} your attention
                        </Text>
                    )}
                </View>
                {calls.length > 0 && (
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                        <Text style={styles.clearBtnText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Empty state (scrollable) ──────────────────────────────────── */}
            {calls.length === 0 && (
                <ScrollView
                    contentContainerStyle={styles.emptyScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🛡️</Text>
                        <Text style={styles.emptyTitle}>Smart Voicemail Screening Active</Text>
                        <Text style={styles.emptyBody}>
                            When an unknown caller leaves a voicemail, Veto will transcribe and
                            analyse it on your device using AI. You'll see a summary here so you
                            can decide whether to call back.
                        </Text>
                        <View style={styles.emptySteps}>
                            <Text style={styles.emptyStep}>1. Enable "Screen Unknown Callers" in iOS Settings → Phone</Text>
                            <Text style={styles.emptyStep}>2. Unknown callers go straight to voicemail</Text>
                            <Text style={styles.emptyStep}>3. Veto analyses the message on-device</Text>
                            <Text style={styles.emptyStep}>4. You see a summary and decide what to do</Text>
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* ── Call list ─────────────────────────────────────────────────── */}
            {calls.length > 0 && (
                <FlatList
                    data={calls}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ScreenedCallCard
                            call={item}
                            onAction={handleAction}
                            onDelete={handleDelete}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadCalls(); }}
                            tintColor="#007AFF"
                        />
                    }
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#8E8E93',
        fontSize: 15,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    title: {
        fontSize: 34,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 14,
        color: '#FF9F0A',
        marginTop: 2,
    },
    clearBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    clearBtnText: {
        fontSize: 15,
        color: '#FF3B30',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    separator: {
        height: 12,
    },

    // ── Card ──────────────────────────────────────────────────────────────────
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    cardHandled: {
        opacity: 0.65,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cardHeaderLeft: {
        flex: 1,
        marginRight: 12,
    },
    cardHeaderRight: {
        alignItems: 'flex-end',
    },
    phoneNumber: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    phoneNumberSub: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 1,
    },
    timeAgo: {
        fontSize: 12,
        color: '#636366',
        marginTop: 3,
    },
    classificationBadge: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginBottom: 4,
    },
    classificationText: {
        fontSize: 12,
        fontWeight: '600',
    },
    intentLabel: {
        fontSize: 11,
        color: '#8E8E93',
        textAlign: 'right',
    },
    summary: {
        fontSize: 14,
        color: '#EBEBF5',
        lineHeight: 20,
        marginBottom: 8,
    },
    summaryEmpty: {
        fontSize: 14,
        color: '#636366',
        fontStyle: 'italic',
        marginBottom: 8,
    },
    transcriptToggle: {
        marginBottom: 6,
    },
    transcriptToggleText: {
        fontSize: 13,
        color: '#007AFF',
    },
    transcriptBox: {
        backgroundColor: '#2C2C2E',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    transcriptText: {
        fontSize: 13,
        color: '#EBEBF5',
        lineHeight: 19,
    },

    // ── Action buttons ────────────────────────────────────────────────────────
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
        flexWrap: 'wrap',
    },
    actionBtn: {
        flex: 1,
        minWidth: 72,
        borderRadius: 10,
        paddingVertical: 9,
        alignItems: 'center',
    },
    actionCallBack: {
        backgroundColor: '#007AFF',
    },
    actionSafe: {
        backgroundColor: '#34C759',
    },
    actionBlock: {
        backgroundColor: '#FF3B30',
    },
    actionDismiss: {
        backgroundColor: '#2C2C2E',
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    actionBtnTextDim: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
    },

    // ── Handled state ─────────────────────────────────────────────────────────
    handledRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    handledText: {
        fontSize: 13,
        color: '#636366',
    },
    deleteText: {
        fontSize: 13,
        color: '#FF3B30',
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyScrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    emptyContainer: {
        paddingHorizontal: 28,
        paddingTop: 20,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 56,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptyBody: {
        fontSize: 15,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    emptySteps: {
        alignSelf: 'stretch',
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16,
        gap: 10,
    },
    emptyStep: {
        fontSize: 14,
        color: '#EBEBF5',
        lineHeight: 20,
    },
});
