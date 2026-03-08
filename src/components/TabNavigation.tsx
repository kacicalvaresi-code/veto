import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState, type AppStateStatus } from 'react-native';
import ProtectionDashboard from '../screens/ProtectionDashboard';
import AuditLogScreen from '../screens/AuditLogScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ScreenedCallsScreen from '../screens/ScreenedCallsScreen';
import ScamBaiterScreen from '../screens/ScamBaiterScreen';
import { getScreenedCalls } from '../modules/VoicemailModule';

type TabName = 'dashboard' | 'screened' | 'baiter' | 'audit' | 'settings';

// TabNavigation receives the navigation prop from the Stack.Navigator in App.tsx
// so sub-screens (BlockedCalls, Stats) can be pushed onto the stack
export default function TabNavigation({ navigation }: { navigation?: any }) {
    const [activeTab, setActiveTab]       = useState<TabName>('dashboard');
    const [pendingCount, setPendingCount] = useState(0);

    // Poll for pending screened calls whenever the app comes to the foreground
    const refreshPendingCount = useCallback(async () => {
        try {
            const calls = await getScreenedCalls();
            const count = calls.filter(c => c.action === 'pending').length;
            setPendingCount(count);
        } catch (e) {
            // Module may not be available
        }
    }, []);

    useEffect(() => {
        refreshPendingCount();
        const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') refreshPendingCount();
        });
        return () => sub.remove();
    }, [refreshPendingCount]);

    // Refresh badge count when user navigates away from the screened tab
    useEffect(() => {
        if (activeTab !== 'screened') {
            refreshPendingCount();
        }
    }, [activeTab, refreshPendingCount]);

    // Callback for child screens to switch tabs programmatically
    const handleSwitchTab = useCallback((tab: string) => {
        setActiveTab(tab as TabName);
    }, []);

    const renderScreen = () => {
        switch (activeTab) {
            case 'dashboard':
                return <ProtectionDashboard navigation={navigation} onSwitchTab={handleSwitchTab} />;
            case 'screened':
                return <ScreenedCallsScreen />;
            case 'baiter':
                return <ScamBaiterScreen />;
            case 'audit':
                return <AuditLogScreen />;
            case 'settings':
                return <SettingsScreen navigation={navigation} />;
            default:
                return <ProtectionDashboard navigation={navigation} onSwitchTab={handleSwitchTab} />;
        }
    };

    return (
        <View style={styles.container}>
            {/* Screen Content */}
            <View style={styles.screenContainer}>
                {renderScreen()}
            </View>

            {/* Tab Bar */}
            <SafeAreaView style={styles.tabBar} edges={['bottom']}>
                {/* Dashboard */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('dashboard')}
                >
                    <Text style={styles.tabIcon}>🛡️</Text>
                    <Text style={[
                        styles.tabLabel,
                        activeTab === 'dashboard' && styles.tabLabelActive,
                    ]}>
                        Dashboard
                    </Text>
                </TouchableOpacity>

                {/* Screened Calls — with badge */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('screened')}
                >
                    <View style={styles.tabIconWrapper}>
                        <Text style={styles.tabIcon}>📬</Text>
                        {pendingCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {pendingCount > 99 ? '99+' : pendingCount}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={[
                        styles.tabLabel,
                        activeTab === 'screened' && styles.tabLabelActive,
                    ]}>
                        Screened
                    </Text>
                </TouchableOpacity>

                {/* Scam Baiter */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('baiter')}
                >
                    <Text style={styles.tabIcon}>🎭</Text>
                    <Text style={[
                        styles.tabLabel,
                        activeTab === 'baiter' && styles.tabLabelActive,
                    ]}>
                        Bait
                    </Text>
                </TouchableOpacity>

                {/* Audit Log */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('audit')}
                >
                    <Text style={styles.tabIcon}>📋</Text>
                    <Text style={[
                        styles.tabLabel,
                        activeTab === 'audit' && styles.tabLabelActive,
                    ]}>
                        Audit Log
                    </Text>
                </TouchableOpacity>

                {/* Settings */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('settings')}
                >
                    <Text style={styles.tabIcon}>⚙️</Text>
                    <Text style={[
                        styles.tabLabel,
                        activeTab === 'settings' && styles.tabLabelActive,
                    ]}>
                        Settings
                    </Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    screenContainer: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#1C1C1E',
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
        paddingTop: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    tabIconWrapper: {
        position: 'relative',
    },
    tabIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    tabLabel: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '600',
    },
    tabLabelActive: {
        color: '#007AFF',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
