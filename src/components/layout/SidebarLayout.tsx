import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { useTheme } from '../../theme'
import { useDeviceType, useOrientation } from '../../utils/device'

interface SidebarLayoutProps {
  sidebar: React.ReactNode
  children: React.ReactNode
  showSidebarOnPhone?: boolean
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  sidebar,
  children,
  showSidebarOnPhone = false,
}) => {
  const { theme } = useTheme()
  const deviceType = useDeviceType()
  const orientation = useOrientation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isInitialMount = useRef(true)

  // Determine if we should show sidebar based on device type
  const shouldShowSidebar = deviceType !== 'phone' || showSidebarOnPhone

  // Sidebar width based on device and orientation
  const getSidebarWidth = () => {
    if (deviceType === 'tablet') {
      return orientation === 'landscape' ? 320 : 280
    }

    if (deviceType === 'foldable') {
      return orientation === 'landscape' ? 340 : 300
    }

    return 280 // phone fallback
  }

  const sidebarWidth = getSidebarWidth()

  // Initialize shared value - starts at 0, will be set by useEffect without animation
  const sidebarWidthAnim = useSharedValue(shouldShowSidebar ? sidebarWidth : 0)

  // Update width when device type or orientation changes
  useEffect(() => {
    const newWidth = shouldShowSidebar && !isCollapsed ? sidebarWidth : 0

    if (isInitialMount.current) {
      // On first mount, set without animation
      isInitialMount.current = false
       
      sidebarWidthAnim.value = newWidth
    } else {
      // On device/orientation changes, animate smoothly without bounce
       
      sidebarWidthAnim.value = withTiming(newWidth, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      })
    }
  }, [deviceType, orientation, shouldShowSidebar, sidebarWidth, isCollapsed, sidebarWidthAnim])

  const toggleSidebar = () => {
    const toValue = isCollapsed ? sidebarWidth : 0
    setIsCollapsed(!isCollapsed)

    // eslint-disable-next-line react-hooks/immutability
    sidebarWidthAnim.value = withTiming(toValue, {
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
    })
  }

  const animatedSidebarStyle = useAnimatedStyle(() => ({
    width: sidebarWidthAnim.value,
  }))

  const animatedButtonStyle = useAnimatedStyle(() => ({
    left: shouldShowSidebar ? sidebarWidthAnim.value + 10 : 10,
  }))

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
    },
    sidebar: {
      backgroundColor: theme.colors.surface,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      overflow: 'hidden',
    },
    content: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    toggleButton: {
      position: 'absolute',
      top: 10,
      zIndex: 1000,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  })

  if (!shouldShowSidebar) {
    // On phones, just show content (sidebar accessible via modal)
    return <View style={styles.container}>{children}</View>
  }

  return (
    <View style={styles.container}>
      {/* Animated Sidebar */}
      <Animated.View style={[styles.sidebar, animatedSidebarStyle]}>{sidebar}</Animated.View>

      {/* Main Content */}
      <View style={styles.content}>{children}</View>

      {/* Animated Toggle Button */}
      <Animated.View style={[styles.toggleButton, animatedButtonStyle]}>
        <Pressable onPress={toggleSidebar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons
            name={isCollapsed ? 'chevron-forward' : 'chevron-back'}
            size={20}
            color={theme.colors.text.primary}
          />
        </Pressable>
      </Animated.View>
    </View>
  )
}
