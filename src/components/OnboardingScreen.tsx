import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Dimensions, ImageStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
    backgroundImage: any;
    imageStyle?: ImageStyle;
    children: React.ReactNode;
}

export default function OnboardingScreen({ backgroundImage, imageStyle, children }: OnboardingScreenProps) {
    return (
        <ImageBackground
            source={backgroundImage}
            style={styles.background}
            imageStyle={imageStyle}
            resizeMode="cover"
        >
            <LinearGradient
                colors={['transparent', 'rgba(10, 10, 10, 0.6)', 'rgba(10, 10, 10, 0.95)']}
                locations={[0, 0.5, 0.8]}
                style={styles.gradient}
            >
                <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                    {children}
                </SafeAreaView>
            </LinearGradient>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width,
        height,
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
});
