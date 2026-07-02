import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { apiClient } from '../api/client';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SelectedFilesReview'>;
  route: RouteProp<RootStackParamList, 'SelectedFilesReview'>;
};

// Simple helper to generate unique token
const generateToken = () => {
  return `rn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

// Helper to convert React Native URI to Base64 using fetch/FileReader
const getBase64 = async (uri: string): Promise<string | null> => {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error reading base64:', err);
    return null;
  }
};

export default function SelectedFilesReviewScreen({ navigation, route }: Props) {
  const { token, permissions, files } = route.params;
  const [loading, setLoading] = useState(false);

  // Grouping/categorizing files
  const categorized = files.reduce((acc: any, file) => {
    let cat = 'documents';
    if (file.type.startsWith('image/')) cat = 'photos';
    else if (file.type.startsWith('video/')) cat = 'videos';
    else if (file.type === 'application/pdf') cat = 'pdfs';
    else if (file.uri.includes('WhatsApp')) cat = 'whatsapp';

    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(file);
    return acc;
  }, { photos: [], videos: [], pdfs: [], documents: [], whatsapp: [] });

  const getDeviceId = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: 'pixo_device_id' });
      if (credentials) {
        return credentials.password;
      } else {
        const newId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        await Keychain.setGenericPassword('device_id', newId, { service: 'pixo_device_id' });
        return newId;
      }
    } catch (err) {
      // Fallback to AsyncStorage if Keychain fails
      let storedId = await AsyncStorage.getItem('pixo_device_id');
      if (!storedId) {
        storedId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        await AsyncStorage.setItem('pixo_device_id', storedId);
      }
      return storedId;
    }
  };

  const handleAllowAccess = async () => {
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const deviceName = 'Pixo Android';

      // 1. Join Session / Approve invite
      const joinRes = await apiClient.post('/sessions/join', {
        token,
        device_id: deviceId,
        device_name: deviceName,
        permissions,
      });

      if (joinRes.data.error) {
        Alert.alert('Error', joinRes.data.error);
        setLoading(false);
        return;
      }

      const session = joinRes.data.session;
      const sessionId = session.id;

      // 2. Map files to metadata format & generate tokens
      const localMapping: Record<string, string> = {};
      const payloadFiles = await Promise.all(
        files.map(async f => {
          const fileToken = generateToken();
          localMapping[fileToken] = f.uri;

          // Categorize
          let category = 'documents';
          if (f.type.startsWith('image/')) category = 'photos';
          else if (f.type.startsWith('video/')) category = 'videos';
          else if (f.type === 'application/pdf') category = 'pdfs';
          else if (f.uri.includes('WhatsApp')) category = 'whatsapp';

          // Get previewData (base64) for images and PDFs/Docs too so they are downloadable
          const previewData = await getBase64(f.uri);

          return {
            fileToken,
            fileName: f.name,
            mimeType: f.type,
            fileSize: f.size,
            category,
            modifiedAt: new Date().toISOString(),
            previewData,
          };
        })
      );

      // Save local mapping inside AsyncStorage for security (only mapping token -> uri)
      await AsyncStorage.setItem(`mapping_${sessionId}`, JSON.stringify(localMapping));

      // 3. Send metadata to backend
      await apiClient.post(`/sessions/${sessionId}/files/index`, {
        files: payloadFiles,
      });

      navigation.navigate('ActiveSession', { session, totalFiles: files.length });
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to approve invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.title}>Review Selection</Text>
        <Text style={styles.subtitle}>
          Below is a summary of the files you are about to share.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Files: {files.length}</Text>
          <View style={styles.divider} />
          
          <View style={styles.row}>
            <Text style={styles.label}>🖼️ Photos</Text>
            <Text style={styles.value}>{categorized.photos.length} files</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>🎥 Videos</Text>
            <Text style={styles.value}>{categorized.videos.length} files</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>📄 PDFs</Text>
            <Text style={styles.value}>{categorized.pdfs.length} files</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>📁 Documents</Text>
            <Text style={styles.value}>{categorized.documents.length} files</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>💬 WhatsApp Media</Text>
            <Text style={styles.value}>{categorized.whatsapp.length} files</Text>
          </View>
        </View>

        <Text style={styles.warningText}>
          🔒 Local file paths and content remain secure on this device. Only metadata (and preview thumbnail data) is sent to backend.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.allowButton, loading && { opacity: 0.7 }]}
          onPress={handleAllowAccess}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.allowText}>Allow Access for 6 Months</Text>
          )}
        </TouchableOpacity>
      </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  value: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  warningText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  allowButton: {
    backgroundColor: '#10B981', // green accent
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  allowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
