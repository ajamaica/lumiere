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
}

export function ManageAgentsIllustration() {
  const strokeWidth = 3

  return (
    <View style={{ width: 240, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={220} height={180} viewBox="0 0 220 180">
        <Defs>
          {/* Ben-Day dot patterns */}
          <Pattern id="dotsRed" patternUnits="userSpaceOnUse" width="8" height="8">
            <Rect width="8" height="8" fill={LICHTENSTEIN.white} />
            <Circle cx="4" cy="4" r="2" fill={LICHTENSTEIN.red} />
          </Pattern>
          <Pattern id="dotsBlue" patternUnits="userSpaceOnUse" width="8" height="8">
            <Rect width="8" height="8" fill={LICHTENSTEIN.white} />
            <Circle cx="4" cy="4" r="2" fill={LICHTENSTEIN.blue} />
          </Pattern>
          <Pattern id="dotsYellow" patternUnits="userSpaceOnUse" width="8" height="8">
            <Rect width="8" height="8" fill={LICHTENSTEIN.white} />
            <Circle cx="4" cy="4" r="2" fill={LICHTENSTEIN.yellow} />
          </Pattern>
          <Pattern id="dotsSkin" patternUnits="userSpaceOnUse" width="6" height="6">
            <Rect width="6" height="6" fill={LICHTENSTEIN.skin} />
            <Circle cx="3" cy="3" r="1.2" fill="#E8A880" />
          </Pattern>
        </Defs>

        {/* Conductor's hand - pointing/directing */}
        <G transform="translate(85, 10)">
          {/* Arm sleeve */}
          <Path
            d="M-10 50 L5 35 L15 45 L30 30 L45 40 L35 55 L-5 70 Z"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Hand */}
          <Path
            d="M30 30 Q50 15 55 25 Q60 35 45 40"
            fill="url(#dotsSkin)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Pointing finger */}
          <Path
            d="M55 25 L75 15 L78 20 L60 32 Q55 35 50 30"
            fill="url(#dotsSkin)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Cuff */}
          <Rect
            x="-12"
            y="48"
            width="25"
            height="12"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
        </G>

        {/* Robot Agent 1 - Left */}
        <G transform="translate(20, 80)">
          {/* Head */}
          <Rect
            x="0"
            y="0"
            width="50"
            height="45"
            rx="8"
            fill="url(#dotsBlue)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Eyes */}
          <Circle
            cx="15"
            cy="18"
            r="8"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle
            cx="35"
            cy="18"
            r="8"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle cx="15" cy="18" r="4" fill={LICHTENSTEIN.black} />
          <Circle cx="35" cy="18" r="4" fill={LICHTENSTEIN.black} />
          {/* Mouth */}
          <Rect x="12" y="32" width="26" height="5" fill={LICHTENSTEIN.black} rx="2" />
          {/* Antenna */}
          <Path d="M25 0 L25 -12" stroke={LICHTENSTEIN.black} strokeWidth={strokeWidth} />
          <Circle
            cx="25"
            cy="-15"
            r="5"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Body hint */}
          <Rect
            x="5"
            y="48"
            width="40"
            height="25"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
        </G>

        {/* Robot Agent 2 - Center */}
        <G transform="translate(85, 95)">
          {/* Head */}
          <Rect
            x="0"
            y="0"
            width="50"
            height="45"
            rx="8"
            fill="url(#dotsRed)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Eyes */}
          <Circle
            cx="15"
            cy="18"
            r="8"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle
            cx="35"
            cy="18"
            r="8"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle cx="15" cy="18" r="4" fill={LICHTENSTEIN.black} />
          <Circle cx="35" cy="18" r="4" fill={LICHTENSTEIN.black} />
          {/* Mouth - smile */}
          <Path
            d="M12 34 Q25 42 38 34"
            fill="none"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Antenna */}
          <Path d="M25 0 L25 -12" stroke={LICHTENSTEIN.black} strokeWidth={strokeWidth} />
          <Circle
            cx="25"
            cy="-15"
            r="5"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Body hint */}
          <Rect
            x="5"
            y="48"
            width="40"
            height="20"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
        </G>

        {/* Robot Agent 3 - Right */}
        <G transform="translate(150, 80)">
          {/* Head */}
          <Rect
            x="0"
            y="0"
            width="50"
            height="45"
            rx="8"
            fill="url(#dotsYellow)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Eyes */}
          <Circle
            cx="15"
            cy="18"
            r="8"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle
            cx="35"
            cy="18"
            r="8"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle cx="15" cy="18" r="4" fill={LICHTENSTEIN.black} />
          <Circle cx="35" cy="18" r="4" fill={LICHTENSTEIN.black} />
          {/* Mouth */}
          <Rect x="12" y="32" width="26" height="5" fill={LICHTENSTEIN.black} rx="2" />
          {/* Antenna */}
          <Path d="M25 0 L25 -12" stroke={LICHTENSTEIN.black} strokeWidth={strokeWidth} />
          <Circle
            cx="25"
            cy="-15"
            r="5"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Body hint */}
          <Rect
            x="5"
            y="48"
            width="40"
            height="25"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
        </G>

        {/* Connection lines from hand to robots */}
        <Path
          d="M160 25 Q145 50 45 70"
          fill="none"
          stroke={LICHTENSTEIN.black}
          strokeWidth={2}
          strokeDasharray="5,5"
        />
        <Path
          d="M160 25 Q140 55 110 80"
          fill="none"
          stroke={LICHTENSTEIN.black}
          strokeWidth={2}
          strokeDasharray="5,5"
        />
        <Path
          d="M160 25 Q165 50 175 65"
          fill="none"
          stroke={LICHTENSTEIN.black}
          strokeWidth={2}
          strokeDasharray="5,5"
        />

        {/* Action lines - comic style */}
        <Path d="M165 18 L180 8" stroke={LICHTENSTEIN.black} strokeWidth={2} />
        <Path d="M168 22 L188 15" stroke={LICHTENSTEIN.black} strokeWidth={2} />
        <Path d="M170 28 L185 25" stroke={LICHTENSTEIN.black} strokeWidth={2} />
      </Svg>
    </View>
  )
}
