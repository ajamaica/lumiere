import React from 'react'
import { useWindowDimensions } from 'react-native'

import ConfigIllustrationSvg from '../../../assets/config-illustration.svg'

export function ConfigIllustration() {
  const { width } = useWindowDimensions()
  const imageHeight = width * (1024 / 1365) // Maintain aspect ratio

  return <ConfigIllustrationSvg width={width} height={imageHeight} />
}
