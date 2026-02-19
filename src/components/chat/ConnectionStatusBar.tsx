import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { useExtensionDisplayMode } from '../../hooks/useExtensionDisplayMode'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { Theme, useTheme } from '../../theme'
import { useDeviceType, useFoldState } from '../../utils/device'
import { GlassView, isLiquidGlassAvailable } from '../../utils/glassEffect'
import { Message } from './ChatMessage'
import { ThinkingIndicator } from './ThinkingIndicator'

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity)

interface ConnectionStatusBarProps {
  connecting: boolean
  connected: boolean
  awaitingApproval: boolean
  error: string | null
  health: { agents?: Record<string, unknown> } | null
  retry: () => void
  isAgentResponding: boolean
  isMoltProvider: boolean
  onOpenSettings: () => void
  onOpenAgentPicker: () => void
  allMessages: Message[]
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

export function ConnectionStatusBar({
  connecting,
  connected,
  awaitingApproval,
  error,
  health,
  retry,
  isAgentResponding,
  isMoltProvider,
  onOpenSettings,
  onOpenAgentPicker,
  allMessages,
  searchQuery,
  onSearchQueryChange,
}: ConnectionStatusBarProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const glassAvailable = isLiquidGlassAvailable()
  const deviceType = useDeviceType()
  const foldState = useFoldState()
  const {
    isExtension,
    mode: extensionMode,
    openFullscreen,
    openSidebar,
  } = useExtensionDisplayMode()

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef<TextInput>(null)

  const styles = React.useMemo(
    () => createStatusBarStyles(theme, deviceType, foldState),
    [theme, deviceType, foldState],
  )

  // Pulse animation for status dot
  const pulseOpacity = useSharedValue(1)
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }))

  React.useEffect(() => {
    if (isAgentResponding) {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      )
    } else {
      pulseOpacity.value = withTiming(1, { duration: 200 })
    }
  }, [isAgentResponding, pulseOpacity])

  // Search bar expand/collapse animation
  const searchProgress = useSharedValue(0)

  const searchBarTransformStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(searchProgress.value, [0, 1], [0.7, 1]) }],
  }))

  const searchBarContentStyle = useAnimatedStyle(() => ({
    opacity: searchProgress.value,
  }))

  const statusBubbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - searchProgress.value,
    transform: [{ scale: interpolate(searchProgress.value, [0, 1], [1, 0.85]) }],
  }))

  const handleToggleSearch = () => {
    if (isSearchOpen) {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
      searchProgress.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) })
      onSearchQueryChange('')
      setIsSearchOpen(false)
    } else {
      setIsSearchOpen(true)

      searchProgress.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
      setTimeout(() => searchInputRef.current?.focus(), 150)
    }
  }

  const handleCloseSearch = () => {
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
    searchProgress.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) })
    onSearchQueryChange('')
    setTimeout(() => setIsSearchOpen(false), 200)
  }

  // Bounce animation for action buttons
  const reducedMotion = useReducedMotion()
  const settingsScale = useSharedValue(1)
  const searchScale = useSharedValue(1)

  const settingsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: settingsScale.value }],
  }))

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchScale.value }],
  }))

  const handleSettingsPressIn = useCallback(() => {
    if (reducedMotion) return
    settingsScale.value = withTiming(0.85, { duration: 100, easing: Easing.out(Easing.ease) }) // eslint-disable-line react-hooks/immutability
  }, [settingsScale, reducedMotion])

  const handleSettingsPressOut = useCallback(() => {
    if (reducedMotion) return
    settingsScale.value = withSpring(1, { damping: 12, stiffness: 400 }) // eslint-disable-line react-hooks/immutability
  }, [settingsScale, reducedMotion])

  const handleSearchPressIn = useCallback(() => {
    if (reducedMotion) return
    searchScale.value = withTiming(0.85, { duration: 100, easing: Easing.out(Easing.ease) }) // eslint-disable-line react-hooks/immutability
  }, [searchScale, reducedMotion])

  const handleSearchPressOut = useCallback(() => {
    if (reducedMotion) return
    searchScale.value = withSpring(1, { damping: 12, stiffness: 400 }) // eslint-disable-line react-hooks/immutability
  }, [searchScale, reducedMotion])

  // Hide settings button on tablets/foldables since it's in the sidebar
  const showSettingsButton = deviceType === 'phone'

  const StatusBubbleContainer = glassAvailable ? GlassView : View
  const statusBubbleProps = glassAvailable
    ? { style: styles.statusBubble, glassEffectStyle: 'regular' as const }
    : { style: [styles.statusBubble, styles.statusBubbleFallback] }

  const ActionButtonContainer = glassAvailable ? GlassView : View
  const actionButtonProps = glassAvailable
    ? { style: styles.actionButton, glassEffectStyle: 'regular' as const }
    : { style: [styles.actionButton, styles.actionButtonFallback] }

  const renderExtensionButtons = () => (
    <>
      {isExtension && extensionMode !== 'fullscreen' && (
        <TouchableOpacity
          onPress={openFullscreen}
          activeOpacity={0.7}
          accessibilityLabel={t('extension.openFullscreen')}
        >
          <ActionButtonContainer {...actionButtonProps}>
            <Ionicons name="expand-outline" size={22} color={theme.colors.text.secondary} />
          </ActionButtonContainer>
        </TouchableOpacity>
      )}
      {isExtension && extensionMode !== 'sidebar' && (
        <TouchableOpacity
          onPress={openSidebar}
          activeOpacity={0.7}
          accessibilityLabel={t('extension.openSidebar')}
        >
          <ActionButtonContainer {...actionButtonProps}>
            <Ionicons name="browsers-outline" size={22} color={theme.colors.text.secondary} />
          </ActionButtonContainer>
        </TouchableOpacity>
      )}
      {showSettingsButton && (
        <AnimatedTouchableOpacity
          testID="settings-button"
          onPress={onOpenSettings}
          onPressIn={handleSettingsPressIn}
          onPressOut={handleSettingsPressOut}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('settings.title')}
          style={settingsAnimatedStyle}
        >
          <ActionButtonContainer {...actionButtonProps}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text.secondary} />
          </ActionButtonContainer>
        </AnimatedTouchableOpacity>
      )}
    </>
  )

  if (awaitingApproval) {
    const approvalBubbleProps = glassAvailable
      ? { style: styles.statusBubble, glassEffectStyle: 'regular' as const }
      : { style: [styles.statusBubble, styles.statusBubbleFallback, styles.approvalBubble] }
    return (
      <View style={styles.statusBarContainer} accessibilityLiveRegion="polite">
        <StatusBubbleContainer {...approvalBubbleProps}>
          <ActivityIndicator size="small" color={theme.colors.status.warning} />
          <Text style={styles.approvalText} numberOfLines={2}>
            {t('connection.awaitingApproval')}
          </Text>
        </StatusBubbleContainer>
        <View style={styles.statusActions}>{renderExtensionButtons()}</View>
      </View>
    )
  }

  if (connecting) {
    return (
      <View style={styles.statusBarContainer} accessibilityLiveRegion="polite">
        <StatusBubbleContainer {...statusBubbleProps}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.statusText}>Connecting...</Text>
        </StatusBubbleContainer>
        <View style={styles.statusActions}>{renderExtensionButtons()}</View>
      </View>
    )
  }

  if (error) {
    const errorBubbleProps = glassAvailable
      ? { style: styles.statusBubble, glassEffectStyle: 'regular' as const }
      : { style: [styles.statusBubble, styles.statusBubbleFallback, styles.errorBubble] }
    return (
      <View style={styles.statusBarContainer} accessibilityLiveRegion="assertive">
        <StatusBubbleContainer {...errorBubbleProps}>
          <Text style={styles.errorText} numberOfLines={1} accessibilityRole="alert">
            Connection failed: {error}
          </Text>
          <TouchableOpacity
            onPress={retry}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </StatusBubbleContainer>
        <View style={styles.statusActions}>{renderExtensionButtons()}</View>
      </View>
    )
  }

  if (connected) {
    const SearchBarContainer = glassAvailable ? GlassView : View
    const searchBarProps = glassAvailable
      ? { style: styles.searchBar, glassEffectStyle: 'regular' as const }
      : { style: [styles.searchBar, styles.searchBarFallback] }

    return (
      <View style={styles.statusBarContainer}>
        {/* Status bubble layer - fades out when search opens */}
        <Animated.View
          style={[styles.statusRow, statusBubbleAnimatedStyle]}
          pointerEvents={isSearchOpen ? 'none' : 'auto'}
        >
          <StatusBubbleContainer {...statusBubbleProps}>
            {isAgentResponding ? (
              <ThinkingIndicator />
            ) : (
              <>
                <Animated.View style={[styles.connectedDot, pulseStyle]} />
                <Text style={styles.connectedText}>Health</Text>
                <Text style={styles.statusOk}>OK</Text>
              </>
            )}
          </StatusBubbleContainer>
          <View style={styles.statusActions}>
            {isMoltProvider && health?.agents && Object.keys(health.agents).length > 1 && (
              <TouchableOpacity
                onPress={onOpenAgentPicker}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('agents.selectAgent')}
              >
                <ActionButtonContainer {...actionButtonProps}>
                  <Ionicons name="people" size={20} color={theme.colors.primary} />
                </ActionButtonContainer>
              </TouchableOpacity>
            )}
            <AnimatedTouchableOpacity
              onPress={handleToggleSearch}
              onPressIn={handleSearchPressIn}
              onPressOut={handleSearchPressOut}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isSearchOpen ? t('common.close') : 'Search messages'}
              style={searchAnimatedStyle}
            >
              <ActionButtonContainer {...actionButtonProps}>
                <Ionicons name="search" size={22} color={theme.colors.text.secondary} />
              </ActionButtonContainer>
            </AnimatedTouchableOpacity>
            {renderExtensionButtons()}
          </View>
        </Animated.View>

        {/* Search bar layer - expands in when search opens */}
        {isSearchOpen && (
          <Animated.View style={[styles.searchBarWrapper, searchBarTransformStyle]}>
            <SearchBarContainer {...searchBarProps}>
              <Animated.View style={[styles.searchBarContent, searchBarContentStyle]}>
                <Ionicons name="search" size={18} color={theme.colors.text.secondary} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search messages..."
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={searchQuery}
                  onChangeText={onSearchQueryChange}
                  autoCorrect={false}
                  returnKeyType="search"
                  accessibilityLabel="Search messages"
                />
                {searchQuery.length > 0 && (
                  <Text style={styles.searchCount}>
                    {
                      allMessages.filter((m) =>
                        m.text.toLowerCase().includes(searchQuery.toLowerCase()),
                      ).length
                    }
                  </Text>
                )}
                <TouchableOpacity
                  onPress={handleCloseSearch}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </Animated.View>
            </SearchBarContainer>
          </Animated.View>
        )}
      </View>
    )
  }

  return null
}

