import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetCivicCase } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { IssueMap } from '@/components/IssueMap';
import { ActionButton, CivicCard, Eyebrow, InlineNotice, PriorityBadge, StatusBadge } from '@/components/CivicUI';
import { useColors } from '@/hooks/useColors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CivicCaseDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const query = useGetCivicCase(id ?? '');
  const civicCase = query.data;

  if (authLoading) {
    return <View style={[styles.centered, { backgroundColor: c.background }]}><ActivityIndicator color={c.cyan} /></View>;
  }
  if (!user) return <Redirect href="/login" />;
  if (query.isLoading) {
    return <View style={[styles.centered, { backgroundColor: c.background }]}><ActivityIndicator color={c.cyan} /></View>;
  }
  if (!civicCase) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        <View style={styles.notFound}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { borderColor: c.border, backgroundColor: c.card }]}>
            <Feather name="arrow-left" size={18} color={c.foreground} />
          </Pressable>
          <CivicCard style={styles.errorCard}>
            <Feather name="alert-circle" size={20} color={c.warning} />
            <Text style={[styles.title, { color: c.foreground }]}>Case not found</Text>
            <Text style={[styles.copy, { color: c.mutedForeground }]}>It may have been removed or is currently unavailable.</Text>
            <ActionButton label="Try again" icon="refresh-cw" variant="outline" onPress={() => void query.refetch()} />
          </CivicCard>
        </View>
      </SafeAreaView>
    );
  }

  const created = new Date(civicCase.createdAt);
  const updated = new Date(civicCase.updatedAt);
  const resolved = civicCase.status.toLowerCase().includes('resolved');
  const inProgress = civicCase.status.toLowerCase().includes('progress');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 32 : insets.bottom + 26 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { borderColor: c.border, backgroundColor: c.card }]} accessibilityLabel="Go back">
            <Feather name="arrow-left" size={18} color={c.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Eyebrow>CASE TRACKING</Eyebrow>
            <Text style={[styles.caseNumber, { color: c.cyan }]}>{civicCase.caseNumber}</Text>
          </View>
          <PriorityBadge level={civicCase.priorityLevel} />
        </View>

        <View style={styles.mainTitle}>
          <Text style={[styles.title, { color: c.foreground }]}>{civicCase.title}</Text>
          <View style={styles.statusLine}>
            <StatusBadge status={civicCase.status} />
            <Text style={[styles.updated, { color: c.mutedForeground }]}>
              Updated {updated.toLocaleDateString()}
            </Text>
          </View>
        </View>

        <IssueMap
          cases={[civicCase]}
          center={{ latitude: civicCase.latitude, longitude: civicCase.longitude }}
          height={230}
        />

        <CivicCard style={styles.detailsCard}>
          <DetailLine icon="map-pin" label="Reported location" value={civicCase.address} />
          <DetailLine icon="grid" label="Category" value={civicCase.category} />
          <DetailLine icon="briefcase" label="Assigned department" value={civicCase.department} />
          <DetailLine icon="users" label="Related community reports" value={`${civicCase.reportCount}`} />
          <DetailLine icon="activity" label="Priority score" value={`${civicCase.priorityScore} / 100`} />
        </CivicCard>

        <View style={{ gap: 8 }}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Issue details</Text>
          <Text style={[styles.copy, { color: c.mutedForeground }]}>{civicCase.description}</Text>
        </View>

        <View style={{ gap: 12 }}>
          <View>
            <Eyebrow>CASE ACTIVITY</Eyebrow>
            <Text style={[styles.sectionTitle, { color: c.foreground, marginTop: 5 }]}>Status updates</Text>
          </View>
          <CivicCard style={styles.timeline}>
            <TimelineRow title="Report received" date={created.toLocaleString()} complete color={c.cyan} />
            <TimelineRow
              title="Municipal review"
              date={inProgress || resolved ? 'Status updated by municipal team' : 'Awaiting municipal review'}
              complete={inProgress || resolved}
              color={inProgress || resolved ? c.cyan : c.mutedForeground}
            />
            <TimelineRow
              title="Work completed"
              date={resolved ? `Resolved · ${updated.toLocaleDateString()}` : 'Pending completion'}
              complete={resolved}
              last
              color={resolved ? c.success : c.mutedForeground}
            />
          </CivicCard>
        </View>
        <InlineNotice text="Status details reflect the current prototype case record. Real municipal timelines depend on the assigned department." icon="info" />
        <ActionButton label="Report a similar issue" icon="camera" onPress={() => router.push('/(tabs)/report')} />
        <Text style={[styles.privacy, { color: c.mutedForeground }]}>Nearby maps contain public case information only; reporter identity is not shown.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailLine({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  const c = useColors();
  return (
    <View style={styles.detailLine}>
      <Feather name={icon} size={15} color={c.cyan} />
      <Text style={[styles.detailLabel, { color: c.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: c.foreground }]}>{value}</Text>
    </View>
  );
}

function TimelineRow({
  title,
  date,
  complete,
  last = false,
  color,
}: {
  title: string;
  date: string;
  complete: boolean;
  last?: boolean;
  color: string;
}) {
  const c = useColors();
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { borderColor: color, backgroundColor: complete ? color : c.card }]}>
          {complete ? <Feather name="check" size={9} color={c.primaryForeground} /> : null}
        </View>
        {!last ? <View style={[styles.timelineLine, { backgroundColor: complete ? `${color}80` : c.border }]} /> : null}
      </View>
      <View style={[styles.timelineCopy, last && { paddingBottom: 0 }]}>
        <Text style={[styles.timelineTitle, { color: complete ? c.foreground : c.mutedForeground }]}>{title}</Text>
        <Text style={[styles.timelineDate, { color: c.mutedForeground }]}>{date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 19, paddingTop: 11, gap: 19, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  caseNumber: { fontSize: 13, letterSpacing: 0.8, marginTop: 4, fontFamily: 'Inter_700Bold' },
  mainTitle: { gap: 10 },
  title: { fontSize: 23, lineHeight: 29, fontFamily: 'Inter_700Bold' },
  statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  updated: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  detailsCard: { gap: 15 },
  detailLine: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  detailLabel: { fontSize: 10, flex: 1, fontFamily: 'Inter_500Medium' },
  detailValue: { maxWidth: '58%', textAlign: 'right', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  copy: { fontSize: 12, lineHeight: 19, fontFamily: 'Inter_400Regular' },
  timeline: { paddingTop: 17, paddingBottom: 6 },
  timelineRow: { flexDirection: 'row', gap: 11 },
  timelineRail: { width: 18, alignItems: 'center' },
  timelineDot: { width: 17, height: 17, borderWidth: 1.5, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  timelineLine: { width: 1, height: 31 },
  timelineCopy: { flex: 1, paddingBottom: 14 },
  timelineTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  timelineDate: { fontSize: 10, marginTop: 4, fontFamily: 'Inter_400Regular' },
  privacy: { textAlign: 'center', fontSize: 10, lineHeight: 15, paddingHorizontal: 12, fontFamily: 'Inter_400Regular' },
  notFound: { flex: 1, gap: 20, padding: 20 },
  errorCard: { marginTop: 'auto', marginBottom: 'auto', alignItems: 'flex-start', gap: 11 },
});