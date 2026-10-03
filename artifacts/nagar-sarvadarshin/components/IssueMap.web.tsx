import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { CivicCaseSummary } from '@/components/CivicUI';

const DEMO_REGION = { latitude: 30.7415, longitude: 76.7681 };

export function IssueMap({
  cases,
  center,
  onSelect,
  height = 230,
  draggable = false,
  onMove,
}: {
  cases: CivicCaseSummary[];
  center?: { latitude: number; longitude: number } | null;
  onSelect?: (item: CivicCaseSummary) => void;
  height?: number;
  draggable?: boolean;
  onMove?: (point: { latitude: number; longitude: number }) => void;
}) {
  const c = useColors();
  const origin = center ?? DEMO_REGION;

  return (
    <View
      style={[styles.map, { height, backgroundColor: c.surface, borderColor: c.border }]}
      onStartShouldSetResponder={() => draggable}
      onResponderRelease={(event) => {
        if (!draggable || !onMove) return;
        const { locationX, locationY } = event.nativeEvent;
        const width = 360;
        const x = Math.max(0, Math.min(1, locationX / width)) - 0.5;
        const y = Math.max(0, Math.min(1, locationY / height)) - 0.5;
        onMove({ latitude: origin.latitude - y * 0.018, longitude: origin.longitude + x * 0.02 });
      }}
      accessibilityLabel={draggable ? 'Tap the map to adjust the report location' : 'Illustrative map of public civic cases'}
    >
      <View style={[styles.water, { backgroundColor: `${c.cyan}0A` }]} />
      <View style={[styles.park, { backgroundColor: `${c.success}0E`, borderColor: `${c.success}18` }]} />
      <View style={[styles.road, styles.roadA, { backgroundColor: c.background }]} />
      <View style={[styles.road, styles.roadB, { backgroundColor: c.background }]} />
      <View style={[styles.road, styles.roadC, { backgroundColor: c.background }]} />
      <View style={[styles.road, styles.roadD, { backgroundColor: c.background }]} />
      <View style={[styles.road, styles.roadE, { backgroundColor: c.background }]} />
      <View style={[styles.road, styles.roadF, { backgroundColor: c.background }]} />
      <View style={[styles.roadCenter, { backgroundColor: `${c.warning}70` }]} />
      <View style={styles.districtLabelTop}><Text style={[styles.districtLabel, { color: c.mutedForeground }]}>SECTOR 14</Text></View>
      <View style={styles.districtLabelBottom}><Text style={[styles.districtLabel, { color: c.mutedForeground }]}>CENTRAL MARKET</Text></View>

      {cases.map((item, index) => {
        const x = Math.max(7, Math.min(93, 50 + ((item.longitude - origin.longitude) / 0.025) * 45 + (index % 2 ? 2 : -2)));
        const y = Math.max(10, Math.min(88, 48 - ((item.latitude - origin.latitude) / 0.025) * 42 + (index % 2 ? -3 : 3)));
        const pinColor = item.priorityLevel === 'CRITICAL' ? c.critical : item.priorityLevel === 'HIGH' ? c.high : c.warning;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect?.(item)}
            accessibilityLabel={`${item.caseNumber}: ${item.title}`}
            style={[styles.casePin, { left: `${x}%`, top: `${y}%`, backgroundColor: pinColor, borderColor: c.surface }]}
          >
            <Feather name={item.priorityLevel === 'CRITICAL' ? 'alert-triangle' : 'map-pin'} size={12} color={c.background} />
          </Pressable>
        );
      })}
      {center ? (
        <View style={[styles.currentLocation, { left: '50%', top: '50%', borderColor: c.surface, backgroundColor: c.cyan }]}>
          <View style={[styles.currentCenter, { backgroundColor: c.surface }]} />
        </View>
      ) : null}
      <View style={[styles.legend, { backgroundColor: `${c.surface}E8`, borderColor: c.border }]}>
        <View style={[styles.legendDot, { backgroundColor: c.critical }]} />
        <Text style={[styles.legendText, { color: c.secondaryForeground }]}>Critical</Text>
        <View style={[styles.legendDot, { backgroundColor: c.high }]} />
        <Text style={[styles.legendText, { color: c.secondaryForeground }]}>High</Text>
      </View>
      <View style={[styles.mapCredit, { backgroundColor: c.surface }]}>
        <Text style={[styles.creditText, { color: c.mutedForeground }]}>Illustrative preview · map tiles load in the mobile app</Text>
      </View>
    </View>
  );
}

export const demoMapRegion = DEMO_REGION;

const styles = StyleSheet.create({
  map: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  water: { position: 'absolute', width: '55%', height: '28%', left: '-8%', top: '62%', borderRadius: 90, transform: [{ rotate: '-25deg' }] },
  park: { position: 'absolute', width: '31%', height: '27%', right: '8%', top: '10%', borderRadius: 18, borderWidth: 1, transform: [{ rotate: '-12deg' }] },
  road: { position: 'absolute', borderRadius: 7, opacity: 0.92 },
  roadA: { left: '-8%', top: '28%', height: 9, width: '120%', transform: [{ rotate: '-9deg' }] },
  roadB: { left: '-8%', top: '68%', height: 8, width: '120%', transform: [{ rotate: '7deg' }] },
  roadC: { left: '13%', top: '48%', height: 7, width: '91%', transform: [{ rotate: '31deg' }] },
  roadD: { left: '20%', top: '48%', height: 7, width: '91%', transform: [{ rotate: '-42deg' }] },
  roadE: { left: '39%', top: '48%', height: 6, width: '78%', transform: [{ rotate: '72deg' }] },
  roadF: { left: '-15%', top: '50%', height: 7, width: '88%', transform: [{ rotate: '-69deg' }] },
  roadCenter: { position: 'absolute', left: '49.5%', top: '10%', height: '80%', width: 2, transform: [{ rotate: '-4deg' }] },
  districtLabelTop: { position: 'absolute', left: '9%', top: '11%' },
  districtLabelBottom: { position: 'absolute', right: '7%', bottom: '19%' },
  districtLabel: { fontSize: 8, letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  casePin: { position: 'absolute', width: 27, height: 27, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: -13, marginTop: -13 },
  currentLocation: { position: 'absolute', width: 17, height: 17, borderRadius: 9, borderWidth: 3, marginLeft: -8, marginTop: -8, alignItems: 'center', justifyContent: 'center' },
  currentCenter: { width: 4, height: 4, borderRadius: 2 },
  legend: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 5, alignItems: 'center', borderWidth: 1, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10 },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },
  legendText: { fontSize: 8, fontFamily: 'Inter_600SemiBold' },
  mapCredit: { position: 'absolute', bottom: 6, right: 6, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  creditText: { fontSize: 8, fontFamily: 'Inter_400Regular' },
});