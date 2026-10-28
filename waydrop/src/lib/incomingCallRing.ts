import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const RING_PATTERN = [0, 900, 450, 900, 450, 900, 1500];

export function useIncomingCallRing(ringing: boolean): void {
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (!ringing) {
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
          shouldPlayInBackground: false,
        });
      } catch {}

      if (cancelled) {
        return;
      }

      try {
        const player = createAudioPlayer(require('../../assets/incoming-call.wav'));
        player.loop = true;
        player.volume = 1;
        player.play();
        playerRef.current = player;
      } catch {}
    };

    void start();

    if (Platform.OS !== 'web') {
      try {
        Vibration.cancel();
        Vibration.vibrate(RING_PATTERN, true);
      } catch {}
    }

    return () => {
      cancelled = true;

      if (Platform.OS !== 'web') {
        try {
          Vibration.cancel();
        } catch {}
      }

      const player = playerRef.current;
      playerRef.current = null;

      if (player) {
        try {
          player.pause();
          player.remove();
        } catch {}
      }

      void setAudioModeAsync({ interruptionMode: 'mixWithOthers' }).catch(() => {});
    };
  }, [ringing]);
}
