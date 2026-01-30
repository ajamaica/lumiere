import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

import {
  Button,
  Card,
  ScreenHeader,
  Section,
  Text,
  TextInput,
} from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useTheme } from '../src/theme'

export default function ServersScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const {
    serversList,
    currentServerId,
    addServer,
    updateServer,
    removeServer,
    switchToServer,
  } = useServers()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formToken, setFormToken] = useState('')
  const [formClientId, setFormClientId] = useState('lumiere-mobile')

  const handleAddServer = () => {
    if (!formUrl.trim() || !formToken.trim()) {
      Alert.alert('Error', 'URL and Token are required')
      return
    }

    addServer({
      name: formName.trim() || 'New Server',
      url: formUrl.trim(),
      token: formToken.trim(),
      clientId: formClientId.trim() || 'lumiere-mobile',
    })

    // Reset form
    setFormName('')
    setFormUrl('')
    setFormToken('')
    setFormClientId('lumiere-mobile')
    setShowAddForm(false)
  }

  const handleEditServer = (id: string) => {
    const server = serversList.find((s) => s.id === id)
    if (!server) return

    setEditingId(id)
    setFormName(server.name)
    setFormUrl(server.url)
    setFormToken(server.token)
    setFormClientId(server.clientId || 'lumiere-mobile')
  }

  const handleUpdateServer = () => {
    if (!editingId) return

    updateServer(editingId, {
      name: formName.trim(),
      url: formUrl.trim(),
      token: formToken.trim(),
      clientId: formClientId.trim(),
    })

    // Reset form
    setEditingId(null)
    setFormName('')
    setFormUrl('')
    setFormToken('')
    setFormClientId('lumiere-mobile')
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
                  <View style={styles.formRow}>
                    <TextInput
                      label="Name"
                      value={formName}
                      onChangeText={setFormName}
                      placeholder="Server name"
                    />
                  </View>
                  <View style={styles.formRow}>
                    <TextInput
                      label="URL"
                      value={formUrl}
                      onChangeText={setFormUrl}
                      placeholder="wss://..."
                    />
                  </View>
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
                  <View style={styles.buttonRow}>
                    <Button
                      title="Save"
                      onPress={handleUpdateServer}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Cancel"
                      variant="secondary"
                      onPress={() => {
                        setEditingId(null)
                        setFormName('')
                        setFormUrl('')
                        setFormToken('')
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
                    </View>
                    <View style={styles.serverActions}>
                      <TouchableOpacity
                        onPress={() => handleEditServer(server.id)}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name="pencil-outline"
                          size={20}
                          color={theme.colors.primary}
                        />
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
              <View style={styles.formRow}>
                <TextInput
                  label="Name"
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="My Server"
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  label="URL"
                  value={formUrl}
                  onChangeText={setFormUrl}
                  placeholder="wss://gateway.example.com"
                />
              </View>
              <View style={styles.formRow}>
                <TextInput label="Token" value={formToken} onChangeText={setFormToken} secureTextEntry />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  label="Client ID"
                  value={formClientId}
                  onChangeText={setFormClientId}
                  placeholder="lumiere-mobile"
                />
              </View>
              <View style={styles.buttonRow}>
                <Button title="Add Server" onPress={handleAddServer} style={{ flex: 1 }} />
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setShowAddForm(false)}
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
