import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, UrlTile, type Region } from 'react-native-maps';
import { useColors } from '@/hooks/useColors';
import type { CivicCaseSummary } from '@/components/CivicUI';

const DEMO_REGION: Region = {
  latitude: 30.7415,
  longitude: 76.7681,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

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
  const coordinate = center ?? DEMO_REGION;
  return (
    <View style={[styles.mapWrap, { height, borderColor: c.border }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          latitudeDelta: center ? 0.012 : DEMO_REGION.latitudeDelta,
          longitudeDelta: center ? 0.012 : DEMO_REGION.longitudeDelta,
        }}
        showsCompass
        showsScale
        toolbarEnabled={false}
      >
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        {center ? (
          <Marker
            coordinate={center}
            draggable={draggable}
            pinColor={c.cyan}
            title="Report location"
            description="Drag to adjust the report location"
            onDragEnd={(event) => onMove?.(event.nativeEvent.coordinate)}
          />
        ) : null}
        {cases.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            pinColor={item.priorityLevel === 'CRITICAL' ? '#F17C6B' : item.priorityLevel === 'HIGH' ? '#E59B5B' : '#E7C66D'}
            onPress={() => onSelect?.(item)}
          >
            <Callout onPress={() => onSelect?.(item)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{item.caseNumber} · {item.title}</Text>
                <Text style={styles.calloutCaption}>{item.priorityLevel} · {item.reportCount} related reports</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <View style={[styles.mapCredit, { backgroundColor: c.surface }]}>
        <Text style={[styles.creditText, { color: c.mutedForeground }]}>© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}

export const demoMapRegion = DEMO_REGION;

const styles = StyleSheet.create({
  mapWrap: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  mapCredit: { position: 'absolute', bottom: 6, right: 6, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  creditText: { fontSize: 8, fontFamily: 'Inter_400Regular' },
  callout: { maxWidth: 220, gap: 3, padding: 3 },
  calloutTitle: { color: '#0B1925', fontSize: 12, fontWeight: '700' },
  calloutCaption: { color: '#4A6070', fontSize: 10 },
});