import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Permission'>;
  route: RouteProp<RootStackParamList, 'Permission'>;
};

const OPTIONS = [
  { id: 'photos', label: 'Photos', icon: '🖼️' },
  { id: 'videos', label: 'Videos', icon: '🎥' },
  { id: 'pdfs', label: 'PDFs/Documents', icon: '📄' },
  { id: 'whatsapp', label: 'WhatsApp Media/Documents', icon: '💬' }
];

export default function PermissionScreen({ navigation, route }: Props) {
  const { token } = route.params;
  const [selected, setSelected] = useState<string[]>(['photos']);

  const toggleOption = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.warningText}>
          A device wants temporary access to selected files from this phone.
        </Text>
        <Text style={styles.descriptionText}>
          • Only the files/folders you approve will be shared.{"\n"}
          • Chats, calls, contacts, SMS, camera, microphone, and hidden app data are NOT accessible.{"\n"}
          • Access will expire after 6 months.{"\n"}
          • You can revoke anytime.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>What do you want to share?</Text>

      {OPTIONS.map(opt => {
        const isSelected = selected.includes(opt.id);
        return (
          <TouchableOpacity 
            key={opt.id} 
            style={[styles.optionCard, isSelected && styles.optionSelected]}
            onPress={() => toggleOption(opt.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{opt.icon}</Text>
              <Text style={[styles.optionLabel, isSelected && { color: '#fff' }]}>{opt.label}</Text>
            </View>
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]} />
          </TouchableOpacity>
        );
      })}

      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.cancelText}>Deny</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.continueButton, selected.length === 0 && { opacity: 0.5 }]}
          disabled={selected.length === 0}
          onPress={() => navigation.navigate('FilePicker', { token, permissions: selected })}
        >
          <Text style={styles.continueText}>Allow Access</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  warningText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 24,
  },
  descriptionText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 22,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  optionSelected: {
    backgroundColor: 'rgba(124,92,252,0.15)',
    borderColor: '#7C5CFC'
  },
  optionLabel: {
    color: '#D1D5DB',
    fontSize: 16,
    fontWeight: '600'
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4B5563',
  },
  checkboxChecked: {
    backgroundColor: '#7C5CFC',
    borderColor: '#7C5CFC',
  },
  actionContainer: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 40,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  continueButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#7C5CFC',
    alignItems: 'center',
  },
  continueText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
