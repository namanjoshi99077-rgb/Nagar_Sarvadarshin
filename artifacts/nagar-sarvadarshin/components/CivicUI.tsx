import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export type CivicCaseSummary = {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  latitude: number;
  longitude: number;
  address: string;
  department: string;
  priorityScore: number;
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  reportCount: number;
  affectedPopulation: number;
  createdAt: string;
  updatedAt: string;
};

type ButtonProps = PressableProps & {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'primary' | 'outline' | 'quiet' | 'danger';
  loading?: boolean;
};

export function ActionButton({
  label,
  icon,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: c.primary },
        variant === 'outline' && { borderColor: c.border, borderWidth: 1, backgroundColor: c.surface },
        variant === 'quiet' && { backgroundColor: c.secondary },
        variant === 'danger' && { backgroundColor: c.destructive },
        (disabled || loading) && { opacity: 0.55 },
        pressed && !(disabled || loading) && styles.pressed,
        style as StyleProp<ViewStyle>,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? c.primaryForeground : c.foreground} />
      ) : icon ? (
        <Feather name={icon} size={17} color={variant === 'primary' ? c.primaryForeground : c.foreground} />
      ) : null}
      <Text style={[styles.buttonLabel, { color: variant === 'primary' ? c.primaryForeground : c.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CivicCard({
  children,
  style,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

export function Eyebrow({ children }: React.PropsWithChildren) {
  const c = useColors();
  return <Text style={[styles.eyebrow, { color: c.cyan }]}>{children}</Text>;
}

export function Heading({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  const c = useColors();
  return (
    <View style={styles.heading}>
      <Text style={[styles.headingText, { color: c.foreground }]}>{children}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: c.mutedForeground }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const c = useColors();
  const resolved = status.toLowerCase().includes('resolved');
  const progress = status.toLowerCase().includes('progress');
  const color = resolved ? c.success : progress ? c.cyan : c.warning;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A`, borderColor: `${color}60` }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

export function PriorityBadge({ level }: { level: CivicCaseSummary['priorityLevel'] }) {
  const c = useColors();
  const color =
    level === 'CRITICAL' ? c.critical : level === 'HIGH' ? c.high : level === 'MEDIUM' ? c.medium : c.low;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A`, borderColor: `${color}60` }]}>
      <Text style={[styles.badgeText, { color }]}>{level}</Text>
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const c = useColors();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionText, { color: c.foreground }]}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: c.cyan, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CaseCard({
  civicCase,
  onPress,
  compact = false,
}: {
  civicCase: CivicCaseSummary;
  onPress: () => void;
  compact?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <CivicCard style={styles.caseCard}>
        <View style={styles.caseTop}>
          <Text style={[styles.caseNumber, { color: c.cyan }]}>{civicCase.caseNumber}</Text>
          <PriorityBadge level={civicCase.priorityLevel} />
        </View>
        <Text style={[styles.caseTitle, { color: c.foreground }]} numberOfLines={2}>
          {civicCase.title}
        </Text>
        {!compact ? (
          <Text style={[styles.caseDescription, { color: c.mutedForeground }]} numberOfLines={2}>
            {civicCase.description}
          </Text>
        ) : null}
        <View style={styles.caseMeta}>
          <Feather name="map-pin" size={13} color={c.mutedForeground} />
          <Text style={[styles.caseMetaText, { color: c.mutedForeground }]} numberOfLines={1}>
            {civicCase.address}
          </Text>
        </View>
        <View style={styles.caseFooter}>
          <StatusBadge status={civicCase.status} />
          <Text style={[styles.caseMetaText, { color: c.mutedForeground }]}>
            {civicCase.reportCount} reports
          </Text>
        </View>
      </CivicCard>
    </Pressable>
  );
}

export function InlineNotice({
  text,
  icon = 'info',
}: {
  text: string;
  icon?: keyof typeof Feather.glyphMap;
}) {
  const c = useColors();
  return (
    <View style={[styles.notice, { backgroundColor: c.secondary, borderColor: c.border }]}>
      <Feather name={icon} size={16} color={c.cyan} />
      <Text style={[styles.noticeText, { color: c.secondaryForeground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 18,
  },
  buttonLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  card: { borderWidth: 1, borderRadius: 18, padding: 16 },
  eyebrow: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.3, textTransform: 'uppercase' },
  heading: { gap: 6 },
  headingText: { fontSize: 26, lineHeight: 32, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  badgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionText: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  caseCard: { gap: 11 },
  caseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caseNumber: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.7 },
  caseTitle: { fontSize: 16, lineHeight: 21, fontFamily: 'Inter_600SemiBold' },
  caseDescription: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular' },
  caseMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  caseMetaText: { fontSize: 12, fontFamily: 'Inter_500Medium', flexShrink: 1 },
  caseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notice: { borderRadius: 14, padding: 13, borderWidth: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: 'Inter_500Medium' },
});