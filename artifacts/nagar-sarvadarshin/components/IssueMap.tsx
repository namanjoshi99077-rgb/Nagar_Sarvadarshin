import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { CivicCaseSummary } from '@/components/CivicUI';

export function IssueMap({
  center,
  height = 230,
}: {
  cases: CivicCaseSummary[];
  center?: { latitude: number; longitude: number } | null;
  onSelect?: (item: CivicCaseSummary) => void;
  height?: number;
  draggable?: boolean;
  onMove?: (point: { latitude: number; longitude: number }) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.map, { height, backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.coordinates, { color: c.foreground }]}>
        {center ? `${center.latitude.toFixed(5)} · ${center.longitude.toFixed(5)}` : 'Civic issues map'}
      </Text>
      <Text style={[styles.caption, { color: c.mutedForeground }]}>Map view is available in the mobile app.</Text>
    </View>
  );
}

export const demoMapRegion = { latitude: 30.7415, longitude: 76.7681 };

const styles = StyleSheet.create({
  map: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 7 },
  coordinates: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  caption: { fontSize: 10, fontFamily: 'Inter_400Regular' },
});