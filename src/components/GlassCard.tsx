import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
    metric: number;
    label: string;
    icon?: string;
}

export default function GlassCard({ metric, label, icon }: GlassCardProps) {
    return (
        <View style={styles.container}>
            <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
                <View style={styles.content}>
                    {icon && <Text style={styles.icon}>{icon}</Text>}
                    <Text style={styles.metric}>{metric}</Text>
                    <Text style={styles.label}>{label}</Text>
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    blurContainer: {
        flex: 1,
        backgroundColor: 'rgba(28, 28, 30, 0.3)',
    },
    content: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 16,
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    metric: {
        fontFamily: 'Courier', // JetBrains Mono alternative
        fontSize: 48,
        fontWeight: '400',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
    },
});
