import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useAtom } from 'jotai'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader } from '../src/components/ui'
import { getProviderIcon } from '../src/config/providerOptions'
import { serversAtom } from '../src/store'
import { useTheme } from '../src/theme'

export default function BackupServersScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const [servers] = useAtom(serversAtom)
  const [exporting, setExporting] = useState(false)

  const serversList = Object.values(servers).sort((a, b) => a.createdAt - b.createdAt)

  const handleExport = async () => {
    if (serversList.length === 0) return

    setExporting(true)
    try {
      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        servers: serversList.map(({ id, name, url, clientId, providerType, model, createdAt }) => ({
          id,
          name,
          url,
          clientId,
          providerType,
          model,
          createdAt,
        })),
      }

      const fileName = `lumiere-servers-backup-${new Date().toISOString().slice(0, 10)}.json`
      const filePath = `${FileSystem.cacheDirectory}${fileName}`

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backup, null, 2))

      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: t('backupServers.exportButton'),
        UTI: 'public.json',
      })

      Alert.alert(t('common.success'), t('backupServers.exportSuccess'))
    } catch (error) {
      // User cancelling the share dialog is not an error
      if (String(error).includes('ERR_SHARING_CANCELLED')) return
      Alert.alert(t('common.error'), t('backupServers.exportError'))
    } finally {
      setExporting(false)
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    description: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
      marginBottom: theme.spacing.lg,
    },
    serverCount: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing.md,
    },
    serverCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    serverInfo: {
      flex: 1,
    },
    serverName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold as '600',
      color: theme.colors.text.primary,
    },
    serverUrl: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xxxl,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.md,
    },
    buttonContainer: {
      marginTop: theme.spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('backupServers.title')} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>{t('backupServers.description')}</Text>

        {serversList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="server-outline" size={48} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyText}>{t('backupServers.noServers')}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.serverCount}>
              {t('backupServers.serverCount', { count: serversList.length })}
            </Text>

            {serversList.map((server) => (
              <View key={server.id} style={styles.serverCard}>
                {getProviderIcon(server.providerType || 'molt', theme.colors.text.secondary)}
                <View style={styles.serverInfo}>
                  <Text style={styles.serverName}>{server.name}</Text>
                  <Text style={styles.serverUrl} numberOfLines={1}>
                    {server.url}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.buttonContainer}>
              <Button
                title={t('backupServers.exportButton')}
                onPress={handleExport}
                loading={exporting}
                icon={
                  <Ionicons name="download-outline" size={18} color={theme.colors.text.inverse} />
                }
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
