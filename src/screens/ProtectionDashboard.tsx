import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PulsingShield from '../components/PulsingShield';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import MetricsModule from '../modules/MetricsModule';

// Accept optional navigation and onSwitchTab callback
interface ProtectionDashboardProps {
    navigation?: any;
    onSwitchTab?: (tab: string) => void;
}

export default function ProtectionDashboard({ navigation, onSwitchTab }: ProtectionDashboardProps) {
    const [isActive, setIsActive] = useState(true);
    const [callsBlocked, setCallsBlocked] = useState(0);
    const [textsFiltered, setTextsFiltered] = useState(0);
    const fadeAnim = new Animated.Value(0);

    useEffect(() => {
        loadMetrics();

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        const interval = setInterval(loadMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadMetrics = async () => {
        try {
            const metrics = await MetricsModule.getMetrics();
            setCallsBlocked(metrics.callsBlocked);
            setTextsFiltered(metrics.textsFiltered);
        } catch (e) {
            // Native module may not be available — keep defaults
        }
    };

    const handleReportNow = () => {
        Alert.alert(
            'Report a Spam Number',
            'Enter the spam phone number you want to report.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Report via Email',
                    onPress: () => {
                        Linking.openURL(
                            'mailto:support@vetospam.app?subject=Spam%20Number%20Report&body=Phone%20number:%20%0ADetails:%20'
                        );
                    },
                },
            ]
        );
    };

    const handleViewAuditLog = () => {
        if (onSwitchTab) {
            onSwitchTab('audit');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Layer 1: The Pulse */}
                <Animated.View style={[styles.pulseSection, { opacity: fadeAnim }]}>
                    <PulsingShield isActive={isActive} size={120} />
                    <Text style={styles.statusText}>
                        {isActive ? 'VETO ACTIVE' : 'VETO DISABLED'}
                    </Text>
                    <Text style={styles.subtitleText}>
                        {isActive ? 'Local protection enabled' : 'Tap to enable protection'}
                    </Text>
                </Animated.View>

                {/* Layer 2: Protection Metrics */}
                <Animated.View
                    style={[
                        styles.metricsSection,
                        {
                            opacity: fadeAnim,
                            transform: [
                                {
                                    translateY: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [20, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View style={styles.cardsRow}>
                        <GlassCard
                            metric={callsBlocked}
                            label="Calls Blocked"
                            icon="📵"
                        />
                        <View style={styles.cardSpacer} />
                        <GlassCard
                            metric={textsFiltered}
                            label="Texts Filtered"
                            icon="💬"
                        />
                    </View>

                    <TouchableOpacity onPress={handleViewAuditLog} style={styles.auditLink}>
                        <Text style={styles.auditLinkText}>
                            View Local Audit Log →
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Spacer to push button to bottom */}
                <View style={styles.spacer} />
            </ScrollView>

            {/* Layer 3: The Primary Action */}
            <View style={styles.buttonContainer}>
                <GradientButton
                    title="Report Now"
                    onPress={handleReportNow}
                    icon="+"
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 32,
    },
    pulseSection: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40,
    },
    statusText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
        marginTop: 16,
        letterSpacing: 1,
    },
    subtitleText: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 8,
    },
    metricsSection: {
        paddingBottom: 32,
    },
    cardsRow: {
        flexDirection: 'row',
        height: 160,
        marginBottom: 16,
    },
    cardSpacer: {
        width: 16,
    },
    auditLink: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    auditLinkText: {
        fontSize: 14,
        color: '#007AFF',
    },
    spacer: {
        flex: 1,
    },
    buttonContainer: {
        paddingHorizontal: 32,
        paddingBottom: 32,
    },
});
