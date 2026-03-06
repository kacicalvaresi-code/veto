import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, ScrollView, Switch, TouchableOpacity } from 'react-native';
import OnboardingScreen from '../../components/OnboardingScreen';
import GradientButton from '../../components/GradientButton';
import ProgressDots from '../../components/ProgressDots';

interface SilenceUnknownCallersScreenProps {
    onNext: () => void;
}

type ScreeningMode = 'ask' | 'silence';

export default function SilenceUnknownCallersScreen({ onNext }: SilenceUnknownCallersScreenProps) {
    const [understood, setUnderstood] = useState(false);
    const [mode, setMode] = useState<ScreeningMode>('ask');

    const handleOpenSettings = () => {
        Linking.openURL('App-Prefs:root=Phone').catch(() => {
            Linking.openSettings();
        });
    };

    const askSteps = [
        { n: '1', text: <>Open <Text style={styles.bold}>Settings</Text></> },
        { n: '2', text: <>Tap <Text style={styles.bold}>Phone</Text></> },
        { n: '3', text: <>Tap <Text style={styles.bold}>Screen Unknown Callers</Text></> },
        { n: '4', text: <>Select <Text style={styles.bold}>Ask Reason for Calling</Text></> },
    ];

    const silenceSteps = [
        { n: '1', text: <>Open <Text style={styles.bold}>Settings</Text></> },
        { n: '2', text: <>Tap <Text style={styles.bold}>Phone</Text></> },
        { n: '3', text: <>Tap <Text style={styles.bold}>Screen Unknown Callers</Text></> },
        { n: '4', text: <>Select <Text style={styles.bold}>Silence</Text></> },
    ];

    const steps = mode === 'ask' ? askSteps : silenceSteps;

    return (
        <OnboardingScreen backgroundImage={require('../../../assets/onboarding/settings.jpg')}>
            <View style={styles.container}>
                {/* Progress Dots */}
                <View style={styles.progressContainer}>
                    <ProgressDots total={5} current={2} />
                </View>

                {/* Scrollable Content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.eyebrow}>Smart Screening</Text>
                    <Text style={styles.heading}>Screen Unknown Callers</Text>

                    {/* Mode picker */}
                    <View style={styles.modePicker}>
                        <TouchableOpacity
                            style={[styles.modeTab, mode === 'ask' && styles.modeTabActive]}
                            onPress={() => setMode('ask')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.modeTabText, mode === 'ask' && styles.modeTabTextActive]}>
                                Ask Reason ✓
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeTab, mode === 'silence' && styles.modeTabActive]}
                            onPress={() => setMode('silence')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.modeTabText, mode === 'silence' && styles.modeTabTextActive]}>
                                Silence All
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {mode === 'ask' ? (
                        <>
                            <Text style={styles.body}>
                                iOS will ask unknown callers to state their name and reason before your phone rings.
                                Real callers — like a doctor's office or contractor — speak their reason and get through.
                                Robocalls can't respond and go to voicemail, where{' '}
                                <Text style={styles.bold}>Veto's on-device AI screens them for you.</Text>
                            </Text>
                            <View style={styles.noteCard}>
                                <Text style={styles.noteIcon}>✅</Text>
                                <Text style={styles.noteText}>
                                    <Text style={styles.bold}>Recommended.</Text> You never miss a legitimate call,
                                    and robocalls are still filtered automatically.
                                </Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <Text style={styles.body}>
                                All calls from numbers not in your contacts are silently sent to voicemail.
                                Veto's AI screens every message on-device and notifies you — so you can decide
                                whether to call back without ever being interrupted.
                            </Text>
                            <View style={styles.noteCard}>
                                <Text style={styles.noteIcon}>⚠️</Text>
                                <Text style={styles.noteText}>
                                    <Text style={styles.bold}>Strictest mode.</Text> Legitimate unknown callers
                                    (doctors, contractors) will also go to voicemail. Best for users who prefer
                                    zero interruptions.
                                </Text>
                            </View>
                        </>
                    )}

                    <View style={styles.instructions}>
                        <Text style={styles.instructionTitle}>Steps:</Text>
                        {steps.map((step) => (
                            <View style={styles.step} key={step.n}>
                                <Text style={styles.stepNumber}>{step.n}</Text>
                                <Text style={styles.stepText}>{step.text}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Acknowledgement toggle */}
                    <View style={styles.toggleRow}>
                        <Switch
                            value={understood}
                            onValueChange={setUnderstood}
                            trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4A90E2' }}
                            thumbColor={understood ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                        />
                        <Text style={styles.toggleLabel}>
                            I've set up Screen Unknown Callers
                        </Text>
                    </View>
                </ScrollView>

                {/* Actions — always visible at the bottom */}
                <View style={styles.actions}>
                    <GradientButton title="Open Phone Settings" onPress={handleOpenSettings} />
                    <View style={styles.secondaryButton}>
                        <GradientButton
                            title={understood ? "Continue →" : "Skip for Now"}
                            onPress={onNext}
                        />
                    </View>
                </View>
            </View>
        </OnboardingScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 32,
    },
    progressContainer: {
        paddingTop: 20,
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 16,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
        color: '#4A90E2',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    heading: {
        fontSize: 28,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    modePicker: {
        flexDirection: 'row',
        backgroundColor: 'rgba(28, 28, 30, 0.6)',
        borderRadius: 10,
        padding: 4,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    modeTab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    modeTabActive: {
        backgroundColor: '#4A90E2',
    },
    modeTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
    },
    modeTabTextActive: {
        color: '#FFFFFF',
    },
    body: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.85)',
        lineHeight: 23,
        marginBottom: 14,
    },
    bold: {
        fontWeight: '700',
        color: '#FFFFFF',
    },
    instructions: {
        backgroundColor: 'rgba(28, 28, 30, 0.6)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        marginBottom: 16,
    },
    instructionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#4A90E2',
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 24,
        marginRight: 12,
    },
    stepText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.9)',
        flex: 1,
    },
    noteCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(74, 144, 226, 0.12)',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(74, 144, 226, 0.3)',
        marginBottom: 16,
        alignItems: 'flex-start',
    },
    noteIcon: {
        fontSize: 16,
        marginRight: 10,
        marginTop: 1,
    },
    noteText: {
        flex: 1,
        fontSize: 13,
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 19,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingBottom: 8,
    },
    toggleLabel: {
        flex: 1,
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    actions: {
        paddingBottom: 32,
        paddingTop: 8,
    },
    secondaryButton: {
        marginTop: 12,
    },
});
