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
  skin: '#FFDBB4',
  gray: '#C0C0C0',
}

export function CustomizableIllustration() {
  const strokeWidth = 3

  // Gear tooth path generator
  const createGearPath = (
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    teeth: number,
  ) => {
    let path = ''
    const angleStep = (Math.PI * 2) / teeth
    const toothWidth = angleStep * 0.3

    for (let i = 0; i < teeth; i++) {
      const angle = i * angleStep
      const x1 = cx + innerR * Math.cos(angle - toothWidth)
      const y1 = cy + innerR * Math.sin(angle - toothWidth)
      const x2 = cx + outerR * Math.cos(angle - toothWidth / 2)
      const y2 = cy + outerR * Math.sin(angle - toothWidth / 2)
      const x3 = cx + outerR * Math.cos(angle + toothWidth / 2)
      const y3 = cy + outerR * Math.sin(angle + toothWidth / 2)
      const x4 = cx + innerR * Math.cos(angle + toothWidth)
      const y4 = cy + innerR * Math.sin(angle + toothWidth)

      if (i === 0) {
        path += `M ${x1} ${y1} `
      }
      path += `L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} `

      // Arc to next tooth
      const nextAngle = (i + 1) * angleStep
      const nextX = cx + innerR * Math.cos(nextAngle - toothWidth)
      const nextY = cy + innerR * Math.sin(nextAngle - toothWidth)
      path += `A ${innerR} ${innerR} 0 0 1 ${nextX} ${nextY} `
    }
    path += 'Z'
    return path
  }

  return (
    <View style={{ width: 240, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={220} height={180} viewBox="0 0 220 180">
        <Defs>
          {/* Ben-Day dot patterns */}
          <Pattern id="dotsBlueCustom" patternUnits="userSpaceOnUse" width="8" height="8">
            <Rect width="8" height="8" fill={LICHTENSTEIN.white} />
            <Circle cx="4" cy="4" r="2" fill={LICHTENSTEIN.blue} />
          </Pattern>
          <Pattern id="dotsRedCustom" patternUnits="userSpaceOnUse" width="8" height="8">
            <Rect width="8" height="8" fill={LICHTENSTEIN.white} />
            <Circle cx="4" cy="4" r="2" fill={LICHTENSTEIN.red} />
          </Pattern>
          <Pattern id="dotsYellowCustom" patternUnits="userSpaceOnUse" width="6" height="6">
            <Rect width="6" height="6" fill={LICHTENSTEIN.yellow} />
            <Circle cx="3" cy="3" r="1" fill="#E8C000" />
          </Pattern>
        </Defs>

        {/* Large Gear - Background left */}
        <G transform="translate(25, 60)">
          <Path
            d={createGearPath(45, 45, 35, 48, 10)}
            fill="url(#dotsBlueCustom)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx="45"
            cy="45"
            r="15"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle cx="45" cy="45" r="6" fill={LICHTENSTEIN.black} />
        </G>

        {/* Medium Gear - Interlocking */}
        <G transform="translate(95, 30)">
          <Path
            d={createGearPath(35, 35, 25, 35, 8)}
            fill="url(#dotsRedCustom)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx="35"
            cy="35"
            r="10"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle cx="35" cy="35" r="4" fill={LICHTENSTEIN.black} />
        </G>

        {/* Small Gear - Top right */}
        <G transform="translate(155, 45)">
          <Path
            d={createGearPath(22, 22, 15, 23, 6)}
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx="22"
            cy="22"
            r="7"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle cx="22" cy="22" r="3" fill={LICHTENSTEIN.black} />
        </G>

        {/* Wrench */}
        <G transform="translate(140, 85) rotate(45)">
          {/* Handle */}
          <Rect
            x="0"
            y="8"
            width="60"
            height="14"
            rx="3"
            fill={LICHTENSTEIN.gray}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Head */}
          <Path
            d="M-5 0 L-5 30 L10 30 L15 20 L15 10 L10 0 Z"
            fill={LICHTENSTEIN.gray}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Jaw opening */}
          <Rect x="0" y="10" width="8" height="10" fill={LICHTENSTEIN.white} />
          {/* Grip lines */}
          <Path d="M25 11 L25 19" stroke={LICHTENSTEIN.black} strokeWidth={2} />
          <Path d="M32 11 L32 19" stroke={LICHTENSTEIN.black} strokeWidth={2} />
          <Path d="M39 11 L39 19" stroke={LICHTENSTEIN.black} strokeWidth={2} />
        </G>

        {/* Sliders Panel */}
        <G transform="translate(15, 125)">
          {/* Panel background */}
          <Rect
            x="0"
            y="0"
            width="120"
            height="50"
            rx="8"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />

          {/* Slider 1 */}
          <Rect
            x="15"
            y="12"
            width="90"
            height="6"
            rx="3"
            fill={LICHTENSTEIN.gray}
            stroke={LICHTENSTEIN.black}
            strokeWidth={1}
          />
          <Circle
            cx="75"
            cy="15"
            r="8"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />

          {/* Slider 2 */}
          <Rect
            x="15"
            y="32"
            width="90"
            height="6"
            rx="3"
            fill={LICHTENSTEIN.gray}
            stroke={LICHTENSTEIN.black}
            strokeWidth={1}
          />
          <Circle
            cx="45"
            cy="35"
            r="8"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
        </G>

        {/* Color swatches */}
        <G transform="translate(145, 130)">
          <Rect
            x="0"
            y="0"
            width="60"
            height="45"
            rx="6"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Color dots */}
          <Circle
            cx="15"
            cy="15"
            r="8"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle
            cx="45"
            cy="15"
            r="8"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle
            cx="15"
            cy="35"
            r="8"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle
            cx="45"
            cy="35"
            r="8"
            fill="#00C853"
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Selection ring */}
          <Circle cx="15" cy="15" r="11" fill="none" stroke={LICHTENSTEIN.black} strokeWidth={3} />
        </G>

        {/* Sparkle effects */}
        <G transform="translate(180, 25)">
          <Path
            d="M0 10 L10 0 L20 10 L10 20 Z"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
        </G>
        <G transform="translate(8, 40)">
          <Path
            d="M0 6 L6 0 L12 6 L6 12 Z"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={1.5}
          />
        </G>

        {/* Motion lines around gears */}
        <Path
          d="M85 130 Q75 115 90 100"
          fill="none"
          stroke={LICHTENSTEIN.black}
          strokeWidth={2}
          strokeDasharray="4,4"
        />
        <Path
          d="M150 90 Q165 85 170 70"
          fill="none"
          stroke={LICHTENSTEIN.black}
          strokeWidth={2}
          strokeDasharray="4,4"
        />
      </Svg>
    </View>
  )
}
