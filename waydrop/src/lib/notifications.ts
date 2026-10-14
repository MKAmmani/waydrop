import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';

/**
 * Android remote push notifications via expo-notifications were removed from Expo Go in SDK 53+.
 * They are only supported in Development Builds (or production builds), or on iOS / physical devices.
 */
export function isPushSupported(): boolean {
  if (Platform.OS === 'web') return false;
  const inExpoGo =
    isRunningInExpoGo() ||
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (Platform.OS === 'android' && inExpoGo) {
    return false;
  }
  return true;
}

export async function requestAndRegisterPushToken(
  registerDevice: (token: string, platform: 'ios' | 'android', locale: string) => Promise<unknown>
): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    // Dynamic import ensures expo-notifications is never evaluated in Android Expo Go
    const Notifications = await import('expo-notifications');
    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) return false;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    ).catch(() => null);

    if (token?.data) {
      await registerDevice(token.data, Platform.OS as 'ios' | 'android', 'en-NG').catch(() => {});
      return true;
    }
  } catch (e) {
    console.warn('[notifications] Failed to register push token:', e);
  }

  return false;
}
