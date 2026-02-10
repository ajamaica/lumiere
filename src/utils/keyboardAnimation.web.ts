import { useSharedValue } from 'react-native-reanimated'

export function useReanimatedKeyboardAnimation() {
  const height = useSharedValue(0)
  const progress = useSharedValue(0)
  return { height, progress }
}
