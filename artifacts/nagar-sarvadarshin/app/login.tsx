import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useLogin, useRegister } from '@workspace/api-client-react';
import { useAuth, type SessionUser } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { ActionButton, CivicCard, Eyebrow, InlineNotice } from '@/components/CivicUI';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const login = useLogin();
  const register = useRegister();
  const [createAccount, setCreateAccount] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('citizen@demo.com');
  const [password, setPassword] = useState('citizen123');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    Keyboard.dismiss();
    setError('');
    try {
      const session = createAccount
        ? await register.mutateAsync({ data: { name: name.trim(), email: email.trim(), password } })
        : await login.mutateAsync({ data: { email: email.trim(), password } });
      await signIn(session.token, session.user as SessionUser);
      router.replace('/(tabs)');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace(/^HTTP \d+ [^:]*:\s*/, '') : 'Sign-in failed. Please try again.');
    }
  };

  const fillDemo = () => {
    setCreateAccount(false);
    setEmail('citizen@demo.com');
    setPassword('citizen123');
    setError('');
  };

  const busy = login.isPending || register.isPending;
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Platform.OS === 'web' ? 67 : insets.top + 14, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandTop}>
          <View style={[styles.logo, { backgroundColor: c.primary }]}>
            <Feather name="map-pin" size={22} color={c.primaryForeground} />
          </View>
          <View>
            <Text style={[styles.brandName, { color: c.foreground }]}>NAGAR SARVADARSHIN</Text>
            <Text style={[styles.brandSub, { color: c.mutedForeground }]}>AI-POWERED CIVIC INTELLIGENCE</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Eyebrow>SEE THE PROBLEM. LOCATE THE IMPACT.</Eyebrow>
          <Text style={[styles.heroTitle, { color: c.foreground }]}>Resolve the city, together.</Text>
          <Text style={[styles.heroBody, { color: c.mutedForeground }]}>
            One problem. One civic case. One coordinated response.
          </Text>
        </View>

        <CivicCard style={styles.pulseCard}>
          <View style={styles.pulseHead}>
            <View>
              <Eyebrow>DEMO CITY PULSE</Eyebrow>
              <Text style={[styles.pulseLabel, { color: c.foreground }]}>A connected city, at a glance</Text>
            </View>
            <View style={[styles.liveDot, { backgroundColor: c.success }]} />
          </View>
          <View style={styles.metrics}>
            {[
              ['12,540', 'Reports'],
              ['8,920', 'Resolved'],
              ['2,340', 'Active'],
            ].map(([number, label]) => (
              <View key={label} style={styles.metric}>
                <Text style={[styles.metricNumber, { color: c.foreground }]}>{number}</Text>
                <Text style={[styles.metricLabel, { color: c.mutedForeground }]}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.demoFootnote, { color: c.mutedForeground }]}>Prototype / demo metrics</Text>
        </CivicCard>

        <View style={styles.formTitle}>
          <Text style={[styles.welcome, { color: c.foreground }]}>{createAccount ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={[styles.formHint, { color: c.mutedForeground }]}>
            {createAccount ? 'Join your neighborhood in improving city services.' : 'Sign in to report and follow civic cases.'}
          </Text>
        </View>

        <View style={[styles.modeSwitch, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Pressable
            onPress={() => setCreateAccount(false)}
            style={[styles.mode, !createAccount && { backgroundColor: c.secondary }]}
          >
            <Text style={[styles.modeText, { color: !createAccount ? c.foreground : c.mutedForeground }]}>Sign in</Text>
          </Pressable>
          <Pressable
            onPress={() => setCreateAccount(true)}
            style={[styles.mode, createAccount && { backgroundColor: c.secondary }]}
          >
            <Text style={[styles.modeText, { color: createAccount ? c.foreground : c.mutedForeground }]}>Create account</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {createAccount ? (
            <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" icon="user" />
          ) : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            icon="mail"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View>
            <Text style={[styles.fieldLabel, { color: c.secondaryForeground }]}>Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Feather name="lock" size={16} color={c.mutedForeground} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={c.mutedForeground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { color: c.foreground }]}
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                testID="login-password"
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={17} color={c.mutedForeground} />
              </Pressable>
            </View>
          </View>
          {error ? <InlineNotice text={error} icon="alert-circle" /> : null}
          <ActionButton label={createAccount ? 'Create account' : 'Sign in'} icon="arrow-right" onPress={() => void submit()} loading={busy} />
          {!createAccount ? (
            <Pressable onPress={fillDemo} style={styles.demoButton} testID="fill-demo-account">
              <Feather name="zap" size={14} color={c.cyan} />
              <Text style={[styles.demoButtonText, { color: c.cyan }]}>Use citizen demo account</Text>
            </Pressable>
          ) : (
            <Text style={[styles.terms, { color: c.mutedForeground }]}>
              By joining, you agree to share issue details with the relevant municipal team.
            </Text>
          )}
        </View>

        <View style={[styles.privacy, { borderColor: c.border }]}>
          <Feather name="shield" size={15} color={c.teal} />
          <Text style={[styles.privacyText, { color: c.mutedForeground }]}>
            Sensitive reports are restricted to authorized personnel. Demo environment.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: keyof typeof Feather.glyphMap;
} & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText' | 'placeholder'>) {
  const c = useColors();
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: c.secondaryForeground }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Feather name={icon} size={16} color={c.mutedForeground} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.mutedForeground}
          style={[styles.input, { color: c.foreground }]}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 22, gap: 21, maxWidth: 520, width: '100%', alignSelf: 'center' },
  brandTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  brandName: { fontSize: 13, letterSpacing: 1.2, fontFamily: 'Inter_700Bold' },
  brandSub: { fontSize: 9, letterSpacing: 1.1, marginTop: 4, fontFamily: 'Inter_600SemiBold' },
  hero: { gap: 8, marginTop: 2 },
  heroTitle: { fontSize: 32, lineHeight: 38, fontFamily: 'Inter_700Bold', maxWidth: 330 },
  heroBody: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', maxWidth: 320 },
  pulseCard: { gap: 17 },
  pulseHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pulseLabel: { fontSize: 14, marginTop: 5, fontFamily: 'Inter_600SemiBold' },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  metrics: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { gap: 4 },
  metricNumber: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  metricLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  demoFootnote: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  formTitle: { gap: 5, marginTop: 1 },
  welcome: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  formHint: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular' },
  modeSwitch: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 4 },
  mode: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  modeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  form: { gap: 15 },
  fieldLabel: { fontSize: 12, marginBottom: 7, fontFamily: 'Inter_600SemiBold' },
  inputWrap: { minHeight: 51, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 },
  input: { flex: 1, fontSize: 14, paddingVertical: 10, fontFamily: 'Inter_400Regular' },
  demoButton: { flexDirection: 'row', alignSelf: 'center', gap: 7, alignItems: 'center', paddingVertical: 8 },
  demoButtonText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  terms: { textAlign: 'center', fontSize: 11, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  privacy: { borderTopWidth: 1, flexDirection: 'row', gap: 9, paddingTop: 16, alignItems: 'center' },
  privacyText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular' },
});