import React from 'react';
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

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
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
          <Stack.Screen name="FilePicker" component={FilePickerScreen} options={{ title: 'Select Files' }} />
          <Stack.Screen name="SelectedFilesReview" component={SelectedFilesReviewScreen} options={{ title: 'Review Selection' }} />
          <Stack.Screen name="ActiveSession" component={ActiveSessionScreen} options={{ title: 'Active Session', headerBackVisible: false }} />
          <Stack.Screen name="AccessHistory" component={AccessHistoryScreen} options={{ title: 'Access History' }} />
          <Stack.Screen name="Error" component={ErrorScreen} options={{ title: 'Error', headerBackVisible: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
