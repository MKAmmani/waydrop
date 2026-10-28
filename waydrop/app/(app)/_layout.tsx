import { useEffect } from 'react';
import { Redirect, Stack, useSegments, router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ShieldWarning } from 'phosphor-react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { IncomingCallOverlay } from '@/components/communication/IncomingCallOverlay';
import { useAblyUser } from '@/lib/ably';
import { useCallNotifications } from '@/lib/callNotifications';
import { useSession, nextOnboardingRoute, isAuthenticated, isAuthorizedRunner } from '@/store/session';
import { useCommunicationStore } from '@/store/communication';
import { useNotificationsStore } from '@/store/notifications';
import type { ApiNotification } from '@/api';
import { color, motion } from '@/theme/tokens';

/**
 * AppLayout — Authentication & Authorization Middleware for (app) routes.
 * Protects /home, /send, /track, /review, /buy-review, /buy-tracking, /finding, and /runner-shopping.
 */
export default function AppLayout() {
  const session = useSession();
  const segments = useSegments();
  const receiveCall = useCommunicationStore((state) => state.receiveCall);
  const clearIncomingCall = useCommunicationStore((state) => state.clearIncomingCall);
  const clearActiveCall = useCommunicationStore((state) => state.clearActiveCall);
  const incrementMessage = useCommunicationStore((state) => state.incrementMessage);
  const pushNotification = useNotificationsStore((state) => state.push);

  // Notification taps + resume-from-background recovery for incoming calls.
  useCallNotifications();

  // Keep one user-level listener alive for every authenticated screen. This is what makes
  // incoming calls and message badges work even when the user is not on the task screen.
  useAblyUser(session.me?.id, (eventName, payload) => {
    if (eventName === 'call.initiated' && payload?.receiver_id === session.me?.id) {
      receiveCall(payload);
      return;
    }

    if (eventName === 'call.ended') {
      clearIncomingCall(payload?.call_session_id);
      clearActiveCall(payload?.call_session_id);
      return;
    }

    if (eventName === 'notification.created') {
      const notification = payload?.notification ?? payload;
      const data = notification?.data;

      // Push every inbound notification into the global store so the home
      // screen can display it in the Notifications panel even when it was
      // received while the user was on another screen (e.g. runner-shopping).
      if (notification?.id) {
        pushNotification(notification as ApiNotification);
      }

      // Message-badge side-effect (existing behaviour).
      if ((notification?.type === 'message' || data?.type === 'chat_message') && data?.task_id) {
        incrementMessage(data.task_id, data?.message_id);
      }
    }
  });

  // Active 4-hour session expiration watchdog timer (MUST run unconditionally before any early returns)
  useEffect(() => {
    if (!session.hydrated || !session.tokens?.expires_at) return;
    const expiresAt = typeof session.tokens.expires_at === 'number'
      ? session.tokens.expires_at
      : new Date(session.tokens.expires_at).getTime();
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      session.signOut().catch(() => {});
      router.replace(session.seenIntro ? '/welcome' : '/intro');
      return;
    }
    const timer = setTimeout(() => {
      session.signOut().catch(() => {});
      router.replace(session.seenIntro ? '/welcome' : '/intro');
    }, remainingMs);
    return () => clearTimeout(timer);
  }, [session.hydrated, session.tokens?.expires_at, session.seenIntro]);

  // 1. Loading state during session hydration
  if (!session.hydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={color.tangerine} />
      </View>
    );
  }

  // 2. Authentication Protection Middleware:
  // If no active auth token or no user, redirect immediately to login / welcome
  if (!isAuthenticated(session)) {
    return <Redirect href={session.seenIntro ? '/welcome' : '/intro'} />;
  }

  // 3. Onboarding Completeness Protection:
  // Ensure the user has completed necessary profile & campus setup
  const nextStep = nextOnboardingRoute(session);
  const currentScreen = segments[segments.length - 1];
  if (nextStep !== '/home' && currentScreen !== 'home') {
    return <Redirect href={nextStep as any} />;
  }

  // 4. Role-Based Authorization Middleware:
  // Protect runner-only routes (e.g. runner-shopping)
  const isRunnerRoute = currentScreen === 'runner-shopping';
  const hasRunnerPrivileges = isAuthorizedRunner(session);

  if (isRunnerRoute && !hasRunnerPrivileges) {
    return (
      <View style={styles.unauthorizedContainer}>
        <ShieldWarning size={64} weight="duotone" color={color.tangerine} />
        <Text variant="h2" style={{ marginTop: 16, textAlign: 'center' }}>
          Runner Verification Required
        </Text>
        <Text variant="body" tone="ink2" style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 24 }}>
          This page is restricted to verified campus runners. Please complete your student ID verification in the menu to accept errands.
        </Text>
        <View style={{ marginTop: 24, width: '100%', maxWidth: 280 }}>
          <Button
            label="Back to Campus Map"
            variant="primary"
            onPress={() => router.replace('/home')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: motion.screenMs,
          contentStyle: { backgroundColor: color.paper },
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="home" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="send" />
        <Stack.Screen name="review" />
        <Stack.Screen name="buy-review" />
        <Stack.Screen name="track" />
        <Stack.Screen name="buy-tracking" />
        <Stack.Screen name="finding" />
        <Stack.Screen name="runner-shopping" />
      </Stack>
      <IncomingCallOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unauthorizedContainer: {
    flex: 1,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