const createStatusBarStyles = (
  theme: Theme,
  deviceType: 'phone' | 'tablet' | 'foldable',
  foldState: 'folded' | 'unfolded' | 'half-folded',
) => {
  const statusBarTop = deviceType === 'foldable' && foldState === 'half-folded' ? 45 : 45
  const statusBarLeft = deviceType !== 'phone' ? 40 : 0

  return StyleSheet.create({
    statusBarContainer: {
      position: 'absolute',
      top: statusBarTop,
      left: statusBarLeft,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: 'transparent',
      zIndex: 1000,
    },
    statusBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md + 2,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.borderRadius.xxl,
      alignSelf: 'flex-start',
      marginRight: theme.spacing.md,
      flexShrink: 1,
      overflow: 'hidden',
    },
    statusBubbleFallback: {
      backgroundColor: theme.colors.surface,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    },
    actionButtonFallback: {
      backgroundColor: theme.colors.surface,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flex: 1,
    },
    statusActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    searchBarWrapper: {
      position: 'absolute',
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      transformOrigin: 'right center',
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.xxl,
      overflow: 'hidden',
    },
    searchBarContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchBarFallback: {
      backgroundColor: theme.colors.surface,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.md,
      marginRight: theme.spacing.md,
      paddingVertical: 4,
    },
    searchCount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginRight: theme.spacing.sm,
    },
    approvalBubble: {
      backgroundColor: theme.colors.status.warning + (theme.isDark ? '30' : '20'),
    },
    approvalText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.status.warning,
      marginLeft: theme.spacing.sm,
      flexShrink: 1,
    },
    errorBubble: {
      backgroundColor: theme.colors.status.error + (theme.isDark ? '30' : '20'),
    },
    statusText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
    connectedText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.sm,
    },
    statusOk: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    connectedDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.status.success,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.status.error,
      flex: 1,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
      marginLeft: theme.spacing.sm,
    },
    retryText: {
      color: theme.colors.text.inverse,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  })
}
