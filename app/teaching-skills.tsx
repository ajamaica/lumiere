import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader, Text, TextInput } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import type { TeachingSkill } from '../src/store'
import { useTheme } from '../src/theme'

export default function TeachingSkillsScreen() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { currentServer, currentServerId, updateServer } = useServers()

  const [skills, setSkills] = useState<TeachingSkill[]>(currentServer?.teachingSkills ?? [])
  const [hasChanges, setHasChanges] = useState(false)

  const addSkill = () => {
    setSkills([...skills, { name: '', description: '' }])
    setHasChanges(true)
  }

  const updateSkill = (index: number, field: keyof TeachingSkill, value: string) => {
    const updated = [...skills]
    updated[index] = { ...updated[index], [field]: value }
    setSkills(updated)
    setHasChanges(true)
  }

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!currentServerId) return
    const validSkills = skills.filter((s) => s.name.trim() && s.description.trim())
    await updateServer(currentServerId, {
      teachingSkills: validSkills.length > 0 ? validSkills : undefined,
    })
    setHasChanges(false)
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    description: {
      marginBottom: theme.spacing.lg,
    },
    skillCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    skillCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    fieldSpacer: {
      height: theme.spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: theme.spacing.xxxl * 2,
      paddingHorizontal: theme.spacing.xl,
    },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    saveButton: {
      marginTop: theme.spacing.lg,
    },
  })

  if (!currentServer || currentServer.providerType !== 'molt') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('teachingSkills.title')} showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text color="secondary">{t('teachingSkills.moltOnly')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('teachingSkills.title')}
        showBack
        right={
          <TouchableOpacity
            onPress={addSkill}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="caption" color="secondary" style={styles.description}>
            {t('teachingSkills.description')}
          </Text>

          {skills.length > 0 ? (
            <>
              {skills.map((skill, index) => (
                <View key={index} style={styles.skillCard}>
                  <View style={styles.skillCardHeader}>
                    <Text variant="caption" color="secondary">
                      {t('teachingSkills.skillNumber', { number: index + 1 })}
                    </Text>
                    <TouchableOpacity onPress={() => removeSkill(index)}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    label={t('teachingSkills.skillName')}
                    value={skill.name}
                    onChangeText={(v) => updateSkill(index, 'name', v)}
                    placeholder={t('teachingSkills.skillNamePlaceholder')}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.fieldSpacer} />
                  <TextInput
                    label={t('teachingSkills.skillDescription')}
                    value={skill.description}
                    onChangeText={(v) => updateSkill(index, 'description', v)}
                    placeholder={t('teachingSkills.skillDescriptionPlaceholder')}
                    multiline
                    autoCorrect={false}
                  />
                </View>
              ))}

              {hasChanges && (
                <Button title={t('common.save')} onPress={handleSave} style={styles.saveButton} />
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="school-outline" size={36} color={theme.colors.primary} />
              </View>
              <Text
                variant="heading3"
                center
                style={{ marginBottom: theme.spacing.sm, color: theme.colors.text.primary }}
              >
                {t('teachingSkills.noSkills')}
              </Text>
              <Text variant="body" color="secondary" center>
                {t('teachingSkills.noSkillsMessage')}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
