import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getBlocklist, BlockedNumber } from '../services/database';

interface Stats {
  totalBlocked: number;
  thisWeek: number;
  thisMonth: number;
  timeSaved: number; // in minutes
  topSpamNumber: string;
  topSpamCount: number;
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day;
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats>({
    totalBlocked: 0,
    thisWeek: 0,
    thisMonth: 0,
    timeSaved: 0,
    topSpamNumber: 'N/A',
    topSpamCount: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const blocklist: BlockedNumber[] = await getBlocklist();

      const weekStart = getWeekStart();
      const monthStart = getMonthStart();

      const totalBlocked = blocklist.length;

      // Count entries added this week and this month based on dateAdded
      let thisWeek = 0;
      let thisMonth = 0;
      const countByNumber: Record<string, number> = {};

      for (const entry of blocklist) {
        const added = new Date(entry.createdAt);
        if (added >= weekStart) thisWeek++;
        if (added >= monthStart) thisMonth++;

        // Tally frequency per number for "top spam" calculation
        const key = entry.phoneNumber;
        countByNumber[key] = (countByNumber[key] || 0) + 1;
      }

      // Find the most frequently blocked number
      let topSpamNumber = 'N/A';
      let topSpamCount = 0;
      for (const [num, count] of Object.entries(countByNumber)) {
        if (count > topSpamCount) {
          topSpamCount = count;
          topSpamNumber = num;
        }
      }

      // Estimate ~2 minutes saved per blocked call
      const timeSaved = totalBlocked * 2;

      setStats({
        totalBlocked,
        thisWeek,
        thisMonth,
        timeSaved,
        topSpamNumber,
        topSpamCount,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatTimeSaved = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
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

      {stats.thisWeek > 0 && (
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>💡 Insight</Text>
          <Text style={styles.insightText}>
            You've blocked {stats.thisWeek} spam {stats.thisWeek === 1 ? 'number' : 'numbers'} this week.
            That's {Math.round((stats.thisWeek / 7) * 10) / 10} per day on average!
          </Text>
        </View>
      )}

      {stats.topSpamNumber !== 'N/A' && (
        <View style={styles.topSpamCard}>
          <Text style={styles.topSpamTitle}>Most Frequent Spam Number</Text>
          <Text style={styles.topSpamNumber}>{stats.topSpamNumber}</Text>
          {stats.topSpamCount > 1 && (
            <Text style={styles.topSpamCount}>Appears {stats.topSpamCount} times in blocklist</Text>
          )}
        </View>
      )}

      <View style={styles.comparisonCard}>
        <Text style={styles.comparisonTitle}>📊 Context</Text>
        <Text style={styles.comparisonText}>
          The average person receives 15 spam calls per month. You have{' '}
          {stats.totalBlocked} {stats.totalBlocked === 1 ? 'number' : 'numbers'} blocked in Veto.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    backgroundColor: '#1C1C1E',
    padding: 30,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#1C1C1E',
    margin: '1.5%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  insightCard: {
    backgroundColor: '#1C1C1E',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  insightText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  topSpamCard: {
    backgroundColor: '#1C1C1E',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  topSpamTitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 10,
  },
  topSpamNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  topSpamCount: {
    fontSize: 14,
    color: '#FF3B30',
  },
  comparisonCard: {
    backgroundColor: '#1C1C1E',
    margin: 20,
    marginTop: 0,
    marginBottom: 30,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  comparisonText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});
