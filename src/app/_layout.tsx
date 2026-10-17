import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { dhikrStore } from '../features/dhikr/store';
import { locationStore } from '../features/locations/store';
import { initNotificationHandler, notificationStore } from '../features/notifications/scheduler';
import { settingsStore } from '../features/settings/store';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          headerShadowVisible: false,
          headerTransparent: false,
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="location" options={{ title: 'Konum seç', presentation: 'modal' }} />
        <Stack.Screen name="prayer-calendar" options={{ title: 'Vakit takvimi' }} />
        <Stack.Screen name="tesbih" options={{ title: 'Tesbih' }} />
        <Stack.Screen name="qibla" options={{ title: 'Kıble' }} />
        <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
        <Stack.Screen name="sources" options={{ title: 'Kaynaklar ve lisanslar' }} />
        <Stack.Screen name="privacy" options={{ title: 'Gizlilik' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initNotificationHandler();
    Promise.all([settingsStore.hydrate(), locationStore.hydrate(), dhikrStore.hydrate(), notificationStore.hydrate()])
      .catch(() => undefined)
      .finally(() => {
        setReady(true);
        void SplashScreen.hideAsync().catch(() => undefined);
      });
  }, []);

  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
