import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PulsingShield from '../components/PulsingShield';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import MetricsModule from '../modules/MetricsModule';
import { addBlockedNumber } from '../services/database';

// Accept optional navigation and onSwitchTab callback
interface ProtectionDashboardProps {
    navigation?: any;
    onSwitchTab?: (tab: string) => void;
}

export default function ProtectionDashboard({ navigation, onSwitchTab }: ProtectionDashboardProps) {
    const [isActive, setIsActive] = useState(true);
    const [callsBlocked, setCallsBlocked] = useState(0);
    const [textsFiltered, setTextsFiltered] = useState(0);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportNumber, setReportNumber] = useState('');
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
        setReportNumber('');
        setShowReportModal(true);
    };

    const handleSubmitReport = () => {
        // Strip non-digits
        const digits = reportNumber.replace(/\D/g, '');
        if (digits.length < 7) {
            Alert.alert('Invalid Number', 'Please enter a valid phone number with at least 7 digits.');
            return;
        }
        // Add to local blocklist
        const success = addBlockedNumber(digits, 'Reported Spam');
        setShowReportModal(false);
        if (success) {
            Alert.alert(
                'Number Reported',
                `${formatDisplay(digits)} has been added to your local blocklist. Future calls from this number will be blocked.`,
                [{ text: 'OK' }]
            );
        } else {
            Alert.alert(
                'Already Blocked',
                `${formatDisplay(digits)} is already in your blocklist.`,
                [{ text: 'OK' }]
            );
        }
    };

    const formatDisplay = (digits: string): string => {
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        if (digits.length === 11 && digits[0] === '1') {
            return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        }
        return digits;
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

            {/* Report Number Modal */}
            <Modal
                visible={showReportModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowReportModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Report a Spam Number</Text>
                        <Text style={styles.modalSubtitle}>
                            Enter the phone number to add to your local blocklist.
                        </Text>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="(555) 123-4567"
                            placeholderTextColor="#636366"
                            keyboardType="phone-pad"
                            value={reportNumber}
                            onChangeText={setReportNumber}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowReportModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalSubmitBtn,
                                    reportNumber.replace(/\D/g, '').length < 7 && styles.modalSubmitDisabled,
                                ]}
                                onPress={handleSubmitReport}
                                disabled={reportNumber.replace(/\D/g, '').length < 7}
                            >
                                <Text style={styles.modalSubmitText}>Block Number</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        padding: 24,
        width: '85%',
        maxWidth: 340,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        marginBottom: 20,
    },
    phoneInput: {
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 1,
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelBtn: {
        flex: 1,
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8E8E93',
    },
    modalSubmitBtn: {
        flex: 1,
        backgroundColor: '#FF3B30',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    modalSubmitDisabled: {
        opacity: 0.4,
    },
    modalSubmitText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
