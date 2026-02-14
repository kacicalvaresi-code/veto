import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';

interface PulsingShieldProps {
    isActive: boolean;
    size?: number;
}

export default function PulsingShield({ isActive, size = 120 }: PulsingShieldProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isActive) {
            // Start pulsating animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Fade in glow
            Animated.timing(glowOpacity, {
                toValue: 0.6,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            // Stop animation and fade out glow
            pulseAnim.setValue(1);
            Animated.timing(glowOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isActive]);

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Glow effect */}
            <Animated.View
                style={[
                    styles.glow,
                    {
                        width: size + 40,
                        height: size + 40,
                        borderRadius: (size + 40) / 2,
                        opacity: glowOpacity,
                        transform: [{ scale: pulseAnim }],
                    },
                ]}
            />
            
            {/* Shield icon */}
            <Animated.View
                style={[
                    styles.shield,
                    {
                        transform: [{ scale: pulseAnim }],
                    },
                ]}
            >
                <Image
                    source={require('../../assets/icon.png')}
                    style={{ width: size, height: size }}
                    resizeMode="contain"
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        backgroundColor: '#007AFF',
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 40,
        elevation: 20,
    },
    shield: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
