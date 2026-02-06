import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { useTheme } from '../../theme'
import { Text } from './Text'

interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

export interface OllamaModelPickerProps {
  label?: string
  value: string
  onValueChange: (value: string) => void
  ollamaUrl: string
  placeholder?: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function OllamaModelPicker({
  label,
  value,
  onValueChange,
  ollamaUrl,
  placeholder = 'llama3.2',
}: OllamaModelPickerProps) {
  const { theme } = useTheme()
  const [models, setModels] = useState<OllamaModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [customInput, setCustomInput] = useState(false)

  const fetchModels = useCallback(async () => {
    if (!ollamaUrl.trim()) {
      setModels([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const host = ollamaUrl.trim().replace(/\/+$/, '')
      const response = await fetch(`${host}/api/tags`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.models && Array.isArray(data.models)) {
        setModels(data.models)
        setCustomInput(false)
      }
    } catch {
      setModels([])
      setError('Could not fetch models')
      setCustomInput(true)
    } finally {
      setLoading(false)
    }
  }, [ollamaUrl])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const selectedLabel = value || placeholder

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.xl,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    trigger: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    triggerText: {
      fontSize: theme.typography.fontSize.base,
      color: value ? theme.colors.text.primary : theme.colors.text.tertiary,
      flex: 1,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    hint: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    menu: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      maxHeight: 400,
      overflow: 'hidden',
    },
    menuHeader: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    menuItem: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    menuItemActive: {
      backgroundColor: theme.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
    },
    menuItemContent: {
      flex: 1,
    },
    menuItemText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    menuItemTextActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    menuItemMeta: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    customOption: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
  })

  // Fallback to text input when models can't be fetched
  if (customInput || error) {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <RNTextInput
          style={styles.input}
          value={value}
          onChangeText={onValueChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={styles.hint}>{error || 'Enter model name manually'}</Text>
          <TouchableOpacity onPress={fetchModels} hitSlop={8}>
            <Text style={[styles.hint, { color: theme.colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.text.secondary} />
            <Text style={[styles.triggerText, { color: theme.colors.text.secondary }]}>
              Loading models...
            </Text>
          </View>
        ) : (
          <Text style={styles.triggerText}>{selectedLabel}</Text>
        )}
        <Ionicons name="chevron-down" size={18} color={theme.colors.text.secondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            <View style={styles.menuHeader}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                Select Model
              </Text>
              <TouchableOpacity onPress={fetchModels} hitSlop={8}>
                <Ionicons name="refresh" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {models.length > 0 ? (
                models.map((m, index) => {
                  const isActive = m.name === value
                  return (
                    <React.Fragment key={m.name}>
                      {index > 0 && <View style={styles.separator} />}
                      <TouchableOpacity
                        style={[styles.menuItem, isActive && styles.menuItemActive]}
                        onPress={() => {
                          onValueChange(m.name)
                          setOpen(false)
                        }}
                      >
                        <View style={styles.menuItemContent}>
                          <Text
                            style={[styles.menuItemText, isActive && styles.menuItemTextActive]}
                          >
                            {m.name}
                          </Text>
                          <Text style={styles.menuItemMeta}>{formatSize(m.size)}</Text>
                        </View>
                        {isActive && (
                          <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    </React.Fragment>
                  )
                })
              ) : (
                <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
                  <Text color="secondary">No models found</Text>
                  <Text style={styles.hint}>Pull a model with: ollama pull llama3.2</Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.customOption}
              onPress={() => {
                setCustomInput(true)
                setOpen(false)
              }}
            >
              <Ionicons name="pencil" size={16} color={theme.colors.text.secondary} />
              <Text color="secondary">Enter manually</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}
