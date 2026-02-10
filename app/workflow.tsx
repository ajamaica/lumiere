import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { useAtom } from 'jotai'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader, Text } from '../src/components/ui'
import { currentSessionKeyAtom, workflowConfigAtom, WorkflowFile } from '../src/store'
import { useTheme } from '../src/theme'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function WorkflowScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const [currentSessionKey] = useAtom(currentSessionKeyAtom)
  const [workflowConfigs, setWorkflowConfigs] = useAtom(workflowConfigAtom)

  const config = useMemo(
    () => workflowConfigs[currentSessionKey] ?? { enabled: false, files: [] },
    [workflowConfigs, currentSessionKey],
  )
  const isEnabled = config.enabled

  const handleToggleEnabled = useCallback(() => {
    setWorkflowConfigs((prev) => ({
      ...prev,
      [currentSessionKey]: {
        ...config,
        enabled: !config.enabled,
      },
    }))
  }, [config, currentSessionKey, setWorkflowConfigs])

  const handleAddFiles = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      })

      if (result.canceled || result.assets.length === 0) return

      const newFiles: WorkflowFile[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size ?? 0,
        addedAt: Date.now(),
      }))

      setWorkflowConfigs((prev) => ({
        ...prev,
        [currentSessionKey]: {
          ...config,
          enabled: true,
          files: [...config.files, ...newFiles],
        },
      }))
    } catch (err) {
      Alert.alert(t('common.error'), String(err))
    }
  }, [config, currentSessionKey, setWorkflowConfigs, t])

  const handleRemoveFile = useCallback(
    (index: number) => {
      const file = config.files[index]
      Alert.alert(t('workflow.removeFile'), t('workflow.removeFileConfirm', { name: file.name }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const updatedFiles = config.files.filter((_, i) => i !== index)
            setWorkflowConfigs((prev) => ({
              ...prev,
              [currentSessionKey]: {
                ...config,
                files: updatedFiles,
              },
            }))
          },
        },
      ])
    },
    [config, currentSessionKey, setWorkflowConfigs, t],
  )

  const handleClearAll = useCallback(() => {
    Alert.alert(t('workflow.clearAll'), t('workflow.clearAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          setWorkflowConfigs((prev) => ({
            ...prev,
            [currentSessionKey]: {
              enabled: false,
              files: [],
            },
          }))
        },
      },
    ])
  }, [currentSessionKey, setWorkflowConfigs, t])

  const getFileIcon = (mimeType: string): keyof typeof Ionicons.glyphMap => {
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml'))
      return 'document-text'
    if (mimeType.includes('pdf')) return 'document'
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) return 'code-slash'
    return 'document-outline'
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scrollContent: {
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xxxl,
        },
        toggleCard: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: isEnabled ? 2 : 1,
          borderColor: isEnabled ? theme.colors.primary : theme.colors.border,
        },
        toggleIconCircle: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: isEnabled ? theme.colors.primary + '20' : theme.colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        },
        toggleContent: {
          flex: 1,
        },
        statusBadge: {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.borderRadius.sm,
          backgroundColor: isEnabled ? theme.colors.primary + '20' : theme.colors.background,
        },
        infoCard: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        infoRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.md,
        },
        infoIconCircle: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: theme.colors.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
          marginTop: 2,
        },
        sectionHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
          marginTop: theme.spacing.sm,
        },
        fileCard: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        fileIconCircle: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        },
        fileInfo: {
          flex: 1,
        },
        removeButton: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        emptyState: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: theme.spacing.xxxl,
          paddingHorizontal: theme.spacing.xl,
        },
        emptyIconCircle: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: theme.colors.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.lg,
        },
        addButton: {
          marginTop: theme.spacing.md,
        },
      }),
    [theme, isEnabled],
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('workflow.title')} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Toggle card */}
        <TouchableOpacity
          style={styles.toggleCard}
          onPress={handleToggleEnabled}
          activeOpacity={0.7}
          accessibilityRole="switch"
          accessibilityState={{ checked: isEnabled }}
          accessibilityLabel={t('workflow.enableWorkflowMode')}
        >
          <View style={styles.toggleIconCircle}>
            <Ionicons
              name={isEnabled ? 'folder-open' : 'folder-outline'}
              size={24}
              color={isEnabled ? theme.colors.primary : theme.colors.text.secondary}
            />
          </View>
          <View style={styles.toggleContent}>
            <Text
              variant="heading3"
              style={{ color: theme.colors.text.primary, marginBottom: theme.spacing.xs }}
            >
              {t('workflow.enableWorkflowMode')}
            </Text>
            <Text variant="caption" color="secondary">
              {t('workflow.enableDescription')}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Text
              variant="caption"
              style={{
                color: isEnabled ? theme.colors.primary : theme.colors.text.secondary,
                fontWeight: '600',
              }}
            >
              {isEnabled ? t('workflow.on') : t('workflow.off')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ color: theme.colors.text.primary }}>
                {t('workflow.infoDescription')}
              </Text>
            </View>
          </View>
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="shield-checkmark" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="secondary">
                {t('workflow.privacyNote')}
              </Text>
            </View>
          </View>
        </View>

        {/* Files section */}
        <View style={styles.sectionHeader}>
          <Text
            variant="heading3"
            style={{ color: theme.colors.text.primary, textTransform: 'uppercase' }}
          >
            {t('workflow.documents')} ({config.files.length})
          </Text>
          {config.files.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} hitSlop={8}>
              <Text variant="caption" style={{ color: theme.colors.status.error }}>
                {t('workflow.clearAll')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {config.files.length > 0 ? (
          <>
            {config.files.map((file, index) => (
              <View key={`${file.uri}-${index}`} style={styles.fileCard}>
                <View style={styles.fileIconCircle}>
                  <Ionicons
                    name={getFileIcon(file.mimeType)}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.fileInfo}>
                  <Text
                    variant="body"
                    style={{ color: theme.colors.text.primary }}
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {formatFileSize(file.size)} &middot; {file.mimeType.split('/').pop()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFile(index)}
                  accessibilityLabel={t('workflow.removeFile')}
                  accessibilityRole="button"
                >
                  <Ionicons name="close-circle" size={22} color={theme.colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            ))}
            <Button
              title={t('workflow.addDocuments')}
              onPress={handleAddFiles}
              variant="secondary"
              style={styles.addButton}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="documents-outline" size={36} color={theme.colors.primary} />
            </View>
            <Text
              variant="heading3"
              center
              style={{ marginBottom: theme.spacing.sm, color: theme.colors.text.primary }}
            >
              {t('workflow.noDocuments')}
            </Text>
            <Text
              variant="body"
              color="secondary"
              center
              style={{ marginBottom: theme.spacing.lg }}
            >
              {t('workflow.noDocumentsDescription')}
            </Text>
            <Button title={t('workflow.addDocuments')} onPress={handleAddFiles} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
