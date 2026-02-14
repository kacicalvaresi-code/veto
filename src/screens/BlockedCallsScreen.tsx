import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';

interface BlockedCall {
  id: string;
  phoneNumber: string;
  timestamp: Date;
  reason: string;
}

export default function BlockedCallsScreen() {
  const [blockedCalls, setBlockedCalls] = useState<BlockedCall[]>([]);

  useEffect(() => {
    loadBlockedCalls();
  }, []);

  const loadBlockedCalls = async () => {
    // TODO: Load from database
    // Mock data for now
    const mockData: BlockedCall[] = [
      {
        id: '1',
        phoneNumber: '+1 (555) 123-4567',
        timestamp: new Date(),
        reason: 'Known spam number',
      },
      {
        id: '2',
        phoneNumber: '+1 (555) 987-6543',
        timestamp: new Date(Date.now() - 3600000),
        reason: 'Blocked by user',
      },
    ];
    setBlockedCalls(mockData);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleUnblock = (call: BlockedCall) => {
    Alert.alert(
      'Unblock Number',
      `Remove ${call.phoneNumber} from your blocklist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            // TODO: Implement unblock
            setBlockedCalls(prev => prev.filter(c => c.id !== call.id));
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: BlockedCall }) => (
    <View style={styles.callItem}>
      <View style={styles.callInfo}>
        <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
        <Text style={styles.reason}>{item.reason}</Text>
        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(item)}
      >
        <Text style={styles.unblockText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {blockedCalls.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No Blocked Calls</Text>
          <Text style={styles.emptyText}>
            You haven't blocked any spam calls yet. When you do, they'll appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedCalls}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    padding: 20,
  },
  callItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  callInfo: {
    flex: 1,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  reason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  unblockButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unblockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
