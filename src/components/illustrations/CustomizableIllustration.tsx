import React from 'react'
import { View } from 'react-native'
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg'

// Lichtenstein-style colors
const LICHTENSTEIN = {
  red: '#E41E31',
  yellow: '#FFD60A',
  blue: '#0057B8',
  black: '#1A1A1A',
  white: '#FFFFFF',
}

export function CustomizableIllustration() {
  const strokeWidth = 4

  // Simplified gear path
  const createGearPath = (cx: number, cy: number, r: number, teeth: number) => {
    let path = ''
    const innerR = r * 0.7
    const outerR = r
    const angleStep = (Math.PI * 2) / teeth

    for (let i = 0; i < teeth; i++) {
      const angle = i * angleStep
      const midAngle = angle + angleStep / 2

      const x1 = cx + innerR * Math.cos(angle)
      const y1 = cy + innerR * Math.sin(angle)
      const x2 = cx + outerR * Math.cos(angle + angleStep * 0.15)
      const y2 = cy + outerR * Math.sin(angle + angleStep * 0.15)
      const x3 = cx + outerR * Math.cos(midAngle - angleStep * 0.15)
      const y3 = cy + outerR * Math.sin(midAngle - angleStep * 0.15)
      const x4 = cx + innerR * Math.cos(midAngle)
      const y4 = cy + innerR * Math.sin(midAngle)

      if (i === 0) path += `M ${x1} ${y1} `
      path += `L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} `
    }
    return path + 'Z'
  }

  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        <Defs>
          <Pattern id="dotsBlueGear" patternUnits="userSpaceOnUse" width="10" height="10">
            <Rect width="10" height="10" fill={LICHTENSTEIN.white} />
            <Circle cx="5" cy="5" r="3" fill={LICHTENSTEIN.blue} />
          </Pattern>
          <Pattern id="dotsRedGear" patternUnits="userSpaceOnUse" width="10" height="10">
            <Rect width="10" height="10" fill={LICHTENSTEIN.white} />
            <Circle cx="5" cy="5" r="3" fill={LICHTENSTEIN.red} />
          </Pattern>
        </Defs>

        {/* Large main gear */}
        <G transform="translate(20, 30)">
          <Path
            d={createGearPath(80, 80, 80, 8)}
            fill="url(#dotsBlueGear)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx="80"
            cy="80"
            r="30"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle cx="80" cy="80" r="12" fill={LICHTENSTEIN.black} />
        </G>

        {/* Medium interlocking gear */}
        <G transform="translate(155, 10)">
          <Path
            d={createGearPath(50, 50, 50, 6)}
            fill="url(#dotsRedGear)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx="50"
            cy="50"
            r="18"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle cx="50" cy="50" r="7" fill={LICHTENSTEIN.black} />
        </G>

        {/* Small gear */}
        <G transform="translate(200, 95)">
          <Path
            d={createGearPath(30, 30, 30, 5)}
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx="30"
            cy="30"
            r="12"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          <Circle cx="30" cy="30" r="5" fill={LICHTENSTEIN.black} />
        </G>

        {/* Abstract slider */}
        <G transform="translate(30, 200)">
          <Rect
            x="0"
            y="10"
            width="180"
            height="12"
            rx="6"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle
            cx="120"
            cy="16"
            r="20"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
        </G>

        {/* Color swatches - bold squares */}
        <G transform="translate(180, 160)">
          <Rect
            x="0"
            y="0"
            width="35"
            height="35"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          <Rect
            x="45"
            y="0"
            width="35"
            height="35"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          <Rect
            x="0"
            y="45"
            width="35"
            height="35"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          <Rect
            x="45"
            y="45"
            width="35"
            height="35"
            fill="#00C853"
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          {/* Selection indicator */}
          <Rect
            x="-5"
            y="-5"
            width="45"
            height="45"
            fill="none"
            stroke={LICHTENSTEIN.black}
            strokeWidth={4}
          />
        </G>

        {/* Sparkle */}
        <G transform="translate(250, 20)">
          <Path
            d="M0 15 L15 0 L30 15 L15 30 Z"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
        </G>

        {/* Motion arcs */}
        <Path
          d="M170 100 Q185 115 175 135"
          fill="none"
          stroke={LICHTENSTEIN.black}
          strokeWidth={3}
          strokeDasharray="6,6"
        />
      </Svg>
    </View>
  )
}
