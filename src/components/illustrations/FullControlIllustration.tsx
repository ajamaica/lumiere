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

export function FullControlIllustration() {
  const strokeWidth = 3

  return (
    <View style={{ width: 240, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={220} height={180} viewBox="0 0 220 180">
        <Defs>
          {/* Ben-Day dot patterns */}
          <Pattern id="dotsGray" patternUnits="userSpaceOnUse" width="6" height="6">
            <Rect width="6" height="6" fill={LICHTENSTEIN.gray} />
            <Circle cx="3" cy="3" r="1.2" fill="#888888" />
          </Pattern>
          <Pattern id="dotsYellowCtrl" patternUnits="userSpaceOnUse" width="8" height="8">
            <Rect width="8" height="8" fill={LICHTENSTEIN.white} />
            <Circle cx="4" cy="4" r="2" fill={LICHTENSTEIN.yellow} />
          </Pattern>
          <Pattern id="dotsSkinCtrl" patternUnits="userSpaceOnUse" width="6" height="6">
            <Rect width="6" height="6" fill={LICHTENSTEIN.skin} />
            <Circle cx="3" cy="3" r="1.2" fill="#E8A880" />
          </Pattern>
        </Defs>

        {/* Control Panel Background */}
        <Rect
          x="15"
          y="50"
          width="190"
          height="120"
          rx="10"
          fill="url(#dotsGray)"
          stroke={LICHTENSTEIN.black}
          strokeWidth={strokeWidth}
        />

        {/* Panel inner border */}
        <Rect
          x="25"
          y="60"
          width="170"
          height="100"
          rx="5"
          fill={LICHTENSTEIN.white}
          stroke={LICHTENSTEIN.black}
          strokeWidth={2}
        />

        {/* Big Red Button - top left */}
        <G transform="translate(45, 75)">
          <Circle
            cx="20"
            cy="20"
            r="22"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx="20"
            cy="20"
            r="15"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Highlight */}
          <Circle cx="14" cy="14" r="5" fill={LICHTENSTEIN.white} opacity={0.6} />
        </G>

        {/* Toggle Switches - top right */}
        <G transform="translate(120, 70)">
          {/* Switch 1 - ON */}
          <Rect
            x="0"
            y="0"
            width="20"
            height="40"
            rx="4"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Rect
            x="2"
            y="2"
            width="16"
            height="18"
            rx="3"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Switch 2 - OFF */}
          <Rect
            x="30"
            y="0"
            width="20"
            height="40"
            rx="4"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Rect
            x="32"
            y="20"
            width="16"
            height="18"
            rx="3"
            fill={LICHTENSTEIN.gray}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Switch 3 - ON */}
          <Rect
            x="60"
            y="0"
            width="20"
            height="40"
            rx="4"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Rect
            x="62"
            y="2"
            width="16"
            height="18"
            rx="3"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
        </G>

        {/* Lever base */}
        <G transform="translate(45, 120)">
          <Rect
            x="0"
            y="25"
            width="60"
            height="15"
            rx="3"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Lever slot */}
          <Path d="M5 30 L55 30" stroke={LICHTENSTEIN.gray} strokeWidth={4} />
          {/* Lever stick */}
          <Rect
            x="40"
            y="-5"
            width="10"
            height="35"
            rx="2"
            fill={LICHTENSTEIN.gray}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Lever ball */}
          <Circle
            cx="45"
            cy="-10"
            r="12"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Circle cx="41" cy="-14" r="4" fill={LICHTENSTEIN.white} opacity={0.6} />
        </G>

        {/* Hand gripping lever */}
        <G transform="translate(85, 90)">
          {/* Wrist/arm */}
          <Path
            d="M60 25 L45 15 L35 20 L30 35 L40 40 L55 35 Z"
            fill="url(#dotsSkinCtrl)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Hand gripping */}
          <Path
            d="M30 35 Q15 30 10 15 Q8 5 15 0 Q25 -5 30 5 L35 20"
            fill="url(#dotsSkinCtrl)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Fingers */}
          <Path d="M15 0 Q5 5 8 15" fill="none" stroke={LICHTENSTEIN.black} strokeWidth={2} />
          <Path d="M20 2 Q12 8 14 18" fill="none" stroke={LICHTENSTEIN.black} strokeWidth={2} />
          {/* Sleeve cuff */}
          <Rect
            x="45"
            y="10"
            width="25"
            height="12"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
        </G>

        {/* Status lights */}
        <G transform="translate(125, 125)">
          <Circle cx="0" cy="0" r="8" fill="#00C853" stroke={LICHTENSTEIN.black} strokeWidth={2} />
          <Circle cx="25" cy="0" r="8" fill="#00C853" stroke={LICHTENSTEIN.black} strokeWidth={2} />
          <Circle
            cx="50"
            cy="0"
            r="8"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
        </G>

        {/* Panel label area */}
        <Rect
          x="75"
          y="8"
          width="70"
          height="25"
          rx="5"
          fill={LICHTENSTEIN.blue}
          stroke={LICHTENSTEIN.black}
          strokeWidth={strokeWidth}
        />
        {/* Label lines */}
        <Path d="M85 17 L135 17" stroke={LICHTENSTEIN.white} strokeWidth={3} />
        <Path d="M90 25 L130 25" stroke={LICHTENSTEIN.white} strokeWidth={2} />

        {/* Action lines - comic speed effect */}
        <Path d="M20 45 L5 35" stroke={LICHTENSTEIN.black} strokeWidth={2} />
        <Path d="M25 42 L15 28" stroke={LICHTENSTEIN.black} strokeWidth={2} />
        <Path d="M200 45 L215 35" stroke={LICHTENSTEIN.black} strokeWidth={2} />
        <Path d="M195 42 L205 28" stroke={LICHTENSTEIN.black} strokeWidth={2} />
      </Svg>
    </View>
  )
}
