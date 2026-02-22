import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import TabNavigation from './src/components/TabNavigation';
import OnboardingFlow, { isOnboardingComplete } from './src/screens/OnboardingFlow';
import BlockedCallsScreen from './src/screens/BlockedCallsScreen';
import StatsScreen from './src/screens/StatsScreen';
import HomeScreen from './src/screens/HomeScreen';

export type RootStackParamList = {
  Main: undefined;
  Home: undefined;
  BlockedCalls: undefined;
  Stats: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const done = await isOnboardingComplete();
    setOnboardingDone(done);
  };

  // Show a loading spinner while checking AsyncStorage
  if (onboardingDone === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#007AFF" size="large" />
      </View>
    );
  }

  // Show onboarding for first-time users
  if (!onboardingDone) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingFlow onComplete={() => setOnboardingDone(true)} />
      </>
    );
  }

  // Main app with tab navigation + stack for sub-screens
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1C1C1E',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Main"
          component={TabNavigation}
          options={{ headerShown: false }}
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
          name="Home"
          component={HomeScreen}
          options={{ title: 'Veto' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
