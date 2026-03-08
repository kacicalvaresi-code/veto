import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import OnboardingScreen from '../../components/OnboardingScreen';
import GradientButton from '../../components/GradientButton';
import ProgressDots from '../../components/ProgressDots';

interface SilenceUnknownCallersScreenProps {
    onNext: () => void;
}

type ScreeningMode = 'ask' | 'silence';

export default function SilenceUnknownCallersScreen({ onNext }: SilenceUnknownCallersScreenProps) {
    const [mode, setMode] = useState<ScreeningMode>('ask');

    const handleOpenSettings = () => {
        Linking.openURL('App-Prefs:root=Phone').catch(() => {
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

                {/* Content */}
                <View style={styles.content}>
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
                                Ask Reason
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
                        <View style={styles.noteCard}>
                            <Text style={styles.noteIcon}>✅</Text>
                            <Text style={styles.noteText}>
                                <Text style={styles.bold}>Recommended.</Text> Real callers get through.
                                Robocalls go to voicemail where Veto screens them automatically.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.noteCard}>
                            <Text style={styles.noteIcon}>🔇</Text>
                            <Text style={styles.noteText}>
                                <Text style={styles.bold}>Strictest mode.</Text> All unknown callers go
                                straight to voicemail. Veto screens every message for you.
                            </Text>
                        </View>
                    )}

                    {/* Next Step instruction */}
                    <View style={styles.nextStepCard}>
                        <Text style={styles.nextStepTitle}>Next Step:</Text>
                        {mode === 'ask' ? (
                            <Text style={styles.nextStepText}>
                                Tap <Text style={styles.bold}>"Open Phone Settings"</Text> below, then select{' '}
                                <Text style={styles.bold}>"Ask Reason for Calling"</Text> and come back here.
                            </Text>
                        ) : (
                            <Text style={styles.nextStepText}>
                                Tap <Text style={styles.bold}>"Open Phone Settings"</Text> below, then select{' '}
                                <Text style={styles.bold}>"Silence"</Text> and come back here.
                            </Text>
                        )}
                    </View>
                </View>

                {/* Actions — always visible at the bottom */}
                <View style={styles.actions}>
                    <GradientButton title="Open Phone Settings" onPress={handleOpenSettings} />
                    <View style={styles.secondaryButton}>
                        <GradientButton
                            title="Continue →"
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
    content: {
        flex: 1,
        justifyContent: 'center',
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
        marginBottom: 20,
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
    bold: {
        fontWeight: '700',
        color: '#FFFFFF',
    },
    noteCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(74, 144, 226, 0.12)',
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(74, 144, 226, 0.3)',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    noteIcon: {
        fontSize: 16,
        marginRight: 10,
        marginTop: 1,
    },
    noteText: {
        flex: 1,
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 20,
    },
    nextStepCard: {
        backgroundColor: 'rgba(0, 210, 255, 0.1)',
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(0, 210, 255, 0.3)',
    },
    nextStepTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#00D2FF',
        marginBottom: 6,
    },
    nextStepText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 20,
    },
    actions: {
        paddingBottom: 32,
        paddingTop: 8,
    },
    secondaryButton: {
        marginTop: 12,
    },
});
