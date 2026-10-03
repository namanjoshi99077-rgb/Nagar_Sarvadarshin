import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function IndexRoute() {
  const { user, loading } = useAuth();
  const c = useColors();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.cyan} />
      </View>
    );
  }
  return <Redirect href={user ? '/(tabs)' : '/login'} />;
}