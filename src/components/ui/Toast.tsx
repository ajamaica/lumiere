import { Ionicons } from '@expo/vector-icons'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTheme } from '../../theme'
import { Text } from './Text'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastMessage {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const TOAST_DURATION = 3000

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const { theme } = useTheme()
  const reducedMotion = useReducedMotion()
  const translateY = useSharedValue(reducedMotion ? 0 : -40)
  const opacity = useSharedValue(reducedMotion ? 1 : 0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const iconMap: Record<ToastVariant, keyof typeof Ionicons.glyphMap> = {
    success: 'checkmark-circle',
    error: 'alert-circle',
    warning: 'warning',
    info: 'information-circle',
  }

  const colorMap: Record<ToastVariant, string> = {
    success: theme.colors.status.success,
    error: theme.colors.status.error,
    warning: theme.colors.status.warning,
    info: theme.colors.status.info,
  }

  const dismiss = useCallback(() => {
    if (reducedMotion) {
      onDismiss(toast.id)
      return
    }
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
    opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) })
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
    translateY.value = withTiming(
      -40,
      { duration: 200, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) {
          runOnJS(onDismiss)(toast.id)
        }
      },
    )
  }, [onDismiss, opacity, reducedMotion, toast.id, translateY])

  useEffect(() => {
    if (!reducedMotion) {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
      translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) })
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
      opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) })
    }

    timerRef.current = setTimeout(dismiss, TOAST_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [dismiss, opacity, reducedMotion, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const color = colorMap[toast.variant]

  const styles = StyleSheet.create({
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderLeftWidth: 3,
      borderLeftColor: color,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 6,
      gap: theme.spacing.md,
    },
    textContainer: {
      flex: 1,
    },
  })

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={styles.toast}
        onPress={dismiss}
        activeOpacity={0.8}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
      >
        <Ionicons name={iconMap[toast.variant]} size={20} color={color} />
        <View style={styles.textContainer}>
          <Text variant="bodySmall" numberOfLines={2}>
            {toast.message}
          </Text>
        </View>
        <Ionicons name="close" size={16} color={theme.colors.text.tertiary} />
      </TouchableOpacity>
    </Animated.View>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const idRef = useRef(0)

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }])
  }, [])

  const handleDismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 60,
      left: 0,
      right: 0,
      zIndex: 9999,
      pointerEvents: 'box-none',
    },
  })

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={handleDismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  )
}
