import React from 'react'
import { useWindowDimensions } from 'react-native'

import FeaturesIllustrationSvg from '../../../assets/features-illustration.svg'

export function FeaturesIllustration() {
  const { width } = useWindowDimensions()
  const imageHeight = width * (1024 / 1365) // Maintain aspect ratio

  return <FeaturesIllustrationSvg width={width} height={imageHeight} />
}
