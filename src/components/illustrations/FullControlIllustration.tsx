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

export function FullControlIllustration() {
  const strokeWidth = 4

  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        <Defs>
          <Pattern id="dotsYellowCtrl" patternUnits="userSpaceOnUse" width="10" height="10">
            <Rect width="10" height="10" fill={LICHTENSTEIN.yellow} />
            <Circle cx="5" cy="5" r="2.5" fill="#E8C000" />
          </Pattern>
        </Defs>

        {/* Large abstract lever/switch */}
        <G transform="translate(30, 40)">
          {/* Base */}
          <Rect
            x="0"
            y="140"
            width="100"
            height="40"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Lever arm */}
          <Rect
            x="35"
            y="20"
            width="30"
            height="130"
            fill="url(#dotsYellowCtrl)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Lever ball */}
          <Circle
            cx="50"
            cy="20"
            r="30"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Highlight */}
          <Circle cx="40" cy="10" r="10" fill={LICHTENSTEIN.white} opacity={0.7} />
        </G>

        {/* Big bold button */}
        <G transform="translate(160, 30)">
          <Circle
            cx="50"
            cy="50"
            r="50"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx="50"
            cy="50"
            r="35"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          {/* Highlight */}
          <Circle cx="35" cy="35" r="12" fill={LICHTENSTEIN.white} opacity={0.6} />
        </G>

        {/* Abstract toggle switches */}
        <G transform="translate(150, 150)">
          {/* Switch 1 - ON */}
          <Rect
            x="0"
            y="0"
            width="35"
            height="70"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Rect
            x="5"
            y="5"
            width="25"
            height="30"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />

          {/* Switch 2 - OFF */}
          <Rect
            x="50"
            y="0"
            width="35"
            height="70"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Rect
            x="55"
            y="35"
            width="25"
            height="30"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
        </G>

        {/* Status indicators - large dots */}
        <Circle
          cx="260"
          cy="180"
          r="15"
          fill="#00C853"
          stroke={LICHTENSTEIN.black}
          strokeWidth={3}
        />
        <Circle
          cx="260"
          cy="220"
          r="15"
          fill={LICHTENSTEIN.yellow}
          stroke={LICHTENSTEIN.black}
          strokeWidth={3}
        />

        {/* Abstract power waves */}
        <Path d="M100 60 Q120 40 140 60" fill="none" stroke={LICHTENSTEIN.black} strokeWidth={3} />
        <Path d="M105 45 Q125 20 145 45" fill="none" stroke={LICHTENSTEIN.black} strokeWidth={3} />
        <Path d="M110 30 Q130 5 150 30" fill="none" stroke={LICHTENSTEIN.black} strokeWidth={3} />

        {/* Action lines */}
        <Path d="M20 30 L5 15" stroke={LICHTENSTEIN.black} strokeWidth={3} />
        <Path d="M15 45 L0 35" stroke={LICHTENSTEIN.black} strokeWidth={3} />
      </Svg>
    </View>
  )
}
