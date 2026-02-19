import { useEffect, useState } from 'react'
import { Dimensions, Platform, ScaledSize } from 'react-native'

import { isAndroid, isIOS, isWeb } from './platform'

const TABLET_MIN_WIDTH = 768

/**
 * Check if the current device is a tablet based on screen dimensions.
 * On iOS, uses Platform.isPad for reliable detection of all iPad models
 * (including iPad Mini whose 744pt portrait width falls below the 768 threshold).
 */
export function isTablet(): boolean {
  if (isIOS) {
    return Platform.isPad === true
  }
  const { width, height } = Dimensions.get('window')
  // On web, use viewport width directly since the browser window isn't rotated
  if (isWeb) {
    return width >= TABLET_MIN_WIDTH
  }
  const minDimension = Math.min(width, height)
  return minDimension >= TABLET_MIN_WIDTH
}

/**
 * Check if the device is an iPad
 */
export function isIPad(): boolean {
  return isIOS && isTablet()
}

/**
 * Check if the current device is a foldable device based on aspect ratio and dimensions
 * Foldable devices typically have unusual aspect ratios when unfolded
 */
export function isFoldable(): boolean {
  if (!isAndroid) return false

  const { width, height } = Dimensions.get('window')
  const aspectRatio = Math.max(width, height) / Math.min(width, height)

  // Foldables in unfolded state typically have aspect ratios between 1.1 and 1.6
  // (closer to square than typical phones which are 2:1 or wider)
  // Also check if the device meets minimum tablet width when unfolded
  const minDimension = Math.min(width, height)
  const isUnfoldedSize = minDimension >= TABLET_MIN_WIDTH
  const isFoldableAspectRatio = aspectRatio >= 1.1 && aspectRatio <= 1.6

  return isUnfoldedSize && isFoldableAspectRatio
}

/**
 * Get fold state based on current dimensions
 * This helps determine if a foldable device is currently folded or unfolded
 */
export type FoldState = 'folded' | 'unfolded' | 'half-folded'

export function getFoldState(): FoldState {
  if (!isFoldable()) return 'unfolded'

  const { width, height } = Dimensions.get('window')
  const minDimension = Math.min(width, height)
  const aspectRatio = Math.max(width, height) / Math.min(width, height)

  // When folded, device acts like a phone (narrow)
  if (minDimension < TABLET_MIN_WIDTH) {
    return 'folded'
  }

  // Half-folded state (flex mode) typically has unusual aspect ratios
  if (aspectRatio > 1.6 && aspectRatio < 2.5) {
    return 'half-folded'
  }

  return 'unfolded'
}

/**
 * Get device type based on screen size and foldable state
 */
export type DeviceType = 'phone' | 'tablet' | 'foldable'

export function getDeviceType(): DeviceType {
  if (isFoldable()) return 'foldable'
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
    // On iOS, Platform.isPad is a static value that doesn't change with dimensions,
    // so the device type is fixed at initialization — no listener needed.
    if (isIOS) return

    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }: { window: ScaledSize }) => {
        // Recalculate device type on dimension change
        const { width, height } = window
        const minDimension = Math.min(width, height)
        const aspectRatio = Math.max(width, height) / minDimension

        // Check for foldable first
        if (isAndroid) {
          const isUnfoldedSize = minDimension >= TABLET_MIN_WIDTH
          const isFoldableAspectRatio = aspectRatio >= 1.1 && aspectRatio <= 1.6
          if (isUnfoldedSize && isFoldableAspectRatio) {
            setDeviceType('foldable')
            return
          }
        }

        // Fall back to tablet or phone
        // On web, use width directly since browser windows aren't rotated
        const effectiveSize = isWeb ? width : minDimension
        setDeviceType(effectiveSize >= TABLET_MIN_WIDTH ? 'tablet' : 'phone')
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
 * Hook to check if device is foldable (reactive)
 */
export function useIsFoldable(): boolean {
  const deviceType = useDeviceType()
  return deviceType === 'foldable'
}

/**
 * Hook to get current fold state (reactive)
 */
export function useFoldState(): FoldState {
  const [foldState, setFoldState] = useState<FoldState>(getFoldState())

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }: { window: ScaledSize }) => {
        const { width, height } = window
        const minDimension = Math.min(width, height)
        const aspectRatio = Math.max(width, height) / minDimension

        // Determine fold state based on dimensions
        if (minDimension < TABLET_MIN_WIDTH) {
          setFoldState('folded')
        } else if (aspectRatio > 1.6 && aspectRatio < 2.5) {
          setFoldState('half-folded')
        } else {
          setFoldState('unfolded')
        }
      },
    )

    return () => subscription.remove()
  }, [])

  return foldState
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
 * Hook to get responsive values with foldable support
 * Allows different values for phone, foldable, and tablet devices
 */
