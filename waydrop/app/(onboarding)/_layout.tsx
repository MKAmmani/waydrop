import { Redirect, Stack, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSession, isFullyOnboarded } from '@/store/session';
import { color, motion } from '@/theme/tokens';

/**
 * OnboardingLayout — Middleware protecting onboarding and preventing logged-in users
 * from getting stuck in intro/welcome screens.
 */
export default function OnboardingLayout() {
  const session = useSession();
  const segments = useSegments();

  if (!session.hydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={color.tangerine} />
      </View>
    );
  }

  // If already authenticated and onboarded, redirect away from entry onboarding screens back to /home
  const currentScreen = segments[segments.length - 1];
  const isEntryScreen = currentScreen === 'welcome' || currentScreen === 'intro';
  if (isFullyOnboarded(session) && isEntryScreen) {
    return <Redirect href="/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: motion.screenMs,
        contentStyle: { backgroundColor: color.paper },
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="intro" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="phone" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="location" />
      <Stack.Screen name="area" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="ready" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
