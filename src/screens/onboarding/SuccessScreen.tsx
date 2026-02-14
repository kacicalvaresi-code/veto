import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import OnboardingScreen from '../../components/OnboardingScreen';
import GradientButton from '../../components/GradientButton';
import ProgressDots from '../../components/ProgressDots';

interface SuccessScreenProps {
    onFinish: () => void;
}

export default function SuccessScreen({ onFinish }: SuccessScreenProps) {
    return (
        <OnboardingScreen backgroundImage={require('../../../assets/onboarding/success.jpg')}>
            <View style={styles.container}>
                {/* Progress Dots */}
                <View style={styles.progressContainer}>
                    <ProgressDots total={5} current={4} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Text style={styles.checkmark}>✓</Text>
                    </View>

                    <Text style={styles.heading}>Perimeter Secure</Text>
                    <Text style={styles.body}>
                        Your local blocklist is encrypted and ready. Your data stays with you.
                    </Text>

                    {/* Privacy Badges */}
                    <View style={styles.badges}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>🔒 On-Device Only</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>🚫 No Tracking</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>✅ GDPR Compliant</Text>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <GradientButton title="Enter Dashboard" onPress={onFinish} />
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
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    checkmark: {
        fontSize: 80,
        color: '#34C759',
    },
    heading: {
        fontSize: 32,
        fontWeight: '600',
        color: '#34C759',
        textAlign: 'center',
        marginBottom: 16,
    },
    body: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 32,
    },
    badges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    badge: {
        backgroundColor: 'rgba(28, 28, 30, 0.8)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    badgeText: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    actions: {
        paddingBottom: 32,
    },
});
