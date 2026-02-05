import { useEffect, useState } from 'react'
import { Dimensions, Platform, ScaledSize } from 'react-native'

const TABLET_MIN_WIDTH = 768

/**
 * Check if the current device is a tablet based on screen dimensions
 */
export function isTablet(): boolean {
  if (Platform.OS === 'web') return false
  const { width, height } = Dimensions.get('window')
  const minDimension = Math.min(width, height)
  return minDimension >= TABLET_MIN_WIDTH
}

/**
 * Check if the device is an iPad
 */
export function isIPad(): boolean {
  return Platform.OS === 'ios' && isTablet()
}

/**
 * Get device type based on screen size
 */
export type DeviceType = 'phone' | 'tablet'

export function getDeviceType(): DeviceType {
  return isTablet() ? 'tablet' : 'phone'
}

/**
 * Check if device is in landscape orientation
 */
export function isLandscape(): boolean {
  const { width, height } = Dimensions.get('window')
  return width > height
}

/**
 * Hook to reactively get device type (updates on dimension changes)
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType())

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }: { window: ScaledSize }) => {
        const minDimension = Math.min(window.width, window.height)
        setDeviceType(minDimension >= TABLET_MIN_WIDTH ? 'tablet' : 'phone')
      },
    )

    return () => subscription.remove()
  }, [])

  return deviceType
}

/**
 * Hook to check if device is tablet (reactive)
 */
export function useIsTablet(): boolean {
  const deviceType = useDeviceType()
  return deviceType === 'tablet'
}

/**
 * Hook to get current orientation
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    isLandscape() ? 'landscape' : 'portrait',
  )

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }: { window: ScaledSize }) => {
        setOrientation(window.width > window.height ? 'landscape' : 'portrait')
      },
    )

    return () => subscription.remove()
  }, [])

  return orientation
}

/**
 * Hook to get responsive values based on device type
 */
export function useResponsiveValue<T>(phoneValue: T, tabletValue: T): T {
  const isTabletDevice = useIsTablet()
  return isTabletDevice ? tabletValue : phoneValue
}

/**
 * Responsive breakpoints for layout
 */
export const breakpoints = {
  phone: 0,
  tablet: 768,
  tabletLarge: 1024,
} as const

/**
 * Max content width for readable text on large screens
 */
export const MAX_CONTENT_WIDTH = 720

/**
 * Hook to get screen dimensions that update on resize
 */
export function useScreenDimensions() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'))

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window)
    })

    return () => subscription.remove()
  }, [])

  return dimensions
}

/**
 * Hook that returns container style for centered, max-width content on tablets
 */
export function useContentContainerStyle() {
  const isTabletDevice = useIsTablet()
  const { width } = useScreenDimensions()

  if (!isTabletDevice || width <= MAX_CONTENT_WIDTH) {
    return {}
  }

  return {
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center' as const,
    width: '100%' as const,
  }
}
