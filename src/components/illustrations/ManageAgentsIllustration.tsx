import React from 'react'
import { View } from 'react-native'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

// Neo-Brutalism colors
const COLORS = {
  yellow: '#FFE600',
  pink: '#FF6B9D',
  blue: '#4DAFFF',
  green: '#7CFF6B',
  orange: '#FF9F43',
  black: '#000000',
  white: '#FFFFFF',
}

const SHADOW_OFFSET = 6
const STROKE = 3

export function ManageAgentsIllustration() {
  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        {/* Central hub/orchestrator */}
        <G transform="translate(100, 85)">
          {/* Shadow */}
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="80" height="80" fill={COLORS.black} />
          {/* Main box */}
          <Rect
            x="0"
            y="0"
            width="80"
            height="80"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Inner pattern - grid lines */}
          <Path d="M0 27 L80 27" stroke={COLORS.black} strokeWidth={2} />
          <Path d="M0 54 L80 54" stroke={COLORS.black} strokeWidth={2} />
          <Path d="M27 0 L27 80" stroke={COLORS.black} strokeWidth={2} />
          <Path d="M54 0 L54 80" stroke={COLORS.black} strokeWidth={2} />
          {/* Status dots */}
          <Circle cx="13" cy="13" r="6" fill={COLORS.green} stroke={COLORS.black} strokeWidth={2} />
          <Circle cx="40" cy="13" r="6" fill={COLORS.green} stroke={COLORS.black} strokeWidth={2} />
          <Circle cx="67" cy="13" r="6" fill={COLORS.pink} stroke={COLORS.black} strokeWidth={2} />
        </G>

        {/* Agent box 1 - top left */}
        <G transform="translate(15, 20)">
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="55" height="45" fill={COLORS.black} />
          <Rect
            x="0"
            y="0"
            width="55"
            height="45"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Screen/display */}
          <Rect x="8" y="8" width="39" height="20" fill={COLORS.black} />
          <Rect x="12" y="12" width="20" height="4" fill={COLORS.green} />
          <Rect x="12" y="20" width="30" height="4" fill={COLORS.white} />
          {/* Indicator light */}
          <Circle cx="47" cy="37" r="5" fill={COLORS.green} stroke={COLORS.black} strokeWidth={2} />
        </G>

        {/* Agent box 2 - top right */}
        <G transform="translate(205, 25)">
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="55" height="50" fill={COLORS.black} />
          <Rect
            x="0"
            y="0"
            width="55"
            height="50"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Bars/levels */}
          <Rect x="8" y="10" width="8" height="30" fill={COLORS.black} />
          <Rect x="8" y="20" width="8" height="20" fill={COLORS.yellow} />
          <Rect x="20" y="10" width="8" height="30" fill={COLORS.black} />
          <Rect x="20" y="15" width="8" height="25" fill={COLORS.yellow} />
          <Rect x="32" y="10" width="8" height="30" fill={COLORS.black} />
          <Rect x="32" y="25" width="8" height="15" fill={COLORS.yellow} />
          {/* Light */}
          <Circle cx="47" cy="42" r="5" fill={COLORS.green} stroke={COLORS.black} strokeWidth={2} />
        </G>

        {/* Agent box 3 - bottom left */}
        <G transform="translate(10, 185)">
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="60" height="50" fill={COLORS.black} />
          <Rect
            x="0"
            y="0"
            width="60"
            height="50"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Progress bar */}
          <Rect x="8" y="12" width="44" height="12" fill={COLORS.black} />
          <Rect x="10" y="14" width="30" height="8" fill={COLORS.yellow} />
          {/* Dots */}
          <Circle cx="15" cy="38" r="5" fill={COLORS.black} />
          <Circle cx="30" cy="38" r="5" fill={COLORS.black} />
          <Circle cx="45" cy="38" r="5" fill={COLORS.white} stroke={COLORS.black} strokeWidth={2} />
        </G>

        {/* Agent box 4 - bottom right */}
        <G transform="translate(200, 180)">
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="60" height="55" fill={COLORS.black} />
          <Rect
            x="0"
            y="0"
            width="60"
            height="55"
            fill={COLORS.orange}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Terminal lines */}
          <Rect x="8" y="10" width="44" height="35" fill={COLORS.black} />
          <Rect x="12" y="15" width="25" height="4" fill={COLORS.green} />
          <Rect x="12" y="23" width="35" height="4" fill={COLORS.white} />
          <Rect x="12" y="31" width="18" height="4" fill={COLORS.green} />
          {/* Cursor */}
          <Rect x="32" y="31" width="6" height="4" fill={COLORS.white} />
        </G>

        {/* Connection lines from hub to agents */}
        {/* To top left */}
        <Path d="M100 110 L70 65" stroke={COLORS.black} strokeWidth={4} />
        <Circle cx="70" cy="65" r="6" fill={COLORS.yellow} stroke={COLORS.black} strokeWidth={2} />

        {/* To top right */}
        <Path d="M180 110 L205 65" stroke={COLORS.black} strokeWidth={4} />
        <Circle cx="205" cy="65" r="6" fill={COLORS.blue} stroke={COLORS.black} strokeWidth={2} />

        {/* To bottom left */}
        <Path d="M110 165 L70 185" stroke={COLORS.black} strokeWidth={4} />
        <Circle cx="70" cy="185" r="6" fill={COLORS.green} stroke={COLORS.black} strokeWidth={2} />

        {/* To bottom right */}
        <Path d="M170 165 L200 185" stroke={COLORS.black} strokeWidth={4} />
        <Circle
          cx="200"
          cy="185"
          r="6"
          fill={COLORS.orange}
          stroke={COLORS.black}
          strokeWidth={2}
        />

        {/* Data flow arrows on lines */}
        <Path d="M85 88 L80 83 L80 93 Z" fill={COLORS.black} />
        <Path d="M192 88 L197 83 L197 93 Z" fill={COLORS.black} />
        <Path d="M90 175 L85 170 L85 180 Z" fill={COLORS.black} />
        <Path d="M185 175 L190 170 L190 180 Z" fill={COLORS.black} />

        {/* Decorative elements */}
        <Rect
          x="5"
          y="130"
          width="12"
          height="12"
          fill={COLORS.pink}
          stroke={COLORS.black}
          strokeWidth={2}
        />
        <Circle cx="270" cy="130" r="8" fill={COLORS.blue} stroke={COLORS.black} strokeWidth={2} />
        <Rect
          x="130"
          y="5"
          width="20"
          height="10"
          fill={COLORS.green}
          stroke={COLORS.black}
          strokeWidth={2}
        />
      </Svg>
    </View>
  )
}
