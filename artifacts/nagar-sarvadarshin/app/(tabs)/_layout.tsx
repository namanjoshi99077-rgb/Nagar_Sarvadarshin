import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="report">
        <NativeTabs.Trigger.Icon sf={{ default: 'camera', selected: 'camera.fill' }} />
        <NativeTabs.Trigger.Label>Report</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="nearby">
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} />
        <NativeTabs.Trigger.Label>Nearby</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cases">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' }} />
        <NativeTabs.Trigger.Label>Cases</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const c = useColors();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.cyan,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 10, marginBottom: 2 },
        tabBarStyle: {
          position: 'absolute',
          height: isWeb ? 84 : 64,
          paddingTop: 8,
          backgroundColor: isIOS ? 'transparent' : c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          elevation: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: c.surface }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={size} /> : <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, size }) =>
            isIOS ? <SymbolView name="camera" tintColor={color} size={size} /> : <Feather name="camera" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color, size }) =>
            isIOS ? <SymbolView name="map" tintColor={color} size={size} /> : <Feather name="map" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: 'Cases',
          tabBarIcon: ({ color, size }) =>
            isIOS ? <SymbolView name="square.stack.3d.up" tintColor={color} size={size} /> : <Feather name="layers" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) =>
            isIOS ? <SymbolView name="person.crop.circle" tintColor={color} size={size} /> : <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const c = useColors();
  if (loading) return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center' }}><ActivityIndicator color={c.cyan} /></View>;
  if (!user) return <Redirect href="/login" />;
  return isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />;
}