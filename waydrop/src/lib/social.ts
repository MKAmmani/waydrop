/**
 * Social sign-in. Both return an ID token for POST /auth/oauth, or null if the person cancelled.
 *
 * Apple works natively on iOS out of the box (usesAppleSignIn is set in app.json).
 * Google needs OAuth client IDs from Google Cloud. Until they're set, the mock backend
 * accepts a fake token so the flow can be tested end to end. See README, "Google sign-in".
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { usingMock } from '@/api';

export async function signInWithApple(): Promise<string | null> {
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    return cred.identityToken ?? null;
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

export async function signInWithGoogle(): Promise<string | null> {
  if (usingMock) {
    await new Promise((r) => setTimeout(r, 600));
    return 'mock-google-id-token';
  }
  // Real flow: expo-auth-session's Google provider (useIdTokenAuthRequest) lives in a hook,
  // so it's wired in the Welcome screen once client IDs exist. Until then, fail clearly.
  throw new Error('Google sign-in is not configured yet.');
}
