import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useSetAtom } from 'jotai';
import { useTheme } from '../src/theme';
import {
  onboardingCompletedAtom,
  gatewayUrlAtom,
  gatewayTokenAtom,
  clientIdAtom,
} from '../src/store';

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const setOnboardingCompleted = useSetAtom(onboardingCompletedAtom);
  const setGatewayUrl = useSetAtom(gatewayUrlAtom);
  const setGatewayToken = useSetAtom(gatewayTokenAtom);
  const setClientId = useSetAtom(clientIdAtom);

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'System';
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to reconfigure your gateway settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            setOnboardingCompleted(false);
            setGatewayUrl('');
            setGatewayToken('');
            setClientId('lumiere-mobile');
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: theme.spacing.lg,
      paddingTop: theme.spacing.xl * 1.5,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    settingItem: {
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingLabel: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    settingValue: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    logoutButton: {
      paddingVertical: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.status.error,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    logoutButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Theme</Text>
            <Text style={styles.settingValue}>{getThemeLabel()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Configuration</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Model</Text>
            <Text style={styles.settingValue}>Claude Sonnet 4.5</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Gateway Status</Text>
            <Text style={styles.settingValue}>Connected</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
