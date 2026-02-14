import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WelcomeScreen from './onboarding/WelcomeScreen';
import EnableBlockingScreen from './onboarding/EnableBlockingScreen';
import SuccessScreen from './onboarding/SuccessScreen';

const ONBOARDING_COMPLETE_KEY = '@veto_onboarding_complete';

interface OnboardingFlowProps {
    onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
    const [currentScreen, setCurrentScreen] = useState(0);

    const handleNext = () => {
        if (currentScreen < 2) {
            setCurrentScreen(currentScreen + 1);
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
            onComplete();
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            onComplete(); // Complete anyway
        }
    };

    return (
        <View style={styles.container}>
            {currentScreen === 0 && (
                <WelcomeScreen onNext={handleNext} onSkip={handleSkip} />
            )}
            {currentScreen === 1 && (
                <EnableBlockingScreen onNext={handleNext} />
            )}
            {currentScreen === 2 && (
                <SuccessScreen onFinish={completeOnboarding} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
});

/**
 * Check if onboarding has been completed
 */
export async function isOnboardingComplete(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        return value === 'true';
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        return false;
    }
}

/**
 * Reset onboarding status (for testing)
 */
export async function resetOnboarding(): Promise<void> {
    try {
        await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    } catch (error) {
        console.error('Error resetting onboarding:', error);
    }
}
