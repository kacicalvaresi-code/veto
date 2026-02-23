import React from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import OnboardingScreen from '../../components/OnboardingScreen';
import GradientButton from '../../components/GradientButton';
import ProgressDots from '../../components/ProgressDots';

interface EnableBlockingScreenProps {
    onNext: () => void;
}

export default function EnableBlockingScreen({ onNext }: EnableBlockingScreenProps) {
    const handleOpenSettings = () => {
        if (Platform.OS === 'ios') {
            // Deep link to iOS Settings
            Linking.openURL('App-Prefs:root=Phone');
        } else {
            // Android: Open app settings
            Linking.openSettings();
        }
    };

    return (
        <OnboardingScreen backgroundImage={require('../../../assets/onboarding/settings.jpg')}>
            <View style={styles.container}>
                {/* Progress Dots */}
                <View style={styles.progressContainer}>
                    <ProgressDots total={5} current={1} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <Text style={styles.heading}>Enable Local Protection</Text>
                    <Text style={styles.body}>
                        Veto only works locally. To block calls, Veto needs permission to identify numbers.
                        {'\n\n'}
                        Your contacts and logs never leave this device.
                    </Text>

                    {Platform.OS === 'ios' && (
                        <View style={styles.instructions}>
                            <Text style={styles.instructionTitle}>Steps:</Text>
                            <Text style={styles.instructionText}>1. Open Settings</Text>
                            <Text style={styles.instructionText}>2. Tap "Phone"</Text>
                            <Text style={styles.instructionText}>3. Tap "Call Blocking & Identification"</Text>
                            <Text style={styles.instructionText}>4. Enable "Veto"</Text>
                        </View>
                    )}

                    {Platform.OS === 'android' && (
                        <View style={styles.instructions}>
                            <Text style={styles.instructionTitle}>Steps:</Text>
                            <Text style={styles.instructionText}>1. Open Settings</Text>
                            <Text style={styles.instructionText}>2. Tap "Apps"</Text>
                            <Text style={styles.instructionText}>3. Tap "Default apps"</Text>
                            <Text style={styles.instructionText}>4. Set Veto as "Caller ID & spam"</Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <GradientButton title="Open Settings" onPress={handleOpenSettings} />
                    <View style={styles.secondaryButton}>
                        <GradientButton title="I've Already Enabled It" onPress={onNext} />
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
        paddingBottom: 40,
    },
    heading: {
        fontSize: 28,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    body: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: 24,
        marginBottom: 24,
    },
    instructions: {
        backgroundColor: 'rgba(28, 28, 30, 0.6)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    instructionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    instructionText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 8,
    },
    actions: {
        paddingBottom: 32,
    },
    secondaryButton: {
        marginTop: 12,
    },
});
