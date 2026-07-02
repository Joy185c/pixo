import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FilePicker'>;
  route: RouteProp<RootStackParamList, 'FilePicker'>;
};

export default function FilePickerScreen({ navigation, route }: Props) {
  const { token, permissions } = route.params;
  const [selectedFiles, setSelectedFiles] = useState<DocumentPickerResponse[]>([]);

  const pickFiles = async () => {
    try {
      // Build MIME types filter based on selected categories (permissions)
      let pickerTypes: any[] = [];
      
      if (permissions.includes('photos')) pickerTypes.push(DocumentPicker.types.images);
      if (permissions.includes('videos')) pickerTypes.push(DocumentPicker.types.video);
      if (permissions.includes('pdfs')) pickerTypes.push(DocumentPicker.types.pdf);
      
      // If we need documents/whatsapp/all, we default to allFiles if no specific type fits
      if (pickerTypes.length === 0 || permissions.includes('documents') || permissions.includes('whatsapp')) {
        pickerTypes = [DocumentPicker.types.allFiles];
      }

      const results = await DocumentPicker.pick({
        type: pickerTypes,
        allowMultiSelection: true,
      });

      setSelectedFiles(prev => {
        // Prevent duplicates based on name/uri
        const newFiles = [...prev];
        results.forEach(res => {
          if (!newFiles.some(f => f.uri === res.uri)) {
            newFiles.push(res);
          }
        });
        return newFiles;
      });
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        console.error(err);
        Alert.alert('Error', 'Failed to pick files.');
      }
    }
  };

  const removeFile = (uri: string) => {
    setSelectedFiles(prev => prev.filter(f => f.uri !== uri));
  };

  const handleNext = () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No files selected', 'Please select at least one file to continue.');
      return;
    }
    navigation.navigate('SelectedFilesReview', {
      token,
      permissions,
      files: selectedFiles.map(f => ({
        uri: f.uri,
        name: f.name || 'unnamed_file',
        type: f.type || 'application/octet-stream',
        size: f.size || 0,
      }))
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Files</Text>
      <Text style={styles.subtitle}>
        Tap below to browse and select files matching your approved categories: {permissions.join(', ')}.
      </Text>

      <TouchableOpacity style={styles.pickButton} onPress={pickFiles}>
        <Text style={styles.pickButtonText}>📁 Browse Files / Folders</Text>
      </TouchableOpacity>

      <Text style={styles.listHeader}>Selected Files ({selectedFiles.length})</Text>

      <FlatList
        data={selectedFiles}
        keyExtractor={item => item.uri}
        renderItem={({ item }) => (
          <View style={styles.fileItem}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.fileMeta}>
                {item.type || 'Unknown Type'} · {item.size ? (item.size / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeFile(item.uri)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No files selected yet.</Text>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, selectedFiles.length === 0 && styles.nextDisabled]}
          disabled={selectedFiles.length === 0}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>Review Selection</Text>
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
  pickButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 24,
  },
  pickButtonText: {
    color: '#7C5CFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listHeader: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
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
  removeBtn: {
    padding: 8,
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
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
