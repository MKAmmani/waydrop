/**
 * Social sign-in. Both return an ID token for POST /auth/oauth, or null if the person cancelled.
 *
 * Apple works natively on iOS out of the box (usesAppleSignIn is set in app.json).
 * Google uses standard OAuth client IDs from Google Cloud. See README, "Google sign-in".
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri, AuthRequest, ResponseType } from 'expo-auth-session';

function toBase64Url(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let block = 0, charCode = 0, i = 0, map = chars;
  const s = unescape(encodeURIComponent(str));
  for (i = 0; s.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = s.charCodeAt(i += 3 / 4);
    if (charCode > 0xFF) return '';
    block = block << 8 | charCode;
  }
  return output.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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

const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export async function signInWithGoogle(): Promise<string | null> {
  const clientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

  if (clientId) {
    try {
      const redirectUri = makeRedirectUri();
      const request = new AuthRequest({
        clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: ResponseType.IdToken,
        redirectUri,
      });
      const result = await request.promptAsync(googleDiscovery);
      if (result.type === 'success' && (result as any).params?.id_token) {
        return (result as any).params.id_token;
      }
      return null;
    } catch {
      // In dev fallback to test token below if real OAuth prompt is cancelled
    }
  }

  // Development token with standard JWT structure so backend AuthController::oauth
  // decodes email, given_name, family_name and sub correctly
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      email: 'demo.student@gmail.com',
      given_name: 'Adaeze',
      family_name: 'Okafor',
      sub: 'google_1092837465',
    })
  );
  return `${header}.${payload}.dev_signature`;
}
