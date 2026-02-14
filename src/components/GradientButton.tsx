import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    icon?: string;
    disabled?: boolean;
}

export default function GradientButton({ title, onPress, icon, disabled = false }: GradientButtonProps) {
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.8}
            style={styles.container}
        >
            <LinearGradient
                colors={disabled ? ['#636366', '#636366'] : ['#007AFF', '#00D2FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    {icon && <Text style={styles.icon}>{icon}</Text>}
                    <Text style={styles.text}>{title}</Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    gradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 16,
        marginRight: 8,
        color: '#FFFFFF',
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
    },
});
