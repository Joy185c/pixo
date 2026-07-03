import React, { ErrorInfo, Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import ManualInviteCodeScreen from './src/screens/ManualInviteCodeScreen';
import PermissionScreen from './src/screens/PermissionScreen';
import FilePickerScreen from './src/screens/FilePickerScreen';
import SelectedFilesReviewScreen from './src/screens/SelectedFilesReviewScreen';
import ActiveSessionScreen from './src/screens/ActiveSessionScreen';
import SplashScreen from './src/screens/SplashScreen';
import AccessHistoryScreen from './src/screens/AccessHistoryScreen';
import ErrorScreen from './src/screens/ErrorScreen';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  ManualInviteCode: undefined;
  Permission: { token: string };
  FilePicker: { token: string; permissions: string[] };
  SelectedFilesReview: { token: string; permissions: string[]; files: any[] };
  ActiveSession: { session: any; totalFiles: number };
  AccessHistory: undefined;
  Error: { errorMsg: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Pixo app loaded but hit a runtime error:</Text>
          <Text style={styles.errorDetails}>{this.state.error?.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Splash"
            screenOptions={{
              headerStyle: { backgroundColor: '#0A0A14' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              contentStyle: { backgroundColor: '#0A0A14' }
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Pixo', headerBackVisible: false }} />
            <Stack.Screen name="ManualInviteCode" component={ManualInviteCodeScreen} options={{ title: 'Enter Invite Code' }} />
            <Stack.Screen name="Permission" component={PermissionScreen} options={{ title: 'Permissions' }} />
            <Stack.Screen name="FilePicker" component={FilePickerScreen} options={{ title: 'Scanning Approved Files' }} />
            <Stack.Screen name="SelectedFilesReview" component={SelectedFilesReviewScreen} options={{ title: 'Review Selection' }} />
            <Stack.Screen name="ActiveSession" component={ActiveSessionScreen} options={{ title: 'Active Session', headerBackVisible: false }} />
            <Stack.Screen name="AccessHistory" component={AccessHistoryScreen} options={{ title: 'Access History' }} />
            <Stack.Screen name="Error" component={ErrorScreen} options={{ title: 'Error', headerBackVisible: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0A0A14',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorDetails: {
    color: '#ff4444',
    fontSize: 14,
  }
});

export default App;
