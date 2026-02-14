import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface Stats {
  totalBlocked: number;
  thisWeek: number;
  thisMonth: number;
  timeSaved: number; // in minutes
  topSpamNumber: string;
}

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats>({
    totalBlocked: 0,
    thisWeek: 0,
    thisMonth: 0,
    timeSaved: 0,
    topSpamNumber: 'N/A',
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    // TODO: Load from database
    // Mock data for now
    setStats({
      totalBlocked: 47,
      thisWeek: 12,
      thisMonth: 34,
      timeSaved: 94, // ~2 minutes per call
      topSpamNumber: '+1 (555) 123-4567',
    });
  };

  const formatTimeSaved = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Protection Stats</Text>
        <Text style={styles.headerSubtitle}>
          See how Veto is protecting you from spam
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalBlocked}</Text>
          <Text style={styles.statLabel}>Total Blocked</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.thisWeek}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.thisMonth}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{formatTimeSaved(stats.timeSaved)}</Text>
          <Text style={styles.statLabel}>Time Saved</Text>
        </View>
      </View>

      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>💡 Insight</Text>
        <Text style={styles.insightText}>
          You've blocked {stats.thisWeek} spam calls this week. That's{' '}
          {Math.round((stats.thisWeek / 7) * 10) / 10} calls per day on average!
        </Text>
      </View>

      <View style={styles.topSpamCard}>
        <Text style={styles.topSpamTitle}>Most Frequent Spam Number</Text>
        <Text style={styles.topSpamNumber}>{stats.topSpamNumber}</Text>
        <Text style={styles.topSpamCount}>Blocked 8 times</Text>
      </View>

      <View style={styles.comparisonCard}>
        <Text style={styles.comparisonTitle}>📊 Comparison</Text>
        <Text style={styles.comparisonText}>
          The average person receives 15 spam calls per month. You're blocking{' '}
          {stats.thisMonth > 15 ? 'more than' : 'about'} average!
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
    backgroundColor: '#007AFF',
    padding: 30,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    margin: '1.5%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  insightCard: {
    backgroundColor: '#FFF3CD',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 15,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  insightText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  topSpamCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topSpamTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  topSpamNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  topSpamCount: {
    fontSize: 14,
    color: '#FF3B30',
  },
  comparisonCard: {
    backgroundColor: '#E8F5E9',
    margin: 20,
    marginTop: 0,
    marginBottom: 30,
    padding: 20,
    borderRadius: 15,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  comparisonText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
});
