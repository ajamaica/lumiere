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

export function ManageAgentsIllustration() {
  const strokeWidth = 4

  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        <Defs>
          {/* Ben-Day dot patterns */}
          <Pattern id="dotsRed" patternUnits="userSpaceOnUse" width="12" height="12">
            <Rect width="12" height="12" fill={LICHTENSTEIN.white} />
            <Circle cx="6" cy="6" r="3.5" fill={LICHTENSTEIN.red} />
          </Pattern>
          <Pattern id="dotsBlue" patternUnits="userSpaceOnUse" width="12" height="12">
            <Rect width="12" height="12" fill={LICHTENSTEIN.white} />
            <Circle cx="6" cy="6" r="3.5" fill={LICHTENSTEIN.blue} />
          </Pattern>
          <Pattern id="dotsYellow" patternUnits="userSpaceOnUse" width="12" height="12">
            <Rect width="12" height="12" fill={LICHTENSTEIN.white} />
            <Circle cx="6" cy="6" r="3.5" fill={LICHTENSTEIN.yellow} />
          </Pattern>
        </Defs>

        {/* Abstract pointing hand - large, bold */}
        <G transform="translate(90, 5)">
          <Path
            d="M0 60 L40 30 L80 50 L100 20 L130 35 L110 70 L50 90 Z"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Simplified finger */}
          <Path
            d="M100 20 L140 0 L150 15 L115 40"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
        </G>

        {/* Abstract Agent 1 - Bold circle with eye */}
        <G transform="translate(15, 110)">
          <Circle
            cx="50"
            cy="50"
            r="50"
            fill="url(#dotsBlue)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Single abstract eye */}
          <Circle
            cx="50"
            cy="45"
            r="20"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          <Circle cx="50" cy="45" r="10" fill={LICHTENSTEIN.black} />
          {/* Antenna dot */}
          <Circle
            cx="50"
            cy="-5"
            r="12"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
        </G>

        {/* Abstract Agent 2 - Bold square */}
        <G transform="translate(105, 140)">
          <Rect
            x="0"
            y="0"
            width="70"
            height="70"
            fill="url(#dotsRed)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Two eyes */}
          <Circle
            cx="22"
            cy="30"
            r="12"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          <Circle
            cx="48"
            cy="30"
            r="12"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          <Circle cx="22" cy="30" r="6" fill={LICHTENSTEIN.black} />
          <Circle cx="48" cy="30" r="6" fill={LICHTENSTEIN.black} />
          {/* Antenna */}
          <Circle
            cx="35"
            cy="-15"
            r="10"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
        </G>

        {/* Abstract Agent 3 - Triangle/diamond shape */}
        <G transform="translate(195, 100)">
          <Path
            d="M35 0 L70 50 L35 100 L0 50 Z"
            fill="url(#dotsYellow)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Single eye */}
          <Circle
            cx="35"
            cy="45"
            r="15"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
          <Circle cx="35" cy="45" r="7" fill={LICHTENSTEIN.black} />
          {/* Antenna */}
          <Circle
            cx="35"
            cy="-12"
            r="10"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={3}
          />
        </G>

        {/* Bold connection lines */}
        <Path
          d="M220 30 Q180 70 65 100"
          fill="none"
          stroke={LICHTENSTEIN.black}
          strokeWidth={3}
          strokeDasharray="8,8"
        />
        <Path
          d="M220 30 Q190 90 140 125"
          fill="none"
          stroke={LICHTENSTEIN.black}
          strokeWidth={3}
          strokeDasharray="8,8"
        />
        <Path
          d="M220 30 Q230 70 230 90"
          fill="none"
          stroke={LICHTENSTEIN.black}
          strokeWidth={3}
          strokeDasharray="8,8"
        />

        {/* Action burst lines */}
        <Path d="M235 15 L260 0" stroke={LICHTENSTEIN.black} strokeWidth={3} />
        <Path d="M240 25 L270 15" stroke={LICHTENSTEIN.black} strokeWidth={3} />
        <Path d="M242 38 L265 35" stroke={LICHTENSTEIN.black} strokeWidth={3} />
      </Svg>
    </View>
  )
}