export function useResponsiveValueWithFoldable<T>(
  phoneValue: T,
  foldableValue: T,
  tabletValue: T,
): T {
  const deviceType = useDeviceType()

  switch (deviceType) {
    case 'foldable':
      return foldableValue
    case 'tablet':
      return tabletValue
    default:
      return phoneValue
  }
}

/**
 * Hook to get responsive values based on fold state
 * Useful for adapting UI when device is folded vs unfolded
 */
export function useFoldResponsiveValue<T>(
  foldedValue: T,
  unfoldedValue: T,
  halfFoldedValue?: T,
): T {
  const foldState = useFoldState()

  if (foldState === 'half-folded' && halfFoldedValue !== undefined) {
    return halfFoldedValue
  }

  return foldState === 'folded' ? foldedValue : unfoldedValue
}

/**
 * Responsive breakpoints for layout
 */
export const breakpoints = {
  phone: 0,
  foldableMin: 600, // Minimum width for foldable in folded state
  tablet: 768, // Tablet and foldable unfolded state
  tabletLarge: 1024,
} as const

/**
 * Common foldable device dimensions (for reference)
 */
export const foldableDimensions = {
  // Samsung Galaxy Z Fold series (unfolded)
  galaxyZFoldUnfolded: { width: 884, height: 2208 },
  // Samsung Galaxy Z Fold 5 (unfolded)
  galaxyZFold5Unfolded: { width: 1812, height: 2176 },
  // Samsung Galaxy Z Flip series (unfolded)
  galaxyZFlipUnfolded: { width: 1080, height: 2640 },
  // Generic foldable aspect ratios
  foldableAspectRatio: { min: 1.1, max: 1.6 },
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
 * Hook that returns container style for centered, max-width content on tablets and foldables
 */
export function useContentContainerStyle() {
  const deviceType = useDeviceType()
  const foldState = useFoldState()
  const { width } = useScreenDimensions()

  // For phones and folded foldables, no max width
  if (deviceType === 'phone' || foldState === 'folded') {
    return {}
  }

  // For foldables in half-folded state, use slightly smaller max width
  if (deviceType === 'foldable' && foldState === 'half-folded') {
    const halfFoldedMaxWidth = MAX_CONTENT_WIDTH * 0.8
    return {
      maxWidth: halfFoldedMaxWidth,
      alignSelf: 'center' as const,
      width: '100%' as const,
    }
  }

  // For tablets and unfolded foldables
  if ((deviceType === 'tablet' || deviceType === 'foldable') && width > MAX_CONTENT_WIDTH) {
    return {
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: 'center' as const,
      width: '100%' as const,
    }
  }

  return {}
}

/**
 * Estimate hinge position for foldable devices
 * Returns the approximate vertical position of the hinge as a percentage (0-100)
 * This is an approximation since React Native doesn't provide direct hinge detection
 */
export function getHingePosition(): number | null {
  if (!isFoldable()) return null

  const foldState = getFoldState()

  // In half-folded (flex mode), hinge is typically in the middle
  if (foldState === 'half-folded') {
    return 50 // 50% from top
  }

  return null
}

/**
 * Hook to get hinge position (reactive)
 */
export function useHingePosition(): number | null {
  const [hingePosition, setHingePosition] = useState<number | null>(getHingePosition())

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setHingePosition(getHingePosition())
    })

    return () => subscription.remove()
  }, [])

  return hingePosition
}
