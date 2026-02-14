/**
 * Phone Number Utilities
 * Handles validation, formatting, and normalization of phone numbers
 */

/**
 * Validates if a string is a valid phone number
 * @param phoneNumber - The phone number to validate
 * @returns true if valid, false otherwise
 */
export const validatePhoneNumber = (phoneNumber: string): boolean => {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        return false;
    }

    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid length (10-15 digits)
    // 10 digits: US local number
    // 11 digits: US number with country code (1)
    // Up to 15 digits: International numbers
    return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Formats a phone number to E.164 format
 * E.164 format: +[country code][number] (e.g., +15551234567)
 * For CallKit, we store without the '+' sign
 * 
 * @param phoneNumber - The phone number to format
 * @param countryCode - The country code (default: '1' for US)
 * @returns Formatted phone number or null if invalid
 */
export const formatToE164 = (phoneNumber: string, countryCode: string = '1'): string | null => {
    if (!validatePhoneNumber(phoneNumber)) {
        return null;
    }

    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If the number already starts with country code, use it as-is
    if (cleaned.startsWith(countryCode) && cleaned.length === 11) {
        return cleaned;
    }
    
    // If it's a 10-digit number, add country code
    if (cleaned.length === 10) {
        return `${countryCode}${cleaned}`;
    }
    
    // If it's already 11+ digits, assume it has country code
    if (cleaned.length >= 11) {
        return cleaned;
    }
    
    return null;
};

/**
 * Formats a phone number for display
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number (e.g., (555) 123-4567)
 */
export const formatForDisplay = (phoneNumber: string): string => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // US format: (555) 123-4567
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // US format with country code: +1 (555) 123-4567
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    // International format: just add spaces every 3-4 digits
    if (cleaned.length > 11) {
        return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
    }
    
    // Fallback: return as-is
    return phoneNumber;
};

/**
 * Normalizes a phone number by removing all non-digit characters
 * @param phoneNumber - The phone number to normalize
 * @returns Normalized phone number (digits only)
 */
export const normalizePhoneNumber = (phoneNumber: string): string => {
    return phoneNumber.replace(/\D/g, '');
};

/**
 * Checks if two phone numbers are the same
 * Compares the last 10 digits to handle country code variations
 * 
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns true if numbers match, false otherwise
 */
export const arePhoneNumbersEqual = (phone1: string, phone2: string): boolean => {
    const normalized1 = normalizePhoneNumber(phone1);
    const normalized2 = normalizePhoneNumber(phone2);
    
    // Exact match
    if (normalized1 === normalized2) {
        return true;
    }
    
    // Compare last 10 digits (for US numbers with/without country code)
    if (normalized1.length >= 10 && normalized2.length >= 10) {
        const last10_1 = normalized1.slice(-10);
        const last10_2 = normalized2.slice(-10);
        return last10_1 === last10_2;
    }
    
    return false;
};

/**
 * Gets an error message for invalid phone numbers
 * @param phoneNumber - The phone number that failed validation
 * @returns User-friendly error message
 */
export const getValidationErrorMessage = (phoneNumber: string): string => {
    if (!phoneNumber || phoneNumber.trim() === '') {
        return 'Please enter a phone number';
    }
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length < 10) {
        return 'Phone number is too short (minimum 10 digits)';
    }
    
    if (cleaned.length > 15) {
        return 'Phone number is too long (maximum 15 digits)';
    }
    
    return 'Invalid phone number format';
};
