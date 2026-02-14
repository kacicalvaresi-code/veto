import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, TextInput, Alert, TouchableOpacity } from 'react-native';
import { getBlocklist, addBlockedNumber, removeBlockedNumber, initDatabase, BlockedNumber } from '../services/database';
import { reportSpam } from '../services/api';
import { 
    validatePhoneNumber, 
    formatToE164, 
    formatForDisplay, 
    getValidationErrorMessage 
} from '../utils/phoneNumber';
import { addAuditLogEntry } from '../services/auditLog';

export default function BlocklistManager() {
    const [numbers, setNumbers] = useState<BlockedNumber[]>([]);
    const [newNumber, setNewNumber] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        initDatabase();
        refreshList();
    }, []);

    const refreshList = () => {
        const list = getBlocklist();
        setNumbers(list);
    };

    const handleAdd = async () => {
        if (!newNumber.trim()) {
            Alert.alert('Error', 'Please enter a phone number');
            return;
        }

        // Validate phone number
        if (!validatePhoneNumber(newNumber)) {
            const errorMessage = getValidationErrorMessage(newNumber);
            Alert.alert('Invalid Phone Number', errorMessage);
            return;
        }

        // Format to E.164
        const formattedNumber = formatToE164(newNumber);
        if (!formattedNumber) {
            Alert.alert('Error', 'Unable to format phone number. Please check the format.');
            return;
        }

        setIsLoading(true);

        try {
            const success = addBlockedNumber(formattedNumber, newLabel);
            
            if (success) {
                // Auto-report to backend for community intelligence (Anonymous)
                await reportSpam(formattedNumber, newLabel || 'Spam');
                
                // Add to audit log
                await addAuditLogEntry({
                    phoneNumber: formattedNumber,
                    type: 'call',
                    action: 'blocked',
                    label: newLabel || 'Spam',
                });

                setNewNumber('');
                setNewLabel('');
                refreshList();
                
                Alert.alert(
                    'Success', 
                    `Number ${formatForDisplay(formattedNumber)} has been blocked and reported.`
                );
            } else {
                Alert.alert('Error', 'Failed to add number. It might already be in your blocklist.');
            }
        } catch (error) {
            console.error('Error adding number:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = (id: number, phoneNumber: string) => {
        Alert.alert(
            'Confirm Removal', 
            `Remove ${formatForDisplay(phoneNumber)} from blocklist?`, 
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        removeBlockedNumber(id);
                        refreshList();
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Blocked Numbers</Text>
            <Text style={styles.subtitle}>
                Add spam numbers to block them automatically
            </Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Phone Number (e.g., 555-123-4567)"
                    value={newNumber}
                    onChangeText={setNewNumber}
                    keyboardType="phone-pad"
                    editable={!isLoading}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Label (optional, e.g., Telemarketer)"
                    value={newLabel}
                    onChangeText={setNewLabel}
                    editable={!isLoading}
                />
                <Button 
                    title={isLoading ? "Adding..." : "Block & Report"} 
                    onPress={handleAdd}
                    disabled={isLoading}
                />
            </View>

            <FlatList
                data={numbers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.item}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.number}>
                                {formatForDisplay(item.phoneNumber)}
                            </Text>
                            {item.label ? (
                                <Text style={styles.label}>{item.label}</Text>
                            ) : null}
                            <Text style={styles.date}>
                                Added: {new Date(item.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemove(item.id, item.phoneNumber)}
                        >
                            <Text style={styles.removeButtonText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.empty}>No blocked numbers yet.</Text>
                        <Text style={styles.emptySubtext}>
                            Add numbers above to start blocking spam calls
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 20,
        gap: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#f9f9f9',
        marginBottom: 5,
        borderRadius: 8,
    },
    itemInfo: {
        flex: 1,
    },
    number: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    date: {
        fontSize: 12,
        color: '#999',
    },
    removeButton: {
        backgroundColor: '#ff3b30',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
    },
    removeButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    empty: {
        textAlign: 'center',
        fontSize: 16,
        color: '#999',
        marginBottom: 8,
    },
    emptySubtext: {
        textAlign: 'center',
        fontSize: 14,
        color: '#bbb',
    },
});
