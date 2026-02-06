import { Ionicons } from '@expo/vector-icons'
import React, { useEffect,useState } from 'react'
import { Pressable,StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

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
  const sidebarWidthAnim = useSharedValue(0)

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

  // Initialize sidebar width on mount and when device changes
  useEffect(() => {
    if (shouldShowSidebar) {
      // eslint-disable-next-line react-hooks/immutability
      sidebarWidthAnim.value = isCollapsed ? 0 : sidebarWidth
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarWidth, shouldShowSidebar])

  const toggleSidebar = () => {
    const toValue = isCollapsed ? sidebarWidth : 0
    setIsCollapsed(!isCollapsed)

    // eslint-disable-next-line react-hooks/immutability
    sidebarWidthAnim.value = withSpring(toValue, {
      damping: 20,
      stiffness: 90,
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
        <Pressable
          onPress={toggleSidebar}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
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
