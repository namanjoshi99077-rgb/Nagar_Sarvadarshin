import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetCivicCases } from '@workspace/api-client-react';
import { CaseCard, CivicCard, Eyebrow, type CivicCaseSummary } from '@/components/CivicUI';
import { useColors } from '@/hooks/useColors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const FILTERS = ['All', 'Pending', 'In Progress', 'Resolved', 'Reopened'];

export default function CasesScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const cases = useGetCivicCases();
  const items = useMemo(
    () => (cases.data ?? []).filter((item) => {
      if (filter === 'All') return true;
      if (filter === 'Pending') return /pending|approval/i.test(item.status);
      return item.status.toLowerCase().includes(filter.toLowerCase());
    }),
    [cases.data, filter],
  );

  const renderCase = ({ item }: { item: CivicCaseSummary }) => (
    <CaseCard civicCase={item} onPress={() => router.push(`/cases/${item.id}`)} />
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Eyebrow>ONE PROBLEM · ONE CIVIC CASE</Eyebrow>
          <Text style={[styles.title, { color: c.foreground }]}>Civic cases</Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>Follow neighborhood issues and see their latest status.</Text>
        </View>
        <View style={styles.filterWrap}>
          {FILTERS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filter, { backgroundColor: item === filter ? c.primary : c.secondary, borderColor: item === filter ? c.primary : c.border }]}
            >
              <Text style={[styles.filterText, { color: item === filter ? c.primaryForeground : c.secondaryForeground }]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        {cases.isLoading ? (
          <View style={styles.loading}><ActivityIndicator color={c.cyan} /></View>
        ) : cases.isError ? (
          <View style={styles.loading}>
            <CivicCard style={styles.emptyCard}>
              <Feather name="wifi-off" size={20} color={c.warning} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>Cases could not load</Text>
              <Pressable onPress={() => void cases.refetch()}><Text style={{ color: c.cyan, fontFamily: 'Inter_600SemiBold' }}>Try again</Text></Pressable>
            </CivicCard>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderCase}
            contentContainerStyle={[
              styles.list,
              items.length === 0 && styles.listEmpty,
              { paddingBottom: Platform.OS === 'web' ? 112 : insets.bottom + 92 },
            ]}
            ItemSeparatorComponent={() => <View style={{ height: 11 }} />}
            refreshControl={<RefreshControl refreshing={cases.isRefetching} onRefresh={() => void cases.refetch()} tintColor={c.cyan} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <CivicCard style={styles.emptyCard}>
                <Feather name="layers" size={22} color={c.cyan} />
                <Text style={[styles.emptyTitle, { color: c.foreground }]}>No cases in this view</Text>
                <Text style={[styles.subtitle, { color: c.mutedForeground }]}>New reports and linked cases will appear here.</Text>
              </CivicCard>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  header: { gap: 6, marginBottom: 16 },
  title: { fontSize: 25, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 13 },
  filter: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 11, paddingVertical: 8 },
  filterText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingTop: 2 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyCard: { alignItems: 'flex-start', gap: 10, maxWidth: 380, alignSelf: 'center', width: '100%' },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});