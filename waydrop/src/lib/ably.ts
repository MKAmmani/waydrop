import * as Ably from 'ably';
import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/store/session';
import type { HomeData } from '@/api';

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.1.209:8000/api';

let ablyInstance: Ably.Realtime | null = null;

export function getAbly(): Ably.Realtime {
  if (!ablyInstance) {
    ablyInstance = new Ably.Realtime({
      authUrl: `${baseUrl}/realtime/token`,
      authHeaders: {
        Authorization: `Bearer ${getAccessToken() ?? ''}`,
      },
      autoConnect: true,
    });
  }
  return ablyInstance;
}

/**
 * Real-time campus hook (useAblyCampus(siteId))
 * Subscribes to live campus radar and errand updates via Ably WebSockets
 */
export function useAblyCampus(
  siteId?: string | null,
  onRadarUpdate?: (radar: Partial<HomeData>) => void
) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onRadarUpdate);
  callbackRef.current = onRadarUpdate;

  useEffect(() => {
    if (!siteId) return;

    let client: Ably.Realtime | null = null;
    let channel: Ably.RealtimeChannel | null = null;

    try {
      client = getAbly();
      const onStateChange = (stateChange: Ably.ConnectionStateChange) => {
        setConnected(stateChange.current === 'connected');
      };
      client.connection.on(onStateChange);
      if (client.connection.state === 'connected') {
        setConnected(true);
      }

      channel = client.channels.get(`campus:${siteId}:radar`);
      channel.subscribe('radar.update', (message: Ably.Message) => {
        if (message.data && callbackRef.current) {
          callbackRef.current(message.data);
        }
      });
    } catch (err) {
      console.warn('[Ably] subscription error:', err);
    }

    return () => {
      try {
        channel?.unsubscribe();
      } catch {}
    };
  }, [siteId]);

  return { connected };
}
