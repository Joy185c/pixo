import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { apiClient } from '../api/client';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ManualInviteCode'>;
};

export default function ManualInviteCodeScreen({ navigation }: Props) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    const cleaned = token.trim().toUpperCase();
    if (!cleaned) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/app/resolve-invite', { token: cleaned });
      if (res.data.valid && res.data.link) {
        navigation.navigate('Permission', { token: cleaned });
      } else {
        Alert.alert('Invalid Link', 'This invite link is invalid or expired.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Could not connect to Pixo server.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Invite Code</Text>
      <Text style={styles.subtitle}>
        The requesting device should show a 6-character code (e.g. PX-K6NCP6).
      </Text>

      <TextInput
        style={styles.input}
        placeholder="PX-XXXXXX"
        placeholderTextColor="#6B7280"
        value={token}
        onChangeText={setToken}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <TouchableOpacity 
        style={[styles.button, !token.trim() && styles.buttonDisabled]} 
        onPress={handleValidate}
        disabled={!token.trim() || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 32,
    lineHeight: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 18,
    padding: 16,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#7C5CFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
