/**
 * Web/preview stand-in. react-native-maps doesn't run in a browser, so the web build
 * draws a simple campus-like map with the same markers. Phones use CampusMap.native.tsx.
 */
import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { CampusMapHandle, CampusMapProps } from './types';

export const CampusMap = forwardRef<CampusMapHandle, CampusMapProps>(function CampusMap({ center, you, runners, busy, mode }, ref) {
  useImperativeHandle(ref, () => ({ recenter() {} }));
  // Project lat/lng to a 400x800 canvas around the site centre (about 1.6km tall).
  const W = 400, H = 800, k = 800 / 0.016;
  const px = (p: { lat: number; lng: number }) => ({ x: W / 2 + (p.lng - center.lng) * k, y: H * 0.36 - (p.lat - center.lat) * k });
  const me = you ? px(you) : px(center);
  return (
    <View style={StyleSheet.absoluteFill} accessibilityLabel="Map of your campus (preview)">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect width={W} height={H} fill="#EDF0F3" />
        <Path d="M-20 520 C 80 470, 180 500, 240 560 S 380 640, 440 600 V 820 H -20 Z" fill="#D8EEDF" />
        <G fill="#E2E7ED">
          {[[20, 40, 110, 80], [150, 40, 90, 80], [270, 40, 110, 80], [20, 160, 80, 110], [130, 160, 120, 110], [280, 160, 100, 110], [20, 310, 120, 100], [180, 310, 90, 100], [300, 310, 80, 100], [40, 440, 100, 70], [260, 440, 110, 70]].map(([x, y, w, h], i) => <Rect key={i} x={x} y={y} width={w} height={h} rx={10} />)}
        </G>
        <G stroke="#fff" strokeLinecap="round" fill="none">
          <Path d="M-10 140 H410" strokeWidth={14} /><Path d="M-10 290 H410" strokeWidth={14} /><Path d="M-10 425 H410" strokeWidth={10} />
          <Path d="M120 -10 V810" strokeWidth={12} /><Path d="M265 -10 V810" strokeWidth={12} />
        </G>
        {mode === 'request' && runners.map((r, i) => { const p = px(r); return <G key={i}><Circle cx={p.x} cy={p.y} r={8} fill="#fff" /><Circle cx={p.x} cy={p.y} r={5.5} fill="#0F172A" /></G>; })}
        {mode === 'earn' && busy.map((b, i) => { const p = px(b); return (
          <G key={i}><Circle cx={p.x} cy={p.y} r={40 + b.count * 6} fill="rgba(255,85,0,0.18)" /><Rect x={p.x - 52} y={p.y - 13} width={104} height={26} rx={13} fill="#fff" /><SvgText x={p.x} y={p.y + 4} fontSize={11} fontWeight="700" fill="#C63D00" textAnchor="middle">{`${b.count} errands`}</SvgText></G>
        ); })}
        <Circle cx={me.x} cy={me.y} r={22} fill="rgba(255,85,0,0.18)" />
        <Circle cx={me.x} cy={me.y} r={10} fill="#0F172A" stroke="#fff" strokeWidth={4} />
      </Svg>
    </View>
  );
});
