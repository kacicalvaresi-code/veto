import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProtectionDashboard from '../screens/ProtectionDashboard';
import AuditLogScreen from '../screens/AuditLogScreen';
import SettingsScreen from '../screens/SettingsScreen';

type TabName = 'dashboard' | 'audit' | 'settings';

// TabNavigation receives the navigation prop from the Stack.Navigator in App.tsx
// so sub-screens (BlockedCalls, Stats) can be pushed onto the stack
export default function TabNavigation({ navigation }: { navigation?: any }) {
    const [activeTab, setActiveTab] = useState<TabName>('dashboard');

    const renderScreen = () => {
        switch (activeTab) {
            case 'dashboard':
                return <ProtectionDashboard navigation={navigation} />;
            case 'audit':
                return <AuditLogScreen />;
            case 'settings':
                return <SettingsScreen navigation={navigation} />;
            default:
                return <ProtectionDashboard navigation={navigation} />;
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
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('dashboard')}
                >
                    <Text style={styles.tabIcon}>🛡️</Text>
                    <Text style={[
                        styles.tabLabel,
                        activeTab === 'dashboard' && styles.tabLabelActive
                    ]}>
                        Dashboard
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('audit')}
                >
                    <Text style={styles.tabIcon}>📋</Text>
                    <Text style={[
                        styles.tabLabel,
                        activeTab === 'audit' && styles.tabLabelActive
                    ]}>
                        Audit Log
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('settings')}
                >
                    <Text style={styles.tabIcon}>⚙️</Text>
                    <Text style={[
                        styles.tabLabel,
                        activeTab === 'settings' && styles.tabLabelActive
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
});
