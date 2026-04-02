import '@/global.css';
import { Stack } from 'expo-router';
import { AppProvider } from '@/src/providers/app-provider';
import { StatusBar } from 'react-native';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar barStyle={'dark-content'} />
      <Stack screenOptions={{ title: 'Tier 1: Front end' }} />
    </AppProvider>
  );
}
