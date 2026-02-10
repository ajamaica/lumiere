import { View, type ViewProps } from 'react-native'

export function GlassView(props: ViewProps) {
  return <View {...props} />
}

export function isLiquidGlassAvailable(): boolean {
  return false
}
