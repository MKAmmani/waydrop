import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Automatically resolves the backend API base URL.
 *
 * Priority:
 * 1. Explicit production/remote URL (e.g. Cloudflare tunnel, ngrok, https://api.waydrop.ng).
 * 2. Dynamic host IP auto-detected from Metro bundler (works on any Wi-Fi, hotspot, or network).
 * 3. Fallback to EXPO_PUBLIC_API_BASE_URL from .env or localhost.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  // If a public domain or tunnel is explicitly configured, use it directly
  if (envUrl && envUrl !== 'auto' && /^https?:\/\/[a-zA-Z]/.test(envUrl) && !envUrl.includes('localhost')) {
    return envUrl;
  }

  // On Web, use the browser's current hostname (e.g. localhost) to prevent LAN IP timeouts
  if (Platform.OS === 'web') {
    const webHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    return (envUrl && envUrl !== 'auto') ? envUrl : `http://${webHost}:8000/api`;
  }

  // In local development on physical mobile devices, extract host IP from Metro hostUri
  // Example hostUri: "192.168.0.101:8081" or "10.0.0.5:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ??
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:8000/api`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api';
  }

  // Fallback for Web / iOS Simulator / Desktop
  return (envUrl && envUrl !== 'auto') ? envUrl : 'http://localhost:8000/api';
}
