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

export function SetupIllustration() {
  const strokeWidth = 4

  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        <Defs>
          <Pattern id="dotsBlueSetup" patternUnits="userSpaceOnUse" width="10" height="10">
            <Rect width="10" height="10" fill={LICHTENSTEIN.white} />
            <Circle cx="5" cy="5" r="3" fill={LICHTENSTEIN.blue} />
          </Pattern>
        </Defs>

        {/* Large abstract plug */}
        <G transform="translate(20, 80)">
          {/* Plug body */}
          <Rect
            x="0"
            y="20"
            width="80"
            height="60"
            rx="8"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Prongs */}
          <Rect
            x="85"
            y="30"
            width="40"
            height="15"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Rect
            x="85"
            y="55"
            width="40"
            height="15"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Cable */}
          <Path
            d="M0 50 Q-30 50 -40 80 Q-50 120 -20 150"
            fill="none"
            stroke={LICHTENSTEIN.black}
            strokeWidth={12}
          />
          <Path
            d="M0 50 Q-30 50 -40 80 Q-50 120 -20 150"
            fill="none"
            stroke={LICHTENSTEIN.yellow}
            strokeWidth={8}
          />
        </G>

        {/* Large abstract socket/server */}
        <G transform="translate(155, 50)">
          <Rect
            x="0"
            y="0"
            width="100"
            height="140"
            rx="10"
            fill="url(#dotsBlueSetup)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Socket holes */}
          <Rect
            x="-15"
            y="45"
            width="20"
            height="50"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle cx="-5" cy="60" r="8" fill={LICHTENSTEIN.white} />
          <Circle cx="-5" cy="80" r="8" fill={LICHTENSTEIN.white} />
          {/* Status light */}
          <Circle
            cx="50"
            cy="30"
            r="15"
            fill="#00C853"
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          {/* Screen lines */}
          <Rect x="20" y="60" width="60" height="8" fill={LICHTENSTEIN.black} />
          <Rect x="20" y="80" width="45" height="8" fill={LICHTENSTEIN.black} />
          <Rect x="20" y="100" width="55" height="8" fill={LICHTENSTEIN.black} />
        </G>

        {/* Connection spark - large burst */}
        <G transform="translate(115, 85)">
          <Path
            d="M0 25 L15 0 L25 20 L50 10 L35 30 L55 40 L30 45 L40 70 L20 50 L0 65 L10 45 L-15 40 L10 30 Z"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          <Circle
            cx="20"
            cy="35"
            r="12"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
        </G>

        {/* Motion lines */}
        <Path d="M90 120 L75 120" stroke={LICHTENSTEIN.black} strokeWidth={3} />
        <Path d="M90 135 L65 135" stroke={LICHTENSTEIN.black} strokeWidth={3} />
        <Path d="M90 150 L75 150" stroke={LICHTENSTEIN.black} strokeWidth={3} />

        {/* Success checkmark */}
        <G transform="translate(200, 200)">
          <Circle
            cx="30"
            cy="30"
            r="30"
            fill="#00C853"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M15 30 L25 40 L45 18"
            fill="none"
            stroke={LICHTENSTEIN.white}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>

        {/* Decorative elements */}
        <Circle
          cx="30"
          cy="30"
          r="12"
          fill={LICHTENSTEIN.red}
          stroke={LICHTENSTEIN.black}
          strokeWidth={3}
        />
        <Circle
          cx="60"
          cy="15"
          r="8"
          fill={LICHTENSTEIN.blue}
          stroke={LICHTENSTEIN.black}
          strokeWidth={2}
        />
      </Svg>
    </View>
  )
}
