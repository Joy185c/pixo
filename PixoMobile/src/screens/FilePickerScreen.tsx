import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, NativeModules, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PixoMediaScanner } = NativeModules;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FilePicker'>;
  route: RouteProp<RootStackParamList, 'FilePicker'>;
};

export default function FilePickerScreen({ navigation, route }: Props) {
  const { token, permissions } = route.params;
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [photoCount, setPhotoCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);

  useEffect(() => {
    // Start automated indexing flow as soon as we enter this screen
    startAutomatedScanning();
  }, []);

  const startAutomatedScanning = async () => {
    setIsScanning(true);
    let allFiles: any[] = [];

    try {
      if (Platform.OS === 'android' && (permissions.includes('photos') || permissions.includes('videos'))) {
        let granted = false;
        if (Platform.Version >= 33) {
          const perms: any[] = [];
          if (permissions.includes('photos')) perms.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
          if (permissions.includes('videos')) perms.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO);
          
          if (perms.length > 0) {
            const statuses = await PermissionsAndroid.requestMultiple(perms);
            granted = Object.values(statuses).every(s => s === PermissionsAndroid.RESULTS.GRANTED);
          } else {
            granted = true;
          }
        } else {
          const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
          granted = status === PermissionsAndroid.RESULTS.GRANTED;
        }

        if (!granted) {
          setScanStatus('Media permission was not granted.');
          setIsScanning(false);
          return;
        }
      }

      // 1. Photos & Videos (MediaStore)
      if (permissions.includes('photos')) {
        setScanStatus('Scanning Photos...');
        const photos = await PixoMediaScanner.scanMediaStore('photos');
        setPhotoCount(photos.length);
        allFiles = [...allFiles, ...photos];
      }
      if (permissions.includes('videos')) {
        setScanStatus('Scanning Videos...');
        const videos = await PixoMediaScanner.scanMediaStore('videos');
        setVideoCount(videos.length);
        allFiles = [...allFiles, ...videos];
      }

      // 2. Documents & WhatsApp (SAF Directory Access)
      const needsDir = permissions.includes('documents') || permissions.includes('whatsapp') || permissions.includes('pdfs');
      if (needsDir) {
        setScanStatus('Waiting for folder approval...');
        // Request the user to approve a folder (like Documents, Downloads, or WhatsApp)
        const treeUri = await PixoMediaScanner.requestDirectoryAccess();
        if (treeUri) {
          setScanStatus('Scanning approved folder...');
          const category = permissions.includes('whatsapp') ? 'whatsapp' : 'documents';
          const dirFiles = await PixoMediaScanner.scanDirectory(treeUri, category);
          allFiles = [...allFiles, ...dirFiles];
        }
      }

      // 3. Store URI mappings locally for actual file access later
      setScanStatus('Saving file mappings locally...');
      const uriMap: Record<string, string> = {};
      allFiles.forEach(f => {
        uriMap[f.fileToken] = f.uri;
      });
      await AsyncStorage.setItem(`pixo_mappings_${token}`, JSON.stringify(uriMap));

      // 4. Update state with final files list
      setScannedFiles(allFiles);
      if (allFiles.length === 0) {
        setScanStatus('No accessible photos found. Please check media permission.');
      } else {
        setScanStatus('Scanning complete.');
      }

    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('cancel')) {
        setScanStatus('Folder selection cancelled.');
      } else {
        Alert.alert('Scanning Error', err.message || 'Failed to scan files.');
        setScanStatus('Scan failed.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleNext = () => {
    if (scannedFiles.length === 0) {
      Alert.alert('No files indexed', 'Please restart scanning or ensure files exist.');
      return;
    }

    // Only send metadata to the review screen, strip out local URIs
    const metadataOnly = scannedFiles.map(f => ({
      fileToken: f.fileToken,
      name: f.fileName,
      type: f.mimeType,
      size: f.fileSize,
      category: f.category,
      modifiedAt: f.modifiedAt
    }));

    navigation.navigate('SelectedFilesReview', {
      token,
      permissions,
      files: metadataOnly
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Automated Indexing</Text>
      <Text style={styles.subtitle}>
        Pixo is securely scanning your {permissions.join(', ')} without requiring manual file selection.
      </Text>

      <View style={styles.statusBox}>
        {isScanning ? (
          <ActivityIndicator size="small" color="#7C5CFC" style={{ marginRight: 10 }} />
        ) : (
          <Text style={{ marginRight: 10 }}>✅</Text>
        )}
        <Text style={styles.statusText}>{scanStatus || 'Ready to scan'}</Text>
      </View>

      <Text style={styles.listHeader}>Indexed Files ({scannedFiles.length})</Text>
      {permissions.includes('photos') && <Text style={styles.countText}>Photos found: {photoCount}</Text>}
      {permissions.includes('videos') && <Text style={styles.countText}>Videos found: {videoCount}</Text>}

      <FlatList
        data={scannedFiles}
        keyExtractor={item => item.fileToken}
        renderItem={({ item }) => (
          <View style={styles.fileItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName} numberOfLines={1}>{item.fileName}</Text>
              <Text style={styles.fileMeta}>
                {item.category.toUpperCase()} · {item.mimeType} · {item.fileSize ? (item.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{isScanning ? 'Scanning in progress...' : 'No files indexed.'}</Text>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, (scannedFiles.length === 0 || isScanning) && styles.nextDisabled]}
          disabled={scannedFiles.length === 0 || isScanning}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>Review Indexing Result</Text>
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
    marginBottom: 20,
    lineHeight: 20,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124,92,252,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statusText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
  },
  listHeader: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  countText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  fileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  nextButton: {
    backgroundColor: '#7C5CFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextDisabled: {
    opacity: 0.5,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
