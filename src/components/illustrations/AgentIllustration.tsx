import React from 'react'
import { useWindowDimensions } from 'react-native'

import AgentIllustrationSvg from '../../../assets/agent-illustration.svg'

export function AgentIllustration() {
  const { width } = useWindowDimensions()
  const imageHeight = width * (1024 / 1365) // Maintain aspect ratio (original: 1365x1024)

  return <AgentIllustrationSvg width={width} height={imageHeight} />
}
