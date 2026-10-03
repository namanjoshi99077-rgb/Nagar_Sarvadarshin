import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useGetCivicCases } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { ActionButton, CaseCard, CivicCard, Eyebrow, SectionTitle } from '@/components/CivicUI';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CitizenHome() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const cases = useGetCivicCases();
  const recent = (cases.data ?? []).slice(0, 2);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: c.background }]}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: PlatformBottom(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, { color: c.foreground }]}>NAGAR <Text style={{ color: c.cyan }}>SARVADARSHIN</Text></Text>
            <Text style={[styles.greeting, { color: c.mutedForeground }]}>Good day, {user?.name.split(' ')[0] ?? 'Citizen'}</Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')} style={[styles.iconButton, { backgroundColor: c.card, borderColor: c.border }]} accessibilityLabel="Notifications">
            <Feather name="bell" size={19} color={c.foreground} />
            <View style={[styles.notificationDot, { backgroundColor: c.cyan }]} />
          </Pressable>
        </View>

        <CivicCard style={styles.locationCard}>
          <View style={[styles.pinIcon, { backgroundColor: `${c.cyan}1A` }]}>
            <Feather name="crosshair" size={16} color={c.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.locationTitle, { color: c.foreground }]}>Location is requested when you report</Text>
            <Text style={[styles.locationCaption, { color: c.mutedForeground }]}>Your GPS coordinates stay attached to your report.</Text>
          </View>
          <Feather name="chevron-right" size={17} color={c.mutedForeground} />
        </CivicCard>

        <View style={[styles.reportHero, { backgroundColor: c.secondary, borderColor: c.border }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: c.primary }]}>
              <Feather name="camera" size={21} color={c.primaryForeground} />
            </View>
            <Eyebrow>CAMERA + LIVE GPS</Eyebrow>
          </View>
          <Text style={[styles.reportTitle, { color: c.foreground }]}>See a city issue?</Text>
          <Text style={[styles.reportCopy, { color: c.mutedForeground }]}>
            Capture evidence. We’ll classify it, check for duplicates, and route it to the right team.
          </Text>
          <ActionButton label="Report an issue" icon="arrow-up-right" onPress={() => router.push('/(tabs)/report')} testID="home-report-issue" />
          <View style={styles.flow}>
            {['Capture', 'Locate', 'Resolve'].map((step, index) => (
              <React.Fragment key={step}>
                {index > 0 ? <View style={[styles.flowLine, { backgroundColor: c.border }]} /> : null}
                <Text style={[styles.flowLabel, { color: c.mutedForeground }]}>{step}</Text>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View>
          <SectionTitle title="City pulse" />
          <View style={styles.statRow}>
            {[
              { value: '8,920', label: 'Resolved', color: c.success },
              { value: '2,340', label: 'Active', color: c.cyan },
              { value: '27', label: 'Critical', color: c.critical },
            ].map((item) => (
              <CivicCard key={item.label} style={styles.statCard}>
                <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
                <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{item.label}</Text>
              </CivicCard>
            ))}
          </View>
          <Text style={[styles.metricNote, { color: c.mutedForeground }]}>Prototype / demo metrics</Text>
        </View>

        <View>
          <SectionTitle title="Recent civic cases" action="View all" onAction={() => router.push('/(tabs)/cases')} />
          {cases.isLoading ? (
            <ActivityIndicator color={c.cyan} style={{ padding: 25 }} />
          ) : cases.isError ? (
            <CivicCard style={styles.errorCard}>
              <Feather name="wifi-off" size={18} color={c.warning} />
              <Text style={[styles.errorText, { color: c.mutedForeground }]}>Couldn’t load cases. Pull down to retry.</Text>
            </CivicCard>
          ) : recent.length ? (
            <View style={{ gap: 12 }}>
              {recent.map((item) => (
                <CaseCard key={item.id} civicCase={item} compact onPress={() => router.push(`/cases/${item.id}`)} />
              ))}
            </View>
          ) : (
            <CivicCard style={styles.emptyCard}>
              <Feather name="check-circle" size={21} color={c.success} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No active cases near you</Text>
              <Text style={[styles.locationCaption, { color: c.mutedForeground }]}>Your reports and nearby city issues will appear here.</Text>
            </CivicCard>
          )}
        </View>

        <View style={[styles.oneProblem, { borderColor: c.border }]}>
          <View style={[styles.oneProblemIcon, { backgroundColor: c.secondary }]}>
            <Feather name="git-merge" size={17} color={c.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.oneProblemTitle, { color: c.foreground }]}>One problem. One Civic Case.</Text>
            <Text style={[styles.locationCaption, { color: c.mutedForeground }]}>Similar reports combine into one coordinated response.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlatformBottom(bottom: number) {
  return Platform.OS === 'web' ? 118 : bottom + 94;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 22, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 12, letterSpacing: 1.15, fontFamily: 'Inter_700Bold' },
  greeting: { marginTop: 6, fontSize: 13, fontFamily: 'Inter_400Regular' },
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, right: 10, top: 9 },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  pinIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  locationTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  locationCaption: { fontSize: 11, lineHeight: 16, marginTop: 4, fontFamily: 'Inter_400Regular' },
  reportHero: { borderRadius: 22, borderWidth: 1, padding: 19, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  reportTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', marginTop: 3 },
  reportCopy: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', marginTop: -7 },
  flow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, marginTop: 1 },
  flowLine: { height: 1, flex: 1, maxWidth: 48 },
  flowLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.4 },
  statRow: { flexDirection: 'row', gap: 9 },
  statCard: { flex: 1, padding: 13, gap: 5 },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  metricNote: { fontSize: 10, marginTop: 7, fontFamily: 'Inter_400Regular' },
  errorCard: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  errorText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular' },
  emptyCard: { alignItems: 'flex-start', gap: 7 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  oneProblem: { borderTopWidth: 1, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  oneProblemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  oneProblemTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});