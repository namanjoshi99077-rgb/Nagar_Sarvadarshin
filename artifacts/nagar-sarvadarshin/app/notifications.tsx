import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetNotificationsQueryKey,
  useGetNotifications,
  useMarkNotificationRead,
} from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { ActionButton, CivicCard, Eyebrow } from '@/components/CivicUI';
import { useColors } from '@/hooks/useColors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const query = useGetNotifications();
  const markRead = useMarkNotificationRead();
  const notifications = query.data ?? [];
  const unread = notifications.filter((item) => !item.isRead);

  if (authLoading) return <View style={[styles.centered, { backgroundColor: c.background }]}><ActivityIndicator color={c.cyan} /></View>;
  if (!user) return <Redirect href="/login" />;

  const markOneRead = async (id: string) => {
    try {
      await markRead.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
    } catch {
      // Keep the item visible as unread; a later retry can update it.
    }
  };

  const markAllRead = async () => {
    for (const item of unread) {
      await markOneRead(item.id);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { borderColor: c.border, backgroundColor: c.card }]}>
            <Feather name="arrow-left" size={18} color={c.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Eyebrow>YOUR CASE ACTIVITY</Eyebrow>
            <Text style={[styles.title, { color: c.foreground }]}>Notifications</Text>
          </View>
          {unread.length ? (
            <Pressable onPress={() => void markAllRead()} disabled={markRead.isPending} hitSlop={8}>
              <Text style={[styles.markAll, { color: c.cyan }]}>Mark all read</Text>
            </Pressable>
          ) : null}
        </View>

        {query.isLoading ? (
          <View style={styles.centered}><ActivityIndicator color={c.cyan} /></View>
        ) : query.isError ? (
          <View style={styles.centered}>
            <CivicCard style={styles.empty}>
              <Feather name="wifi-off" size={20} color={c.warning} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>Notifications couldn’t load</Text>
              <ActionButton label="Try again" icon="refresh-cw" variant="outline" onPress={() => void query.refetch()} />
            </CivicCard>
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 30 : insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
            {notifications.length ? notifications.map((item) => (
              <Pressable key={item.id} onPress={() => !item.isRead && void markOneRead(item.id)}>
                <CivicCard style={[styles.notification, !item.isRead && { borderColor: `${c.cyan}70` }]}>
                  <View style={[styles.icon, { backgroundColor: item.isRead ? c.secondary : `${c.cyan}1A` }]}>
                    <Feather name={item.type === 'case_update' ? 'activity' : 'bell'} size={17} color={item.isRead ? c.mutedForeground : c.cyan} />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={styles.notificationTitleLine}>
                      <Text style={[styles.notificationTitle, { color: c.foreground }]}>{item.title}</Text>
                      {!item.isRead ? <View style={[styles.unreadDot, { backgroundColor: c.cyan }]} /> : null}
                    </View>
                    <Text style={[styles.message, { color: c.mutedForeground }]}>{item.message}</Text>
                    <Text style={[styles.date, { color: c.mutedForeground }]}>{new Date(item.createdAt).toLocaleString()}</Text>
                  </View>
                </CivicCard>
              </Pressable>
            )) : (
              <CivicCard style={styles.empty}>
                <Feather name="bell-off" size={22} color={c.cyan} />
                <Text style={[styles.emptyTitle, { color: c.foreground }]}>You’re all caught up</Text>
                <Text style={[styles.message, { color: c.mutedForeground }]}>Updates about your civic cases will appear here.</Text>
              </CivicCard>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 18, paddingTop: 11 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 17 },
  backButton: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 23, marginTop: 4, fontFamily: 'Inter_700Bold' },
  markAll: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  list: { gap: 10 },
  notification: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  icon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notificationTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  notificationTitle: { flex: 1, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  message: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  date: { fontSize: 9, fontFamily: 'Inter_500Medium' },
  empty: { alignItems: 'flex-start', gap: 12, width: '100%' },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});