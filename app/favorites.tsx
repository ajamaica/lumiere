import { Ionicons } from '@expo/vector-icons'
import { useAtom } from 'jotai'
import React from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '../src/components/ui'
import { useHaptics } from '../src/hooks/useHaptics'
import { FavoriteItem, favoritesAtom } from '../src/store'
import { useTheme } from '../src/theme'
import { useContentContainerStyle } from '../src/utils/device'

export default function FavoritesScreen() {
  const { theme } = useTheme()
  const contentContainerStyle = useContentContainerStyle()
  const [favorites, setFavorites] = useAtom(favoritesAtom)
  const haptics = useHaptics()

  const handleRemove = (id: string) => {
    haptics.warning()
    Alert.alert('Remove Favorite', 'Are you sure you want to remove this from favorites?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setFavorites(favorites.filter((f) => f.id !== id)),
      },
    ])
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
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
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    senderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    senderText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold as '600',
      color: theme.colors.primary,
      textTransform: 'capitalize',
    },
    dateText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },
    messageText: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
      color: theme.colors.text.primary,
    },
    removeButton: {
      padding: theme.spacing.xs,
    },
  })

  const renderItem = (item: FavoriteItem) => (
    <View key={item.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.senderBadge}>
          <Ionicons
            name={item.sender === 'user' ? 'person-outline' : 'sparkles-outline'}
            size={14}
            color={theme.colors.primary}
          />
          <Text style={styles.senderText}>{item.sender}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text style={styles.dateText}>{new Date(item.savedAt).toLocaleDateString()}</Text>
          <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item.id)}>
            <Ionicons name="trash-outline" size={16} color={theme.colors.status.error} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.messageText} numberOfLines={10}>
        {item.text}
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Favorites" showBack />
      <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={48} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyText}>No favorites yet</Text>
          </View>
        ) : (
          [...favorites].reverse().map(renderItem)
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
