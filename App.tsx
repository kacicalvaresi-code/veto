import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BlockedCallsScreen from './src/screens/BlockedCallsScreen';
import StatsScreen from './src/screens/StatsScreen';
import ProtectionDashboard from './src/screens/ProtectionDashboard';
import AuditLogScreen from './src/screens/AuditLogScreen';
import OnboardingFlow from './src/screens/OnboardingFlow';

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  BlockedCalls: undefined;
  Stats: undefined;
  Dashboard: undefined;
  AuditLog: undefined;
  Onboarding: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Dashboard" 
          component={ProtectionDashboard}
          options={{ title: 'Veto - Protection Dashboard' }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'Veto - Spam Blocker' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen 
          name="BlockedCalls" 
          component={BlockedCallsScreen}
          options={{ title: 'Blocked Calls' }}
        />
        <Stack.Screen 
          name="Stats" 
          component={StatsScreen}
          options={{ title: 'Statistics' }}
        />
        <Stack.Screen 
          name="AuditLog" 
          component={AuditLogScreen}
          options={{ title: 'Audit Log' }}
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingFlow}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
