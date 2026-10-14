/**
 * The real map on phones: Google Maps on Android and iOS, styled light and quiet
 * so tangerine routes and pins stand out. Styling uses a JSON style (not a cloud
 * Map ID), which keeps native map loads free.
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { color } from '@/theme/tokens';
import type { CampusMapHandle, CampusMapProps } from './types';
import { MAP_STYLE } from './style';

export const CampusMap = forwardRef<CampusMapHandle, CampusMapProps>(function CampusMap({ center, you, runners, busy, mode, bottomInset = 260, topInset = 120 }, ref) {
  const map = useRef<MapView>(null);
  const region = { latitude: center.lat, longitude: center.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 };
  useImperativeHandle(ref, () => ({
    recenter() {
      const p = you ?? center;
      map.current?.animateToRegion({ latitude: p.lat, longitude: p.lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 600);
    },
  }));
  return (
    <MapView
      ref={map}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFill}
      customMapStyle={MAP_STYLE}
      initialRegion={region}
      mapPadding={{ top: topInset, bottom: bottomInset, left: 0, right: 0 }}
      showsPointsOfInterests={false}
      showsBuildings={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      accessibilityLabel="Map of your campus"
    >
      {mode === 'request' && runners.map((r, i) => (
        <Marker key={`r${i}`} coordinate={{ latitude: r.lat, longitude: r.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={s.runner} />
        </Marker>
      ))}
      {mode === 'earn' && busy.map((b, i) => (
        <Circle key={`b${i}`} center={{ latitude: b.lat, longitude: b.lng }} radius={90 + b.count * 15} fillColor="rgba(255,85,0,0.18)" strokeColor="rgba(255,85,0,0.35)" />
      ))}
      {you && (
        <Marker coordinate={{ latitude: you.lat, longitude: you.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} accessibilityLabel="You are here">
          <View style={s.youHalo}><View style={s.you} /></View>
        </Marker>
      )}
    </MapView>
  );
});

const s = StyleSheet.create({
  runner: { width: 16, height: 16, borderRadius: 8, backgroundColor: color.midnight, borderWidth: 3, borderColor: color.white },
  youHalo: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,85,0,0.18)', alignItems: 'center', justifyContent: 'center' },
  you: { width: 20, height: 20, borderRadius: 10, backgroundColor: color.midnight, borderWidth: 4, borderColor: color.white },
});
