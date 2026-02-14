import AsyncStorage from '@react-native-async-storage/async-storage';

const METRICS_KEY = '@veto_metrics';

export interface ProtectionMetrics {
    callsBlocked: number;
    textsFiltered: number;
    lastUpdated: string;
}

/**
 * Get current protection metrics from local storage
 */
export async function getMetrics(): Promise<ProtectionMetrics> {
    try {
        const data = await AsyncStorage.getItem(METRICS_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading metrics:', error);
    }

    // Return default metrics
    return {
        callsBlocked: 0,
        textsFiltered: 0,
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Increment call blocked counter
 */
export async function incrementCallsBlocked(): Promise<void> {
    try {
        const metrics = await getMetrics();
        metrics.callsBlocked += 1;
        metrics.lastUpdated = new Date().toISOString();
        await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    } catch (error) {
        console.error('Error incrementing calls blocked:', error);
    }
}

/**
 * Increment text filtered counter
 */
export async function incrementTextsFiltered(): Promise<void> {
    try {
        const metrics = await getMetrics();
        metrics.textsFiltered += 1;
        metrics.lastUpdated = new Date().toISOString();
        await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    } catch (error) {
        console.error('Error incrementing texts filtered:', error);
    }
}

/**
 * Reset all metrics (for testing or user request)
 */
export async function resetMetrics(): Promise<void> {
    try {
        const metrics: ProtectionMetrics = {
            callsBlocked: 0,
            textsFiltered: 0,
            lastUpdated: new Date().toISOString(),
        };
        await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    } catch (error) {
        console.error('Error resetting metrics:', error);
    }
}
