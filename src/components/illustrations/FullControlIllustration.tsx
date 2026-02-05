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

export function FullControlIllustration() {
  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        {/* Big power button */}
        <G transform="translate(90, 20)">
          {/* Shadow */}
          <Circle cx={50 + SHADOW_OFFSET} cy={50 + SHADOW_OFFSET} r="50" fill={COLORS.black} />
          {/* Button */}
          <Circle
            cx="50"
            cy="50"
            r="50"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Power icon */}
          <Path d="M50 25 L50 50" stroke={COLORS.black} strokeWidth={6} strokeLinecap="round" />
          <Path
            d="M30 35 A25 25 0 1 0 70 35"
            fill="none"
            stroke={COLORS.black}
            strokeWidth={6}
            strokeLinecap="round"
          />
        </G>

        {/* Lever */}
        <G transform="translate(20, 80)">
          {/* Base shadow */}
          <Rect
            x={SHADOW_OFFSET}
            y={130 + SHADOW_OFFSET}
            width="60"
            height="30"
            fill={COLORS.black}
          />
          {/* Base */}
          <Rect
            x="0"
            y="130"
            width="60"
            height="30"
            fill={COLORS.black}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Lever arm shadow */}
          <Rect
            x={20 + SHADOW_OFFSET}
            y={20 + SHADOW_OFFSET}
            width="20"
            height="115"
            fill={COLORS.black}
          />
          {/* Lever arm */}
          <Rect
            x="20"
            y="20"
            width="20"
            height="115"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Lever ball shadow */}
          <Circle cx={30 + SHADOW_OFFSET} cy={20 + SHADOW_OFFSET} r="25" fill={COLORS.black} />
          {/* Lever ball */}
          <Circle
            cx="30"
            cy="20"
            r="25"
            fill={COLORS.orange}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Toggle switches */}
        <G transform="translate(200, 130)">
          {/* Switch 1 - ON */}
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="30" height="60" fill={COLORS.black} />
          <Rect
            x="0"
            y="0"
            width="30"
            height="60"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="5"
            y="5"
            width="20"
            height="25"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={2}
          />

          {/* Switch 2 - OFF */}
          <Rect
            x={45 + SHADOW_OFFSET}
            y={SHADOW_OFFSET}
            width="30"
            height="60"
            fill={COLORS.black}
          />
          <Rect
            x="45"
            y="0"
            width="30"
            height="60"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="50"
            y="30"
            width="20"
            height="25"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={2}
          />
        </G>

        {/* Status lights */}
        <G transform="translate(200, 210)">
          <Circle cx={SHADOW_OFFSET} cy={SHADOW_OFFSET} r="15" fill={COLORS.black} />
          <Circle
            cx="0"
            cy="0"
            r="15"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle cx={45 + SHADOW_OFFSET} cy={SHADOW_OFFSET} r="15" fill={COLORS.black} />
          <Circle
            cx="45"
            cy="0"
            r="15"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Speed lines */}
        <Path d="M100 100 L130 85" stroke={COLORS.black} strokeWidth={3} />
        <Path d="M105 115 L140 105" stroke={COLORS.black} strokeWidth={3} />
        <Path d="M100 130 L130 125" stroke={COLORS.black} strokeWidth={3} />

        {/* Decorative blocks */}
        <Rect
          x="160"
          y="10"
          width="15"
          height="15"
          fill={COLORS.blue}
          stroke={COLORS.black}
          strokeWidth={2}
        />
        <Rect
          x="5"
          y="5"
          width="25"
          height="25"
          fill={COLORS.green}
          stroke={COLORS.black}
          strokeWidth={2}
        />
        <Circle cx="270" cy="30" r="8" fill={COLORS.yellow} stroke={COLORS.black} strokeWidth={2} />
      </Svg>
    </View>
  )
}
