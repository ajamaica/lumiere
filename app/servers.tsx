import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'

import { Button, Card, ScreenHeader, Section, Text, TextInput } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { ProviderType } from '../src/services/providers'
import { useTheme } from '../src/theme'

const PROVIDER_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: 'molt', label: 'Molt Gateway' },
  { value: 'ollama', label: 'Ollama' },
]

export default function ServersScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { serversList, currentServerId, addServer, updateServer, removeServer, switchToServer } =
    useServers()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formToken, setFormToken] = useState('')
  const [formClientId, setFormClientId] = useState('lumiere-mobile')
  const [formProviderType, setFormProviderType] = useState<ProviderType>('molt')
  const [formModel, setFormModel] = useState('')

  const resetForm = () => {
    setFormName('')
    setFormUrl('')
    setFormToken('')
    setFormClientId('lumiere-mobile')
    setFormProviderType('molt')
    setFormModel('')
  }

  const handleAddServer = async () => {
    if (!formUrl.trim()) {
      Alert.alert('Error', 'URL is required')
      return
    }

    // Molt requires a token, Ollama does not
    if (formProviderType === 'molt' && !formToken.trim()) {
      Alert.alert('Error', 'Token is required for Molt Gateway')
      return
    }

    await addServer(
      {
        name: formName.trim() || 'New Server',
        url: formUrl.trim(),
        clientId: formClientId.trim() || 'lumiere-mobile',
        providerType: formProviderType,
        model: formModel.trim() || undefined,
      },
      formToken.trim() || 'ollama-no-token',
    )

    resetForm()
    setShowAddForm(false)
  }

  const handleEditServer = (id: string) => {
    const server = serversList.find((s) => s.id === id)
    if (!server) return

    setEditingId(id)
    setFormName(server.name)
    setFormUrl(server.url)
    setFormToken('') // Don't show existing token for security
    setFormClientId(server.clientId || 'lumiere-mobile')
    setFormProviderType(server.providerType || 'molt')
    setFormModel(server.model || '')
  }

  const handleUpdateServer = async () => {
    if (!editingId) return

    await updateServer(
      editingId,
      {
        name: formName.trim(),
        url: formUrl.trim(),
        clientId: formClientId.trim(),
        providerType: formProviderType,
        model: formModel.trim() || undefined,
      },
      formToken.trim() || undefined, // Only update token if provided
    )

    setEditingId(null)
    resetForm()
  }

  const handleRemoveServer = (id: string) => {
    const server = serversList.find((s) => s.id === id)
    if (!server) return

    Alert.alert('Remove Server', `Are you sure you want to remove "${server.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeServer(id),
      },
    ])
  }

  const handleSwitchServer = (id: string) => {
    if (id === currentServerId) return
    switchToServer(id)
    router.back()
  }

  const providerLabel = (type: ProviderType) =>
    PROVIDER_OPTIONS.find((o) => o.value === type)?.label ?? type

  const renderProviderPicker = () => (
    <View style={styles.providerPicker}>
      {PROVIDER_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.providerOption,
            formProviderType === option.value && styles.providerOptionActive,
          ]}
          onPress={() => {
            setFormProviderType(option.value)
          }}
        >
          <Text
            style={[
              styles.providerOptionText,
              formProviderType === option.value && styles.providerOptionTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderFormFields = () => (
    <>
      <View style={styles.formRow}>
        <Text variant="caption" color="secondary" style={{ marginBottom: 4 }}>
          Provider Type
        </Text>
        {renderProviderPicker()}
      </View>
      <View style={styles.formRow}>
        <TextInput
          label="Name"
          value={formName}
          onChangeText={setFormName}
          placeholder={formProviderType === 'ollama' ? 'My Ollama' : 'My Server'}
        />
      </View>
      <View style={styles.formRow}>
        <TextInput
          label="URL"
          value={formUrl}
          onChangeText={setFormUrl}
          placeholder={
            formProviderType === 'ollama' ? 'http://localhost:11434' : 'wss://gateway.example.com'
          }
        />
      </View>
      {formProviderType === 'molt' && (
        <>
          <View style={styles.formRow}>
            <TextInput
              label="Token"
              value={formToken}
              onChangeText={setFormToken}
              secureTextEntry
            />
          </View>
          <View style={styles.formRow}>
            <TextInput
              label="Client ID"
              value={formClientId}
              onChangeText={setFormClientId}
              placeholder="lumiere-mobile"
            />
          </View>
        </>
      )}
      {formProviderType === 'ollama' && (
        <View style={styles.formRow}>
          <TextInput
            label="Model"
            value={formModel}
            onChangeText={setFormModel}
            placeholder="llama3.2"
          />
        </View>
      )}
    </>
  )

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    serverCard: {
      marginBottom: theme.spacing.md,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    activeCard: {
      borderColor: theme.colors.primary,
    },
    serverHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    serverActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    iconButton: {
      padding: theme.spacing.xs,
    },
    formRow: {
      marginBottom: theme.spacing.md,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    providerPicker: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    providerOption: {
      flex: 1,
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    providerOptionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
    },
    providerOptionText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    providerOptionTextActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    providerBadge: {
      fontSize: 11,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Servers" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Servers">
          {serversList.map((server) => {
            const isActive = server.id === currentServerId
            const isEditing = editingId === server.id

            if (isEditing) {
              return (
                <Card key={server.id} style={styles.serverCard}>
                  {renderFormFields()}
                  <View style={styles.buttonRow}>
                    <Button title="Save" onPress={handleUpdateServer} style={{ flex: 1 }} />
                    <Button
                      title="Cancel"
                      variant="secondary"
                      onPress={() => {
                        setEditingId(null)
                        resetForm()
                      }}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              )
            }

            return (
              <TouchableOpacity key={server.id} onPress={() => handleSwitchServer(server.id)}>
                <Card style={[styles.serverCard, isActive && styles.activeCard]}>
                  <View style={styles.serverHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading3">
                        {server.name}
                        {isActive && ' (Active)'}
                      </Text>
                      <Text variant="caption" color="secondary" numberOfLines={1}>
                        {server.url}
                      </Text>
                      <Text style={styles.providerBadge}>
                        {providerLabel(server.providerType || 'molt')}
                        {server.model ? ` - ${server.model}` : ''}
                      </Text>
                    </View>
                    <View style={styles.serverActions}>
                      <TouchableOpacity
                        onPress={() => handleEditServer(server.id)}
                        style={styles.iconButton}
                      >
                        <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveServer(server.id)}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={theme.colors.status.error}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )
          })}

          {serversList.length === 0 && (
            <Text color="secondary" center>
              No servers configured
            </Text>
          )}
        </Section>

        <Section title="Add Server">
          {showAddForm ? (
            <Card>
              {renderFormFields()}
              <View style={styles.buttonRow}>
                <Button title="Add Server" onPress={handleAddServer} style={{ flex: 1 }} />
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setShowAddForm(false)
                    resetForm()
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ) : (
            <Button
              title="Add New Server"
              variant="secondary"
              onPress={() => setShowAddForm(true)}
            />
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
