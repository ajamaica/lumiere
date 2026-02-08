import React from 'react'
import { Image, useWindowDimensions } from 'react-native'

export function AgentIllustration() {
  const { width } = useWindowDimensions()
  const imageHeight = width * 0.75 // 4:3 aspect ratio for better mobile display

  return (
    <Image
      source={{ uri: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=85' }}
      style={{ width, height: imageHeight, borderRadius: 16 }}
      resizeMode="cover"
    />
  )
}
