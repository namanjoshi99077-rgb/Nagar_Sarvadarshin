import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { ActionButton, CivicCard, Eyebrow, InlineNotice } from '@/components/CivicUI';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      void signOut().then(() => router.replace('/login'));
      return;
    }
    Alert.alert('Sign out?', 'You can sign back in with your account anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut().then(() => router.replace('/login')) },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 118 : insets.bottom + 94 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Eyebrow>YOUR CIVIC PROFILE</Eyebrow>
          <Text style={[styles.title, { color: c.foreground }]}>Profile</Text>
        </View>
        <CivicCard style={styles.userCard}>
          <View style={[styles.avatar, { backgroundColor: c.secondary }]}>
            <Feather name="user" size={23} color={c.cyan} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.name, { color: c.foreground }]}>{user?.name ?? 'Citizen'}</Text>
            <Text style={[styles.email, { color: c.mutedForeground }]}>{user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: `${c.success}1A` }]}>
              <Text style={[styles.roleText, { color: c.success }]}>CITIZEN ACCOUNT</Text>
            </View>
          </View>
        </CivicCard>

        <View style={styles.links}>
          <ProfileLink icon="bell" label="Notifications" detail="Case status updates" onPress={() => router.push('/notifications')} />
          <ProfileLink icon="shield" label="Privacy & protected reporting" detail="How report identity is handled" onPress={() => Alert.alert('Protected reporting', 'Sensitive reports are restricted from normal employee views. Authorized personnel may access identity information when required for case handling.')} />
          <ProfileLink icon="help-circle" label="About this prototype" detail="AI and city pulse values are demonstrations" onPress={() => Alert.alert('Prototype environment', 'Nagar Sarvadarshin uses rule-based prototype intelligence and sample city metrics. Actual AI accuracy and municipal response times are not measured here.')} />
        </View>

        <InlineNotice text="Your name and contact details are not displayed on the nearby issues map. Report evidence is shared with the municipal team assigned to the case." icon="lock" />
        <ActionButton label="Sign out" icon="log-out" variant="outline" onPress={confirmSignOut} style={{ marginTop: 4 }} />
        <Text style={[styles.version, { color: c.mutedForeground }]}>Nagar Sarvadarshin · Demo environment</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileLink({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  detail: string;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={[styles.linkRow, { borderBottomColor: c.border }]}>
      <View style={[styles.linkIcon, { backgroundColor: c.secondary }]}>
        <Feather name={icon} size={17} color={c.cyan} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.linkTitle, { color: c.foreground }]}>{label}</Text>
        <Text style={[styles.linkDetail, { color: c.mutedForeground }]}>{detail}</Text>
      </View>
      <Feather name="chevron-right" size={17} color={c.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { gap: 6 },
  title: { fontSize: 25, fontFamily: 'Inter_700Bold' },
  userCard: { flexDirection: 'row', gap: 13, alignItems: 'center' },
  avatar: { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  email: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  roleBadge: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 4, marginTop: 3 },
  roleText: { fontSize: 9, letterSpacing: 0.6, fontFamily: 'Inter_700Bold' },
  links: { paddingHorizontal: 4 },
  linkRow: { minHeight: 73, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkIcon: { width: 37, height: 37, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  linkTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  linkDetail: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  version: { textAlign: 'center', fontSize: 10, fontFamily: 'Inter_400Regular' },
});