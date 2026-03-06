import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, ScrollView, Switch } from 'react-native';
import OnboardingScreen from '../../components/OnboardingScreen';
import GradientButton from '../../components/GradientButton';
import ProgressDots from '../../components/ProgressDots';

interface SilenceUnknownCallersScreenProps {
    onNext: () => void;
}

export default function SilenceUnknownCallersScreen({ onNext }: SilenceUnknownCallersScreenProps) {
    const [understood, setUnderstood] = useState(false);

    const handleOpenSettings = () => {
        // Deep link directly to the Phone settings pane on iOS
        Linking.openURL('App-Prefs:root=Phone').catch(() => {
            // Fallback to general settings if deep link fails
            Linking.openSettings();
        });
    };

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
                    <Text style={styles.body}>
                        Enable <Text style={styles.bold}>Screen Unknown Callers → Silence</Text> in iOS Settings.
                        {'\n\n'}
                        Calls from numbers not in your contacts will be silently sent to voicemail.
                        Veto's AI will screen them and notify you — so real callers get through,
                        and robocalls disappear.
                    </Text>

                    <View style={styles.instructions}>
                        <Text style={styles.instructionTitle}>Steps:</Text>
                        <View style={styles.step}>
                            <Text style={styles.stepNumber}>1</Text>
                            <Text style={styles.stepText}>Open <Text style={styles.bold}>Settings</Text></Text>
                        </View>
                        <View style={styles.step}>
                            <Text style={styles.stepNumber}>2</Text>
                            <Text style={styles.stepText}>Tap <Text style={styles.bold}>Phone</Text></Text>
                        </View>
                        <View style={styles.step}>
                            <Text style={styles.stepNumber}>3</Text>
                            <Text style={styles.stepText}>Tap <Text style={styles.bold}>Screen Unknown Callers</Text></Text>
                        </View>
                        <View style={styles.step}>
                            <Text style={styles.stepNumber}>4</Text>
                            <Text style={styles.stepText}>Select <Text style={styles.bold}>Silence</Text></Text>
                        </View>
                    </View>

                    <View style={styles.noteCard}>
                        <Text style={styles.noteIcon}>💡</Text>
                        <Text style={styles.noteText}>
                            Contacts, recent calls, and Siri suggestions always ring through — this only
                            silences numbers you've never interacted with.
                        </Text>
                    </View>

                    {/* Acknowledgement toggle */}
                    <View style={styles.toggleRow}>
                        <Switch
                            value={understood}
                            onValueChange={setUnderstood}
                            trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4A90E2' }}
                            thumbColor={understood ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                        />
                        <Text style={styles.toggleLabel}>I've enabled Screen Unknown Callers</Text>
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
    body: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.85)',
        lineHeight: 24,
        marginBottom: 20,
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
    },
    noteCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(74, 144, 226, 0.12)',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(74, 144, 226, 0.3)',
        marginBottom: 20,
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
