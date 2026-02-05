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

export function SetupIllustration() {
  const strokeWidth = 3

  return (
    <View style={{ width: 240, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={220} height={180} viewBox="0 0 220 180">
        <Defs>
          {/* Ben-Day dot patterns */}
          <Pattern id="dotsBlueSetup" patternUnits="userSpaceOnUse" width="8" height="8">
            <Rect width="8" height="8" fill={LICHTENSTEIN.white} />
            <Circle cx="4" cy="4" r="2" fill={LICHTENSTEIN.blue} />
          </Pattern>
          <Pattern id="dotsYellowSetup" patternUnits="userSpaceOnUse" width="8" height="8">
            <Rect width="8" height="8" fill={LICHTENSTEIN.white} />
            <Circle cx="4" cy="4" r="2" fill={LICHTENSTEIN.yellow} />
          </Pattern>
          <Pattern id="dotsSkinSetup" patternUnits="userSpaceOnUse" width="6" height="6">
            <Rect width="6" height="6" fill={LICHTENSTEIN.skin} />
            <Circle cx="3" cy="3" r="1.2" fill="#E8A880" />
          </Pattern>
        </Defs>

        {/* Server/Computer Box - Right side */}
        <G transform="translate(125, 40)">
          {/* Main box */}
          <Rect
            x="0"
            y="0"
            width="80"
            height="100"
            rx="8"
            fill="url(#dotsBlueSetup)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Screen area */}
          <Rect
            x="10"
            y="10"
            width="60"
            height="45"
            rx="4"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Screen content - command prompt style */}
          <Rect x="15" y="18" width="30" height="4" fill="#00FF00" />
          <Rect x="15" y="28" width="45" height="4" fill="#00FF00" />
          <Rect x="15" y="38" width="20" height="4" fill="#00FF00" />
          {/* Blinking cursor */}
          <Rect x="40" y="38" width="8" height="4" fill={LICHTENSTEIN.white} />

          {/* Status lights */}
          <Circle
            cx="20"
            cy="68"
            r="6"
            fill="#00C853"
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle
            cx="40"
            cy="68"
            r="6"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Circle
            cx="60"
            cy="68"
            r="6"
            fill={LICHTENSTEIN.gray}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />

          {/* Ventilation lines */}
          <Path d="M15 82 L65 82" stroke={LICHTENSTEIN.black} strokeWidth={2} />
          <Path d="M15 88 L65 88" stroke={LICHTENSTEIN.black} strokeWidth={2} />
          <Path d="M15 94 L65 94" stroke={LICHTENSTEIN.black} strokeWidth={2} />

          {/* Socket/Port on left side */}
          <Rect
            x="-8"
            y="35"
            width="12"
            height="30"
            rx="2"
            fill={LICHTENSTEIN.black}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Socket holes */}
          <Circle cx="-2" cy="45" r="4" fill={LICHTENSTEIN.gray} />
          <Circle cx="-2" cy="55" r="4" fill={LICHTENSTEIN.gray} />
        </G>

        {/* Plug coming in - with hand */}
        <G transform="translate(20, 55)">
          {/* Arm */}
          <Path
            d="M0 30 L25 25 L35 35 L55 30 L60 45 L40 55 L20 50 L0 55 Z"
            fill={LICHTENSTEIN.blue}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Hand holding plug */}
          <Path
            d="M55 30 Q70 20 75 30 Q80 40 65 45 L60 45"
            fill="url(#dotsSkinSetup)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Fingers wrapped */}
          <Path d="M70 25 Q78 30 75 38" fill="none" stroke={LICHTENSTEIN.black} strokeWidth={2} />
          {/* Thumb */}
          <Path
            d="M60 45 Q55 55 65 55 Q72 55 70 48"
            fill="url(#dotsSkinSetup)"
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Sleeve cuff */}
          <Rect
            x="-5"
            y="25"
            width="30"
            height="12"
            fill={LICHTENSTEIN.white}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
        </G>

        {/* The Plug */}
        <G transform="translate(70, 70)">
          {/* Plug body */}
          <Rect
            x="0"
            y="0"
            width="40"
            height="25"
            rx="4"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Plug prongs */}
          <Rect
            x="42"
            y="5"
            width="15"
            height="6"
            rx="1"
            fill={LICHTENSTEIN.gray}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          <Rect
            x="42"
            y="14"
            width="15"
            height="6"
            rx="1"
            fill={LICHTENSTEIN.gray}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
          {/* Cable */}
          <Path
            d="M0 12 Q-15 12 -20 25 Q-25 40 -10 50"
            fill="none"
            stroke={LICHTENSTEIN.black}
            strokeWidth={6}
          />
          <Path
            d="M0 12 Q-15 12 -20 25 Q-25 40 -10 50"
            fill="none"
            stroke={LICHTENSTEIN.yellow}
            strokeWidth={4}
          />
        </G>

        {/* Connection spark/energy */}
        <G transform="translate(105, 75)">
          {/* Electric zap */}
          <Path
            d="M0 0 L8 8 L4 8 L12 20 L6 12 L10 12 L0 0"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
        </G>

        {/* Additional sparks */}
        <Circle
          cx="115"
          cy="65"
          r="4"
          fill={LICHTENSTEIN.yellow}
          stroke={LICHTENSTEIN.black}
          strokeWidth={1.5}
        />
        <Circle
          cx="108"
          cy="100"
          r="3"
          fill={LICHTENSTEIN.yellow}
          stroke={LICHTENSTEIN.black}
          strokeWidth={1.5}
        />

        {/* Motion lines showing plug moving toward socket */}
        <Path d="M55 80 L45 80" stroke={LICHTENSTEIN.black} strokeWidth={2} />
        <Path d="M55 87 L40 87" stroke={LICHTENSTEIN.black} strokeWidth={2} />
        <Path d="M55 94 L45 94" stroke={LICHTENSTEIN.black} strokeWidth={2} />

        {/* "CONNECT" burst effect - top */}
        <G transform="translate(90, 15)">
          <Path
            d="M20 0 L25 15 L40 10 L30 22 L45 30 L28 30 L35 45 L20 35 L5 45 L12 30 L-5 30 L10 22 L0 10 L15 15 Z"
            fill={LICHTENSTEIN.red}
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          {/* Inner burst */}
          <Circle
            cx="20"
            cy="22"
            r="8"
            fill={LICHTENSTEIN.yellow}
            stroke={LICHTENSTEIN.black}
            strokeWidth={2}
          />
        </G>

        {/* Checkmark in circle - success indicator */}
        <G transform="translate(170, 145)">
          <Circle
            cx="20"
            cy="20"
            r="18"
            fill="#00C853"
            stroke={LICHTENSTEIN.black}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M10 20 L17 27 L30 12"
            fill="none"
            stroke={LICHTENSTEIN.white}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>

        {/* Decorative dots - Lichtenstein style */}
        <Circle
          cx="25"
          cy="150"
          r="5"
          fill={LICHTENSTEIN.blue}
          stroke={LICHTENSTEIN.black}
          strokeWidth={1.5}
        />
        <Circle
          cx="40"
          cy="160"
          r="4"
          fill={LICHTENSTEIN.red}
          stroke={LICHTENSTEIN.black}
          strokeWidth={1.5}
        />
        <Circle
          cx="55"
          cy="145"
          r="3"
          fill={LICHTENSTEIN.yellow}
          stroke={LICHTENSTEIN.black}
          strokeWidth={1.5}
        />
      </Svg>
    </View>
  )
}
