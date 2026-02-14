import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { DatabaseService } from '../services/database';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const [blockedCount, setBlockedCount] = useState(0);
  const [isProtectionEnabled, setIsProtectionEnabled] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const db = DatabaseService.getInstance();
      await db.initialize();
      const count = await db.getBlockedCount();
      setBlockedCount(count);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleEnableProtection = () => {
    Alert.alert(
      'Enable Call Blocking',
      'To enable spam call blocking:\n\n1. Open Settings app\n2. Go to Phone > Call Blocking & Identification\n3. Enable "Veto"\n\nThis allows Veto to block spam calls using your local blocklist.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ Veto</Text>
        <Text style={styles.subtitle}>Privacy-First Spam Blocker</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsNumber}>{blockedCount}</Text>
        <Text style={styles.statsLabel}>Calls Blocked</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isProtectionEnabled && styles.statusDotActive]} />
          <Text style={styles.statusText}>
            {isProtectionEnabled ? 'Protection Active' : 'Protection Disabled'}
          </Text>
        </View>
        {!isProtectionEnabled && (
          <TouchableOpacity style={styles.enableButton} onPress={handleEnableProtection}>
            <Text style={styles.enableButtonText}>Enable Protection</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('BlockedCalls')}
        >
          <Text style={styles.menuIcon}>📵</Text>
          <Text style={styles.menuText}>Blocked Calls</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Stats')}
        >
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuText}>Statistics</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>Settings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>🔒 Your Privacy Matters</Text>
        <Text style={styles.privacyText}>
          Veto collects ZERO data. All blocking happens on your device. No contact harvesting, no analytics, no data selling.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statsLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
    marginRight: 10,
  },
  statusDotActive: {
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  enableButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  menuArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginLeft: 60,
  },
  privacyCard: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: 15,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  privacyText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
});
