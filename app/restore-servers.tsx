import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { useAtom } from 'jotai'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader } from '../src/components/ui'
import { getProviderIcon } from '../src/config/providerOptions'
import { ProviderType } from '../src/services/providers'
import { ServerConfig, serversAtom } from '../src/store'
import { useTheme } from '../src/theme'

interface BackupData {
  version: number
  exportedAt: string
  servers: ServerConfig[]
}

export default function RestoreServersScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const [servers, setServers] = useAtom(serversAtom)
  const [importedData, setImportedData] = useState<BackupData | null>(null)
  const [importing, setImporting] = useState(false)
  const [mergeMode, setMergeMode] = useState<'merge' | 'replace'>('merge')

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      const file = result.assets[0]
      const content = await FileSystem.readAsStringAsync(file.uri)
      const data = JSON.parse(content) as BackupData

      if (!data.version || !Array.isArray(data.servers)) {
        Alert.alert(t('common.error'), t('restoreServers.invalidFile'))
        return
      }

      // Validate each server has required fields
      const validServers = data.servers.filter(
        (s) => s.id && s.name && s.url && s.providerType && s.createdAt,
      )

      if (validServers.length === 0) {
        Alert.alert(t('common.error'), t('restoreServers.invalidFile'))
        return
      }

      setImportedData({ ...data, servers: validServers })
    } catch {
      Alert.alert(t('common.error'), t('restoreServers.invalidFile'))
    }
  }

  const handleImport = () => {
    if (!importedData) return

    Alert.alert(
      t('common.confirm'),
      t('restoreServers.serversFound', { count: importedData.servers.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('restoreServers.importButton'),
          onPress: () => performImport(),
        },
      ],
    )
  }

  const performImport = () => {
    if (!importedData) return

    setImporting(true)
    try {
      if (mergeMode === 'replace') {
        const newServers: Record<string, ServerConfig> = {}
        for (const server of importedData.servers) {
          newServers[server.id] = server
        }
        setServers(newServers)
      } else {
        const merged = { ...servers }
        for (const server of importedData.servers) {
          if (!merged[server.id]) {
            merged[server.id] = server
          }
        }
        setServers(merged)
      }

      Alert.alert(t('common.success'), t('restoreServers.importSuccess'))
      setImportedData(null)
    } catch {
      Alert.alert(t('common.error'), t('restoreServers.importError'))
    } finally {
      setImporting(false)
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
    selectButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    selectButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold as '600',
    },
    previewSection: {
      marginTop: theme.spacing.xl,
    },
    previewHeader: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold as '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
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
    modeContainer: {
      marginTop: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    modeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modeOptionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '14',
    },
    modeText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      flex: 1,
    },
    buttonContainer: {
      marginTop: theme.spacing.lg,
    },
    noFileText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('restoreServers.title')} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>{t('restoreServers.description')}</Text>

        <TouchableOpacity
          style={styles.selectButton}
          onPress={handleSelectFile}
          activeOpacity={0.7}
        >
          <Ionicons name="document-outline" size={32} color={theme.colors.primary} />
          <Text style={styles.selectButtonText}>{t('restoreServers.selectFile')}</Text>
        </TouchableOpacity>

        {!importedData && <Text style={styles.noFileText}>{t('restoreServers.noFile')}</Text>}

        {importedData && (
          <View style={styles.previewSection}>
            <Text style={styles.previewHeader}>{t('restoreServers.preview')}</Text>
            <Text style={styles.serverCount}>
              {t('restoreServers.serversFound', { count: importedData.servers.length })}
            </Text>

            {importedData.servers.map((server) => (
              <View key={server.id} style={styles.serverCard}>
                {getProviderIcon(
                  (server.providerType as ProviderType) || 'molt',
                  theme.colors.text.secondary,
                )}
                <View style={styles.serverInfo}>
                  <Text style={styles.serverName}>{server.name}</Text>
                  <Text style={styles.serverUrl} numberOfLines={1}>
                    {server.url}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.modeContainer}>
              <TouchableOpacity
                style={[styles.modeOption, mergeMode === 'merge' && styles.modeOptionActive]}
                onPress={() => setMergeMode('merge')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={mergeMode === 'merge' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={mergeMode === 'merge' ? theme.colors.primary : theme.colors.text.tertiary}
                />
                <Text style={styles.modeText}>{t('restoreServers.mergeWithExisting')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeOption, mergeMode === 'replace' && styles.modeOptionActive]}
                onPress={() => setMergeMode('replace')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={mergeMode === 'replace' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={
                    mergeMode === 'replace' ? theme.colors.primary : theme.colors.text.tertiary
                  }
                />
                <Text style={styles.modeText}>{t('restoreServers.replaceExisting')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title={t('restoreServers.importButton')}
                onPress={handleImport}
                loading={importing}
                icon={<Ionicons name="push-outline" size={18} color={theme.colors.text.inverse} />}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
