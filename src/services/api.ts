import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Gets the backend URL based on environment and platform
 * Development: Uses localhost (with platform-specific handling)
 * Production: Uses environment variable or default production URL
 */
const getBackendUrl = (): string => {
    // Check if we're in development mode
    const isDev = __DEV__;
    
    if (isDev) {
        // Development mode - use localhost
        if (Platform.OS === 'android') {
            // Android emulator uses 10.0.2.2 to access host machine's localhost
            return 'http://10.0.2.2:3000/api';
        } else if (Platform.OS === 'ios') {
            // iOS simulator can use localhost directly
            return 'http://localhost:3000/api';
        } else {
            // Web or other platforms
            return 'http://localhost:3000/api';
        }
    } else {
        // Production mode - use environment variable or default
        const productionUrl = Constants.expoConfig?.extra?.backendUrl;
        return productionUrl || 'https://api.veto.app/api';
    }
};

const BACKEND_URL = getBackendUrl();

console.log(`API Service initialized with backend URL: ${BACKEND_URL}`);

/**
 * Reports a phone number as spam to the backend
 * @param phoneNumber - Phone number in E.164 format
 * @param label - Label for the spam type (e.g., "Spam", "Telemarketer")
 * @returns Response data or null on error
 */
export const reportSpam = async (phoneNumber: string, label: string): Promise<any> => {
    try {
        console.log(`Reporting spam: ${phoneNumber} as ${label}`);
        
        const response = await fetch(`${BACKEND_URL}/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumber,
                label,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Spam report successful:', data);
        return data;
    } catch (error) {
        console.error('Error reporting spam:', error);
        // Don't throw - we want the app to continue working even if reporting fails
        return null;
    }
};

/**
 * Checks the reputation of a phone number
 * @param phoneNumber - Phone number in E.164 format
 * @returns Reputation data or null on error
 */
export const checkReputation = async (phoneNumber: string): Promise<any> => {
    try {
        console.log(`Checking reputation for: ${phoneNumber}`);
        
        const response = await fetch(`${BACKEND_URL}/reputation/${phoneNumber}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Reputation check successful:', data);
        return data;
    } catch (error) {
        console.error('Error checking reputation:', error);
        return null;
    }
};

/**
 * Pings the backend to check if it's available
 * @returns true if backend is reachable, false otherwise
 */
export const pingBackend = async (): Promise<boolean> => {
    try {
        const response = await fetch(BACKEND_URL.replace('/api', ''), {
            method: 'GET',
        });
        
        return response.ok;
    } catch (error) {
        console.error('Backend ping failed:', error);
        return false;
    }
};
