import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { apiClient } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ActiveSession'>;
  route: RouteProp<RootStackParamList, 'ActiveSession'>;
};

export default function ActiveSessionScreen({ navigation, route }: Props) {
  const { session, totalFiles } = route.params;
  const [timeLeft, setTimeLeft] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const expireTime = new Date(session.expires_at).getTime();

    const updateTimer = () => {
      const diff = expireTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        navigation.navigate('Home');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session.expires_at, navigation]);

  useEffect(() => {
    let polling = true;

    const pollDownloads = async () => {
      try {
        const res = await apiClient.get(`/sessions/${session.id}/download-requests`);
        const requests = res.data.requests;
        if (requests && requests.length > 0) {
          const mappingStr = await AsyncStorage.getItem(`pixo_mappings_${session.invite_id}`);
          const mapping = mappingStr ? JSON.parse(mappingStr) : {};

          for (const req of requests) {
            const { id, file_token } = req;
            const uri = mapping[file_token];
            if (!uri) {
              await apiClient.post(`/download-requests/${id}/upload`, { status: 'failed', errorReason: 'File not found on device' });
              continue;
            }

            try {
              const { PixoMediaScanner } = require('react-native').NativeModules;
              const base64Data = await PixoMediaScanner.readFileAsBase64(uri);
              await apiClient.post(`/download-requests/${id}/upload`, { status: 'ready', base64Data });
            } catch (err: any) {
              await apiClient.post(`/download-requests/${id}/upload`, { status: 'failed', errorReason: err.message || 'Failed to read file' });
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
      
      if (polling) {
        setTimeout(pollDownloads, 5000); // poll every 5 seconds
      }
    };

    pollDownloads();

    return () => {
      polling = false;
    };
  }, [session.id, session.invite_id]);

  const handleRevoke = async () => {
    setLoading(true);
    try {
      // Endpoint: PATCH /api/sessions/:sessionId/revoke
      const res = await apiClient.patch(`/sessions/${session.id}/revoke`);
      if (!res.data.error) {
        Alert.alert('Access Revoked', 'Access revoked successfully.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') }
        ]);
        await AsyncStorage.removeItem(`mapping_${session.id}`);
      } else {
        Alert.alert('Error', res.data.error);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to revoke session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topCard}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>● Active Session</Text>
        </View>
        
        <Text style={styles.timer}>{timeLeft}</Text>
        <Text style={styles.timerLabel}>Time remaining for access</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Session ID</Text>
          <Text style={styles.value} numberOfLines={1}>{session.id}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Total Files Shared</Text>
          <Text style={styles.value}>{totalFiles} files</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.revokeButton, loading && { opacity: 0.7 }]} 
        onPress={handleRevoke}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.revokeText}>Revoke Access</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  topCard: {
    alignItems: 'center',
    marginTop: 40,
  },
  statusBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 16,
  },
  statusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  timerLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  value: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '60%',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 14,
  },
  revokeButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  revokeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
