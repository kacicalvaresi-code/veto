import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import OnboardingScreen from '../../components/OnboardingScreen';
import GradientButton from '../../components/GradientButton';
import ProgressDots from '../../components/ProgressDots';

interface WelcomeScreenProps {
    onNext: () => void;
    onSkip: () => void;
}

export default function WelcomeScreen({ onNext, onSkip }: WelcomeScreenProps) {
    return (
        <OnboardingScreen backgroundImage={require('../../../assets/onboarding/welcome.jpg')}>
            <View style={styles.container}>
                {/* Progress Dots */}
                <View style={styles.progressContainer}>
                    <ProgressDots total={5} current={0} />
                </View>

                {/* Shield Icon */}
                <View style={styles.iconContainer}>
                    <Image
                        source={require('../../../assets/icon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <Text style={styles.heading}>Welcome to Veto</Text>
                    <Text style={styles.subheading}>
                        Block spam calls with zero data collection. Your privacy, your device.
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <GradientButton title="Get Started" onPress={onNext} />
                    <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                        <Text style={styles.skipText}>Skip Tutorial</Text>
                    </TouchableOpacity>
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
    iconContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        width: 100,
        height: 100,
    },
    content: {
        paddingBottom: 40,
    },
    heading: {
        fontSize: 32,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 16,
    },
    subheading: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        lineHeight: 26,
    },
    actions: {
        paddingBottom: 32,
    },
    skipButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    skipText: {
        fontSize: 14,
        color: '#8E8E93',
    },
});
