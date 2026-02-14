import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearAuditLog } from '../services/auditLog';
import { resetMetrics } from '../services/metrics';
import { resetOnboarding } from './OnboardingFlow';

export default function SettingsScreen() {
    const [anonymousReporting, setAnonymousReporting] = useState(true);

    const handleOpenPrivacyPolicy = () => {
        Linking.openURL('https://veto.app/privacy');
    };

    const handleOpenTerms = () => {
        Linking.openURL('https://veto.app/terms');
    };

    const handleContactSupport = () => {
        Linking.openURL('mailto:support@veto.app?subject=Veto Support Request');
    };

    const handleClearData = () => {
        Alert.alert(
            'Clear All Data',
            'This will delete your blocklist, audit log, and metrics. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAuditLog();
                        await resetMetrics();
                        Alert.alert('Success', 'All data has been cleared.');
                    },
                },
            ]
        );
    };

    const handleResetOnboarding = async () => {
        await resetOnboarding();
        Alert.alert('Success', 'Onboarding has been reset. Restart the app to see it again.');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.scrollView}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Settings</Text>
                </View>

                {/* Privacy Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacy</Text>
                    
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Anonymous Reporting</Text>
                            <Text style={styles.settingDescription}>
                                Report spam numbers without sharing your identity
                            </Text>
                        </View>
                        <Switch
                            value={anonymousReporting}
                            onValueChange={setAnonymousReporting}
                            trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <TouchableOpacity style={styles.settingRow} onPress={handleOpenPrivacyPolicy}>
                        <Text style={styles.settingLabel}>Privacy Policy</Text>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingRow} onPress={handleOpenTerms}>
                        <Text style={styles.settingLabel}>Terms of Service</Text>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Version</Text>
                        <Text style={styles.settingValue}>1.0.0</Text>
                    </View>

                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Build</Text>
                        <Text style={styles.settingValue}>1</Text>
                    </View>

                    <TouchableOpacity style={styles.settingRow} onPress={handleContactSupport}>
                        <Text style={styles.settingLabel}>Contact Support</Text>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* Data Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data</Text>
                    
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Local Storage</Text>
                            <Text style={styles.settingDescription}>
                                All data is stored on your device only
                            </Text>
                        </View>
                        <Text style={styles.badge}>✓</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={handleClearData}
                    >
                        <Text style={[styles.settingLabel, styles.dangerText]}>
                            Clear All Data
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Developer Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Developer</Text>
                    
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={handleResetOnboarding}
                    >
                        <Text style={styles.settingLabel}>Reset Onboarding</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Made with privacy in mind
                    </Text>
                    <Text style={styles.footerText}>
                        © 2026 Veto
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    title: {
        fontSize: 34,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#1C1C1E',
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    settingInfo: {
        flex: 1,
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 16,
        color: '#FFFFFF',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 13,
        color: '#8E8E93',
        lineHeight: 18,
    },
    settingValue: {
        fontSize: 16,
        color: '#8E8E93',
    },
    arrow: {
        fontSize: 20,
        color: '#8E8E93',
    },
    badge: {
        fontSize: 18,
        color: '#34C759',
    },
    dangerText: {
        color: '#FF3B30',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    footerText: {
        fontSize: 13,
        color: '#636366',
        marginBottom: 4,
    },
});
