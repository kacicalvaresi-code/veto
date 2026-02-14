import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProgressDotsProps {
    total: number;
    current: number;
}

export default function ProgressDots({ total, current }: ProgressDotsProps) {
    return (
        <View style={styles.container}>
            {Array.from({ length: total }).map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.dot,
                        index === current && styles.activeDot,
                    ]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#636366',
    },
    activeDot: {
        backgroundColor: '#007AFF',
    },
});
