import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useGetMapIssues } from '@workspace/api-client-react';
import type { CivicCaseSummary } from '@/components/CivicUI';
import { CaseCard, CivicCard, Eyebrow, SectionTitle } from '@/components/CivicUI';
import { IssueMap, demoMapRegion } from '@/components/IssueMap';
import { useColors } from '@/hooks/useColors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const FILTERS = ['All', 'Transport', 'Roads', 'Other'];

export default function NearbyScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [filter, setFilter] = useState('All');
  const cases = useGetMapIssues();

  useEffect(() => {
    if (permission?.granted) {
      void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((current) => setPosition({ latitude: current.coords.latitude, longitude: current.coords.longitude }))
        .catch(() => setPosition(null));
    }
  }, [permission?.granted]);

  const visible = useMemo(() => (cases.data ?? []).filter((item) => {
    if (filter === 'All') return true;
    if (filter === 'Transport') return /transport|traffic|bus|parking|pedestrian/i.test(item.category);
    if (filter === 'Roads') return /road|pothole|obstruction/i.test(item.category);
    return !/transport|traffic|bus|parking|pedestrian|road|pothole|obstruction/i.test(item.category);
  }), [cases.data, filter]);

  const openCase = (item: CivicCaseSummary) => router.push(`/cases/${item.id}`);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 118 : insets.bottom + 94 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <View>
            <Eyebrow>LIVE GIS VIEW</Eyebrow>
            <Text style={[styles.title, { color: c.foreground }]}>Nearby issues</Text>
          </View>
          <Pressable
            onPress={() => void requestPermission()}
            style={[styles.locateButton, { backgroundColor: c.secondary, borderColor: c.border }]}
            accessibilityLabel="Use my location"
          >
            <Feather name="crosshair" size={17} color={c.cyan} />
          </Pressable>
        </View>

        <CivicCard style={styles.mapInfo}>
          <Feather name="shield" size={16} color={c.teal} />
          <Text style={[styles.infoText, { color: c.mutedForeground }]}>
            Map markers show public case details only. Citizen names and contact information are never displayed.
          </Text>
        </CivicCard>

        <IssueMap
          cases={visible}
          center={position ?? demoMapRegion}
          onSelect={openCase}
          height={330}
        />
        <Text style={[styles.mapCaption, { color: c.mutedForeground }]}>
          {position ? 'Centered on your current GPS location' : 'Demo map area · allow location to center nearby results'}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filter, { backgroundColor: item === filter ? c.primary : c.secondary, borderColor: item === filter ? c.primary : c.border }]}
            >
              <Text style={[styles.filterText, { color: item === filter ? c.primaryForeground : c.secondaryForeground }]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View>
          <SectionTitle title={`${visible.length} civic cases`} />
          {cases.isLoading ? (
            <ActivityIndicator color={c.cyan} style={{ padding: 25 }} />
          ) : cases.isError ? (
            <CivicCard style={styles.empty}>
              <Feather name="wifi-off" size={19} color={c.warning} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>Map issues couldn’t load</Text>
              <Text style={[styles.infoText, { color: c.mutedForeground }]}>Check your connection and reopen Nearby.</Text>
            </CivicCard>
          ) : visible.length ? (
            <View style={{ gap: 11 }}>
              {visible.map((item) => <CaseCard key={item.id} civicCase={item} onPress={() => openCase(item)} compact />)}
            </View>
          ) : (
            <CivicCard style={styles.empty}>
              <Feather name="check-circle" size={19} color={c.success} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No issues in this filter</Text>
              <Text style={[styles.infoText, { color: c.mutedForeground }]}>Try another category to see more public cases.</Text>
            </CivicCard>
          )}
        </View>

        <CivicCard style={styles.transportCard}>
          <View style={[styles.transportIcon, { backgroundColor: `${c.cyan}1A` }]}>
            <Feather name="truck" size={17} color={c.cyan} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.transportTitle, { color: c.foreground }]}>Transport & mobility</Text>
            <Text style={[styles.infoText, { color: c.mutedForeground }]}>Road hazards, transit access, and safe movement are prioritized.</Text>
          </View>
        </CivicCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 25, marginTop: 6, fontFamily: 'Inter_700Bold' },
  locateButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  mapInfo: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 12 },
  infoText: { flex: 1, fontSize: 11, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  mapCaption: { fontSize: 10, marginTop: -9, fontFamily: 'Inter_400Regular' },
  filters: { gap: 8, paddingRight: 20 },
  filter: { borderRadius: 100, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  filterText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  empty: { alignItems: 'flex-start', gap: 7 },
  emptyTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  transportCard: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  transportIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  transportTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});