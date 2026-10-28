import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import { api, type PendingCallInfo } from '@/api';
import { useCommunicationStore } from '@/store/communication';
import { isAuthenticated, isFullyOnboarded, useSession } from '@/store/session';
import { isPushSupported } from './notifications';

const handledResponses = new Set<string>();
const CALL_CHANNEL_ID = 'calls';

type CallPushData = {
  type?: string;
  task_id?: string;
  call_session_id?: string;
  caller_id?: string;
  caller_name?: string;
  receiver_id?: string;
  channel?: string;
  receiver_is_runner?: boolean;
  task_type?: string;
};

function routeForCall(call: { task_id?: string; task_type?: string; receiver_is_runner?: boolean }): string | null {
  if (!call.task_id) return null;
  if (call.task_type === 'buy') {
    return call.receiver_is_runner
      ? `/runner-shopping?id=${call.task_id}`
      : `/buy-tracking?id=${call.task_id}`;
  }
  return `/track?id=${call.task_id}`;
}

function navigateToCall(call: { task_id?: string; task_type?: string; receiver_is_runner?: boolean }) {
  const route = routeForCall(call);
  if (!route) return;
  setTimeout(() => {
    try {
      router.push(route as any);
    } catch {}
  }, 350);
}

async function configureNativeNotifications() {
  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CALL_CHANNEL_ID, {
      name: 'Incoming calls',
      description: 'Waydrop calls from the other errand participant',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      enableVibrate: true,
    });
  }

  return Notifications;
}

export function useCallNotifications() {
  const receiveCall = useCommunicationStore((state) => state.receiveCall);
  const authenticated = useSession((state) => isAuthenticated(state));
  const onboarded = useSession((state) => isFullyOnboarded(state));

  useEffect(() => {
    if (!authenticated) return;

    let cancelled = false;
    let responseSub: { remove: () => void } | null = null;

    const deliverPendingCall = async (fallback?: CallPushData) => {
      let fetched = false;
      try {
        const { call } = await api.getPendingCall();
        fetched = true;
        if (!cancelled && call) {
          receiveCall(call);
          if (onboarded) navigateToCall(call);
        } else if (!cancelled) {
          useCommunicationStore.getState().clearIncomingCall();
        }
      } catch {}

      // Only rebuild from the push payload if the server lookup failed. If the server
      // says there is no pending call, the call was ended/cancelled while we were away.
      if (fetched) return;

      if (!cancelled && fallback?.call_session_id && fallback.task_id) {
        const reconstructed: PendingCallInfo = {
          call_session_id: fallback.call_session_id,
          task_id: fallback.task_id,
          caller_id: fallback.caller_id,
          caller_name: fallback.caller_name,
          receiver_id: fallback.receiver_id,
          channel: fallback.channel ?? '',
          contact_name: fallback.caller_name ?? 'Waydrop User',
          guarantee: 'Encrypted in-app Waydrop call.',
          status: 'connecting',
          mode: 'agora',
          receiver_is_runner: fallback.receiver_is_runner,
          task_type: fallback.task_type,
        };
        receiveCall(reconstructed);
        if (onboarded) navigateToCall(reconstructed);
      }
    };

    if (isPushSupported()) {
      void (async () => {
        try {
          const Notifications = await configureNativeNotifications();

          const handleResponse = (response: {
            notification: { request: { identifier: string; content: { data: Record<string, any> } } };
          }) => {
            const identifier = response.notification.request.identifier;
            if (handledResponses.has(identifier)) return;
            handledResponses.add(identifier);

            const data = (response.notification.request.content.data ?? {}) as CallPushData;
            if (data.type !== 'call_initiated') return;

            void deliverPendingCall(data);
            Notifications.clearLastNotificationResponse();
          };

          if (cancelled) return;

          const lastResponse = Notifications.getLastNotificationResponse();
          if (lastResponse) handleResponse(lastResponse as any);

          const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse as any);
          if (cancelled) subscription.remove();
          else responseSub = subscription;
        } catch (error) {
          console.warn('[calls] notification setup failed:', error);
        }
      })();
    }

    // A call may have started while the app/Ably connection was suspended.
    void deliverPendingCall();

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') void deliverPendingCall();
    };
    const appStateSub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      cancelled = true;
      responseSub?.remove();
      appStateSub.remove();
    };
  }, [authenticated, onboarded, receiveCall]);
}
