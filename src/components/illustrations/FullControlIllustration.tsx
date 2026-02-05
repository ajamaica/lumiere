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
  purple: '#B388FF',
  black: '#000000',
  white: '#FFFFFF',
}

const SHADOW_OFFSET = 6
const STROKE = 3

export function FullControlIllustration() {
  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        {/* Scattered buttons everywhere */}

        {/* Big tilted button - top center */}
        <G transform="translate(100, 15) rotate(-12)">
          <Circle cx={45 + SHADOW_OFFSET} cy={45 + SHADOW_OFFSET} r="45" fill={COLORS.black} />
          <Circle
            cx="45"
            cy="45"
            r="45"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Path d="M45 22 L45 45" stroke={COLORS.black} strokeWidth={5} strokeLinecap="round" />
          <Path
            d="M28 32 A22 22 0 1 0 62 32"
            fill="none"
            stroke={COLORS.black}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </G>

        {/* Small button - top left, rotated */}
        <G transform="translate(15, 30) rotate(15)">
          <Circle cx={20 + 4} cy={20 + 4} r="20" fill={COLORS.black} />
          <Circle
            cx="20"
            cy="20"
            r="20"
            fill={COLORS.orange}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Toggle switch - tilted left */}
        <G transform="translate(5, 100) rotate(-8)">
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="35" height="70" fill={COLORS.black} />
          <Rect
            x="0"
            y="0"
            width="35"
            height="70"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="5"
            y="5"
            width="25"
            height="30"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={2}
          />
        </G>

        {/* Lever - diagonal */}
        <G transform="translate(55, 120) rotate(20)">
          <Rect
            x={SHADOW_OFFSET}
            y={60 + SHADOW_OFFSET}
            width="40"
            height="20"
            fill={COLORS.black}
          />
          <Rect x="0" y="60" width="40" height="20" fill={COLORS.black} />
          <Rect
            x={12 + SHADOW_OFFSET}
            y={SHADOW_OFFSET}
            width="16"
            height="65"
            fill={COLORS.black}
          />
          <Rect
            x="12"
            y="0"
            width="16"
            height="65"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle cx={20 + SHADOW_OFFSET} cy={SHADOW_OFFSET} r="18" fill={COLORS.black} />
          <Circle
            cx="20"
            cy="0"
            r="18"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Another toggle - right side, opposite angle */}
        <G transform="translate(230, 80) rotate(10)">
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="30" height="55" fill={COLORS.black} />
          <Rect
            x="0"
            y="0"
            width="30"
            height="55"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="5"
            y="25"
            width="20"
            height="25"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={2}
          />
        </G>

        {/* Scattered status lights */}
        <G transform="translate(200, 20)">
          <Circle cx={SHADOW_OFFSET} cy={SHADOW_OFFSET} r="12" fill={COLORS.black} />
          <Circle
            cx="0"
            cy="0"
            r="12"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        <G transform="translate(250, 55)">
          <Circle cx={SHADOW_OFFSET} cy={SHADOW_OFFSET} r="10" fill={COLORS.black} />
          <Circle
            cx="0"
            cy="0"
            r="10"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        <G transform="translate(180, 145)">
          <Circle cx={SHADOW_OFFSET} cy={SHADOW_OFFSET} r="14" fill={COLORS.black} />
          <Circle
            cx="0"
            cy="0"
            r="14"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Big knob/dial - bottom right, tilted */}
        <G transform="translate(190, 175) rotate(-15)">
          <Circle cx={40 + SHADOW_OFFSET} cy={40 + SHADOW_OFFSET} r="40" fill={COLORS.black} />
          <Circle
            cx="40"
            cy="40"
            r="40"
            fill={COLORS.purple}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle
            cx="40"
            cy="40"
            r="25"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={2}
          />
          <Rect x="36" y="20" width="8" height="25" fill={COLORS.black} />
        </G>

        {/* Small scattered buttons */}
        <G transform="translate(140, 120)">
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="30" height="30" fill={COLORS.black} />
          <Rect
            x="0"
            y="0"
            width="30"
            height="30"
            fill={COLORS.orange}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        <G transform="translate(95, 170) rotate(25)">
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="25" height="25" fill={COLORS.black} />
          <Rect
            x="0"
            y="0"
            width="25"
            height="25"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Another lever - bottom left */}
        <G transform="translate(15, 180) rotate(-25)">
          <Rect x="0" y="45" width="35" height="15" fill={COLORS.black} />
          <Rect
            x={10 + SHADOW_OFFSET}
            y={SHADOW_OFFSET}
            width="12"
            height="50"
            fill={COLORS.black}
          />
          <Rect
            x="10"
            y="0"
            width="12"
            height="50"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle cx={16 + SHADOW_OFFSET} cy={SHADOW_OFFSET} r="14" fill={COLORS.black} />
          <Circle
            cx="16"
            cy="0"
            r="14"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Speed/action lines scattered */}
        <Path d="M170 100 L195 85" stroke={COLORS.black} strokeWidth={3} />
        <Path d="M175 115 L200 105" stroke={COLORS.black} strokeWidth={3} />
        <Path d="M55 85 L35 75" stroke={COLORS.black} strokeWidth={3} />
        <Path d="M60 95 L40 90" stroke={COLORS.black} strokeWidth={3} />
        <Path d="M240 165 L260 155" stroke={COLORS.black} strokeWidth={3} />

        {/* More scattered indicator dots */}
        <Circle cx="120" cy="175" r="8" fill={COLORS.green} stroke={COLORS.black} strokeWidth={2} />
        <Circle
          cx="160"
          cy="200"
          r="6"
          fill={COLORS.yellow}
          stroke={COLORS.black}
          strokeWidth={2}
        />
        <Circle cx="75" cy="75" r="7" fill={COLORS.pink} stroke={COLORS.black} strokeWidth={2} />

        {/* Decorative chaos */}
        <Rect
          x="245"
          y="200"
          width="15"
          height="15"
          fill={COLORS.blue}
          stroke={COLORS.black}
          strokeWidth={2}
          transform="rotate(30 252 207)"
        />
        <Rect
          x="5"
          y="60"
          width="12"
          height="12"
          fill={COLORS.orange}
          stroke={COLORS.black}
          strokeWidth={2}
        />
        <Circle cx="270" cy="130" r="6" fill={COLORS.green} stroke={COLORS.black} strokeWidth={2} />
      </Svg>
    </View>
  )
}
