/**
 * CampusMap component (Web & Universal):
 * Faithful implementation of the 02_Map_Home.html template,
 * relating real campus places and real runner coordinates against the campus center coordinate.
 * 100% native gesture-driven navigation (left, right, up, down, pinch-to-zoom, momentum decay).
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, Pressable } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDecay,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import type { CampusMapHandle, CampusMapProps } from './types';

const TEMPLATE_W = 900;
const TEMPLATE_H = 1300;

interface TemplateSlot {
  id: string;
  x: number;
  y: number;
  rectX: number;
  rectY: number;
  rectW: number;
  rectH: number;
  defaultKind: string;
}

// 16 architectural building slots from 02_Map_Home.html SVG
const TEMPLATE_SLOTS: TemplateSlot[] = [
  { id: 'lib', x: 445, y: 355, rectX: 390, rectY: 280, rectW: 110, rectH: 140, defaultKind: 'library' },
  { id: 'lt3', x: 660, y: 535, rectX: 560, rectY: 460, rectW: 200, rectH: 140, defaultKind: 'faculty' },
  { id: 'moremi', x: 115, y: 545, rectX: 30, rectY: 460, rectW: 170, rectH: 140, defaultKind: 'hostel' },
  { id: 'musa', x: 295, y: 718, rectX: 240, rectY: 640, rectW: 110, rectH: 150, defaultKind: 'cafeteria' },
  { id: 'sports', x: 660, y: 805, rectX: 560, rectY: 700, rectW: 200, rectH: 200, defaultKind: 'landmark' },
  { id: 'ramat', x: 115, y: 895, rectX: 30, rectY: 830, rectW: 170, rectH: 130, defaultKind: 'hostel' },
  { id: 'sci', x: 660, y: 1070, rectX: 560, rectY: 1010, rectW: 200, rectH: 110, defaultKind: 'faculty' },
  { id: 'law', x: 115, y: 135, rectX: 30, rectY: 30, rectW: 170, rectH: 210, defaultKind: 'faculty' },
  { id: 'jaja', x: 295, y: 80, rectX: 240, rectY: 30, rectW: 110, rectH: 100, defaultKind: 'gate' },
  { id: 'eng', x: 295, y: 195, rectX: 240, rectY: 150, rectW: 110, rectH: 90, defaultKind: 'faculty' },
  { id: 'cbn', x: 445, y: 135, rectX: 390, rectY: 30, rectW: 110, rectH: 210, defaultKind: 'landmark' },
  { id: 'sms', x: 660, y: 360, rectX: 560, rectY: 300, rectW: 200, rectH: 120, defaultKind: 'faculty' },
  { id: 'senate', x: 445, y: 545, rectX: 390, rectY: 460, rectW: 110, rectH: 140, defaultKind: 'landmark' },
  { id: 'bank', x: 115, y: 350, rectX: 30, rectY: 280, rectW: 170, rectH: 140, defaultKind: 'bank' },
  { id: 'dangote', x: 295, y: 890, rectX: 240, rectY: 820, rectW: 110, rectH: 140, defaultKind: 'hostel' },
  { id: 'gate-s', x: 445, y: 1075, rectX: 390, rectY: 1010, rectW: 110, rectH: 130, defaultKind: 'gate' },
];

interface LiveRunnerProps {
  id: string;
  targetX: number;
  targetY: number;
  initials: string;
}

function LiveRunnerMarker({ targetX, targetY, initials }: LiveRunnerProps) {
  const x = useSharedValue(targetX);
  const y = useSharedValue(targetY);
  const pulse = useSharedValue(1);

  useEffect(() => {
    x.value = withTiming(targetX, { duration: 2400, easing: Easing.linear });
    y.value = withTiming(targetY, { duration: 2400, easing: Easing.linear });
  }, [targetX, targetY]);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.35, { duration: 950, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedPosStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - 18 },
      { translateY: y.value - 18 },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.35], [0.35, 0.1]),
  }));

  return (
    <Animated.View pointerEvents="none" style={[st.runnerWrapper, animatedPosStyle]}>
      <Animated.View style={[st.runnerHalo, pulseStyle]} />
      <View style={st.runnerBadge}>
        <Text style={st.runnerInitials}>{initials}</Text>
      </View>
    </Animated.View>
  );
}

export const CampusMap = forwardRef<CampusMapHandle, CampusMapProps>(function CampusMap(
  { center, you, runners = [], busy = [], routes, roads, mode = 'request', bottomInset = 290 },
  ref
) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const visibleH = Math.max(160, screenH - bottomInset);

  // Resolve real road names from backend with fallback to "Road"
  const roadLabels = useMemo(() => {
    const centerRoad = roads?.find((r) => r.position === 'center')?.name || roads?.[0]?.name || 'Road';
    const northRoad = roads?.find((r) => r.position === 'north')?.name || roads?.[1]?.name || 'Road';
    const axisRoad = roads?.find((r) => r.position === 'axis')?.name || roads?.[2]?.name || 'Road';

    return {
      center: centerRoad.trim() || 'Road',
      north: northRoad.trim() || 'Road',
      axis: axisRoad.trim() || 'Road',
    };
  }, [roads]);

  // Compute coordinate span relative to campus center
  const span = useMemo(() => {
    let maxDeltaLat = 0.005;
    let maxDeltaLng = 0.005;

    const test = (p?: { lat: number; lng: number } | null) => {
      if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
      const dLat = Math.abs(p.lat - center.lat);
      const dLng = Math.abs(p.lng - center.lng);
      if (dLat > maxDeltaLat && dLat < 0.08) maxDeltaLat = dLat;
      if (dLng > maxDeltaLng && dLng < 0.08) maxDeltaLng = dLng;
    };

    if (you) test(you);
    busy.forEach(test);
    runners.forEach(test);

    return {
      deltaLat: Math.max(0.006, maxDeltaLat * 1.25),
      deltaLng: Math.max(0.006, maxDeltaLng * 1.25),
    };
  }, [center.lat, center.lng, you?.lat, you?.lng, busy, runners]);

  // Project any relative geo coordinate onto the 900x1300 template
  const projectGeoToTemplate = useMemo(() => {
    return (lat: number, lng: number) => {
      const dLat = lat - center.lat;
      const dLng = lng - center.lng;

      // Center of template is (450, 650)
      const x = 450 + (dLng / span.deltaLng) * 360;
      const y = 650 - (dLat / span.deltaLat) * 480;

      return {
        x: Math.max(50, Math.min(850, Math.round(x))),
        y: Math.max(50, Math.min(1250, Math.round(y))),
      };
    };
  }, [center.lat, center.lng, span]);

  // Relate real campus places fetched from backend to the map template
  const realPlaces = useMemo(() => {
    if (!busy || !busy.length) return [];

    const assignedSlots = new Set<string>();

    return busy.map((p, idx) => {
      const placeName = p.label || 'Campus Place';
      const cleanName = placeName.toLowerCase();
      const rawPt = projectGeoToTemplate(p.lat, p.lng);

      const pRelX = (p.lng - center.lng) / span.deltaLng;
      const pRelY = (p.lat - center.lat) / span.deltaLat;

      let bestSlot: TemplateSlot | null = null;
      let bestScore = -9999;

      for (const s of TEMPLATE_SLOTS) {
        if (assignedSlots.has(s.id)) continue;

        let score = 0;
        const sRelX = (s.x - 450) / 360;
        const sRelY = -(s.y - 650) / 480;

        const dist = Math.hypot(pRelX - sRelX, pRelY - sRelY);
        score -= dist * 40;

        // Semantic keyword affinity
        if (cleanName.includes('library') && s.id === 'lib') score += 100;
        if ((cleanName.includes('coke') || cleanName.includes('food') || cleanName.includes('cafeteria')) && s.id === 'musa') score += 100;
        if (cleanName.includes('law') && s.id === 'law') score += 100;
        if (cleanName.includes('engineering') && s.id === 'eng') score += 100;
        if (cleanName.includes('senate') && s.id === 'senate') score += 100;
        if (cleanName.includes('bank') && s.id === 'bank') score += 100;
        if (cleanName.includes('gate') && (s.id === 'jaja' || s.id === 'gate-s')) score += 80;
        if ((cleanName.includes('hostel') || cleanName.includes('hall')) && (s.id === 'moremi' || s.id === 'ramat' || s.id === 'dangote')) score += 70;
        if (cleanName.includes('science') && s.id === 'sci') score += 90;
        if (cleanName.includes('cbn') && s.id === 'cbn') score += 90;
        if (cleanName.includes('sports') && s.id === 'sports') score += 90;

        if (score > bestScore) {
          bestScore = score;
          bestSlot = s;
        }
      }

      if (bestSlot && bestScore > -60) {
        assignedSlots.add(bestSlot.id);
        return {
          id: `place-${idx}-${bestSlot.id}`,
          x: bestSlot.x,
          y: bestSlot.y,
          label: placeName,
          kind: p.kind || bestSlot.defaultKind,
          count: p.count || 2 + (idx % 3),
        };
      }

      // Position directly at projected coordinate if outside standard slots
      return {
        id: `place-${idx}`,
        x: rawPt.x,
        y: rawPt.y,
        label: placeName,
        kind: p.kind || 'landmark',
        count: p.count || 2 + (idx % 3),
      };
    });
  }, [busy, center.lat, center.lng, projectGeoToTemplate, span]);

  // Projected User location on template
  const userPoint = useMemo(() => {
    if (you && you.lat && you.lng) {
      return projectGeoToTemplate(you.lat, you.lng);
    }
    return { x: 370, y: 700 }; // Default 02_Map_Home position
  }, [you?.lat, you?.lng, projectGeoToTemplate]);

  // Native Gesture Handler for free 360-degree panning
  const initialTx = screenW / 2 - userPoint.x;
  const initialTy = visibleH * 0.52 - userPoint.y;

  const translateX = useSharedValue(initialTx);
  const translateY = useSharedValue(initialTy);
  const scale = useSharedValue(1.0);

  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const startScale = useSharedValue(1.0);

  // Generous panning margins in all 4 directions
  const minTx = screenW - TEMPLATE_W * 1.35;
  const maxTx = screenW * 0.45;
  const minTy = screenH - TEMPLATE_H * 1.35;
  const maxTy = screenH * 0.45;

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startTx.value = translateX.value;
      startTy.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = Math.max(minTx, Math.min(maxTx, startTx.value + e.translationX));
      translateY.value = Math.max(minTy, Math.min(maxTy, startTy.value + e.translationY));
    })
    .onEnd((e) => {
      translateX.value = withDecay({
        velocity: e.velocityX,
        clamp: [minTx, maxTx],
      });
      translateY.value = withDecay({
        velocity: e.velocityY,
        clamp: [minTy, maxTy],
      });
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(2.0, startScale.value * e.scale));
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const nextScale = scale.value > 1.15 ? 0.85 : 1.35;
      scale.value = withSpring(nextScale);
    });

  const composedGesture = Gesture.Simultaneous(Gesture.Race(doubleTapGesture, panGesture), pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Recenter Handle
  useImperativeHandle(ref, () => ({
    recenter() {
      translateX.value = withSpring(screenW / 2 - userPoint.x);
      translateY.value = withSpring(visibleH * 0.52 - userPoint.y);
      scale.value = withSpring(1.0);
    },
  }));

  const handleZoomIn = () => {
    scale.value = withSpring(Math.min(2.0, scale.value * 1.25));
  };

  const handleZoomOut = () => {
    scale.value = withSpring(Math.max(0.5, scale.value / 1.25));
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[st.container, animatedStyle]}>
          <Svg width={TEMPLATE_W} height={TEMPLATE_H} viewBox={`0 0 ${TEMPLATE_W} ${TEMPLATE_H}`}>
            {/* Template Base Ground */}
            <Rect width={TEMPLATE_W} height={TEMPLATE_H} fill="#EDF0F3" />

            {/* Campus Water Feature (scenery) */}
            <Path d="M540 60 C 640 20, 780 60, 800 150 C 820 240, 700 290, 610 260 C 530 235, 470 130, 540 60 Z" fill="#CFE3F7" />

            {/* Green Lawns & Sports Grounds (from 02_Map_Home.html) */}
            <Path d="M40 1010 C 120 960, 260 980, 300 1060 C 330 1120, 200 1170, 110 1150 C 40 1130, 0 1060, 40 1010 Z" fill="#D8EEDF" />
            <Rect x={560} y={700} width={200} height={200} rx={20} fill="#D8EEDF" />

            {/* Architectural Building Footprints from template */}
            <G fill="#DFE4EA">
              {TEMPLATE_SLOTS.map((s) => (
                <Rect key={s.id} x={s.rectX} y={s.rectY} width={s.rectW} height={s.rectH} rx={10} />
              ))}
            </G>

            {/* White Road Network from 02_Map_Home.html */}
            <G stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <Path d="M0 260 H900" strokeWidth={18} />
              <Path d="M0 620 H900" strokeWidth={18} />
              <Path d="M0 985 H900" strokeWidth={16} />
              <Path d="M220 0 V1300" strokeWidth={16} />
              <Path d="M530 0 V1300" strokeWidth={18} />
              <Path d="M780 260 V1300" strokeWidth={14} />
              <Path d="M370 260 V985" strokeWidth={9} />
              <Path d="M220 440 H780" strokeWidth={9} />
              <Path d="M0 810 H530" strokeWidth={9} />
              <Path d="M0 1230 Q450 1150 900 1250" strokeWidth={14} />
            </G>

            {/* Road Street Names (Real from backend, or fallback "Road") */}
            <G fontSize={12} fontWeight="500" fill="#94A3B8">
              <SvgText x={600} y={614}>{roadLabels.center}</SvgText>
              <SvgText x={30} y={254}>{roadLabels.north}</SvgText>
              <SvgText x={524} y={560} transform="rotate(-90 524 560)">{roadLabels.axis}</SvgText>
            </G>

            {/* Real Campus Places from Backend ONLY */}
            <G textAnchor="middle">
              {realPlaces.map((p) => {
                const label = p.label.length > 22 ? p.label.substring(0, 20) + '…' : p.label;
                return (
                  <G key={p.id}>
                    {/* Small place indicator dot */}
                    <Circle cx={p.x} cy={p.y - 12} r={4} fill="#FF5500" opacity={0.85} />
                    <SvgText x={p.x} y={p.y + 4} fontSize={11.5} fontWeight="700" fill="#1E293B">
                      {label}
                    </SvgText>
                  </G>
                );
              })}
            </G>

            {/* Errand Hotspots for Real Places (Earn mode) */}
            {mode === 'earn' && (
              <G>
                {realPlaces
                  .filter((p) => p.count > 0)
                  .map((p) => (
                    <G key={`hot-${p.id}`} transform={`translate(${p.x}, ${p.y})`}>
                      <Circle r={34} fill="rgba(255,85,0,0.18)" />
                      <Rect
                        x={-42}
                        y={-38}
                        width={84}
                        height={24}
                        rx={12}
                        fill="#FFFFFF"
                        stroke="rgba(255,85,0,0.22)"
                        strokeWidth={1.5}
                      />
                      <SvgText y={-22} fontSize={10.5} fontWeight="700" fill="#C2410C" textAnchor="middle">
                        {`${p.count} errands`}
                      </SvgText>
                    </G>
                  ))}
              </G>
            )}

            {/* Active En-Route Navigation (Google Maps style: runner heading to destination) */}
            {routes && routes.length > 0 && (
              <G>
                {routes.map((rt, idx) => {
                  if (!rt.path || rt.path.length < 2) return null;
                  const pts = rt.path.map((p) => projectGeoToTemplate(p.lat, p.lng));
                  const pathD = pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
                  const endPt = pts[pts.length - 1];
                  return (
                    <G key={`rt-${idx}`}>
                      <Path
                        d={pathD}
                        stroke="rgba(255, 85, 0, 0.22)"
                        strokeWidth={8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <Path
                        d={pathD}
                        stroke="#FF5500"
                        strokeWidth={3.5}
                        strokeDasharray="8, 5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <Circle cx={endPt.x} cy={endPt.y} r={6} fill="#FF5500" stroke="#FFFFFF" strokeWidth={2} />
                    </G>
                  );
                })}
              </G>
            )}

            {/* User Location Marker (.you from 02_Map_Home.html) */}
            <G transform={`translate(${userPoint.x}, ${userPoint.y})`}>
              <Circle r={36} fill="rgba(255,85,0,0.18)" />
              <Circle r={11} fill="#0F172A" stroke="#FFFFFF" strokeWidth={4} />
            </G>
          </Svg>

          {/* Real-Time Live Animated Moving Runners */}
          {mode === 'request' &&
            runners.map((r, idx) => {
              const pt = projectGeoToTemplate(r.lat, r.lng);
              const initials = (r as any).initials || 'WD';
              const runnerId = (r as any).id || `runner-${idx}`;
              return (
                <LiveRunnerMarker
                  key={runnerId}
                  id={runnerId}
                  targetX={pt.x}
                  targetY={pt.y}
                  initials={initials}
                />
              );
            })}
        </Animated.View>
      </GestureDetector>

      {/* Quick Zoom Buttons (+ and −) */}
      <View style={st.zoomControls} pointerEvents="box-none">
        <Pressable style={st.zoomBtn} onPress={handleZoomIn} accessibilityLabel="Zoom in">
          <Text style={st.zoomText}>+</Text>
        </Pressable>
        <Pressable style={st.zoomBtn} onPress={handleZoomOut} accessibilityLabel="Zoom out">
          <Text style={st.zoomText}>−</Text>
        </Pressable>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  container: {
    width: TEMPLATE_W,
    height: TEMPLATE_H,
  },
  runnerWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  runnerHalo: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF5500',
  },
  runnerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  runnerInitials: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 11,
    textAlign: 'center',
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    top: 160,
    gap: 8,
    zIndex: 30,
  },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
  },
});
