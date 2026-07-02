import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { apiClient } from '../api/client';

export default function AccessHistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch dashboard metrics / history or list links
        // We can hit getInviteLinks to show invite links and their connection history
        const res = await apiClient.get('/invite-links');
        if (res.data.links) {
          setHistory(res.data.links);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access History</Text>
      <Text style={styles.subtitle}>List of active/expired connection links.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#7C5CFC" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.token}>{item.token}</Text>
                <View style={[styles.badge, item.status === 'active' ? styles.badgeGreen : styles.badgeRed]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                Devices: {item.connected_devices_count}/{item.max_devices}
              </Text>
              <Text style={styles.meta}>
                Expires: {new Date(item.expires_at).toLocaleString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No link history found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  token: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGreen: {
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  badgeRed: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  meta: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
  },
});
