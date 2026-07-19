import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/context/AuthContext';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '800',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="messages/[conversationId]"
          options={{
            title: 'Conversation',
            presentation: 'card',
          }}
        />

        <Stack.Screen
          name="wallet"
          options={{
            title: 'Spark Wallet',
          }}
        />

        <Stack.Screen
          name="profile/edit"
          options={{
            title: 'Edit Profile',
          }}
        />

        <Stack.Screen
          name="safety"
          options={{
            title: 'Safety Center',
          }}
        />

        <Stack.Screen
          name="settings"
          options={{
            title: 'Privacy & Account',
          }}
        />

        <Stack.Screen
          name="privacy"
          options={{
            title: 'Privacy Policy',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}