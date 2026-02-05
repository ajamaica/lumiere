import React from 'react'
import { View } from 'react-native'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

// Neo-Brutalism colors
const COLORS = {
  yellow: '#FFE600',
  pink: '#FF6B9D',
  blue: '#4DAFFF',
  green: '#7CFF6B',
  purple: '#B388FF',
  black: '#000000',
  white: '#FFFFFF',
}

const SHADOW_OFFSET = 6
const STROKE = 3

export function CustomizableIllustration() {
  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        {/* Large gear */}
        <G transform="translate(20, 20)">
          {/* Gear shadow */}
          <Circle cx={70 + SHADOW_OFFSET} cy={70 + SHADOW_OFFSET} r="65" fill={COLORS.black} />
          {/* Gear body */}
          <Circle
            cx="70"
            cy="70"
            r="65"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Teeth - simplified as rectangles */}
          <Rect
            x="60"
            y="-10"
            width="20"
            height="25"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="60"
            y="125"
            width="20"
            height="25"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="-10"
            y="60"
            width="25"
            height="20"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="125"
            y="60"
            width="25"
            height="20"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Center hole */}
          <Circle
            cx="70"
            cy="70"
            r="25"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle cx="70" cy="70" r="10" fill={COLORS.black} />
        </G>

        {/* Small gear */}
        <G transform="translate(160, 10)">
          <Circle cx={35 + SHADOW_OFFSET} cy={35 + SHADOW_OFFSET} r="35" fill={COLORS.black} />
          <Circle
            cx="35"
            cy="35"
            r="35"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="28"
            y="-8"
            width="14"
            height="18"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="28"
            y="60"
            width="14"
            height="18"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="-8"
            y="28"
            width="18"
            height="14"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x="60"
            y="28"
            width="18"
            height="14"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle
            cx="35"
            cy="35"
            r="15"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle cx="35" cy="35" r="6" fill={COLORS.black} />
        </G>

        {/* Slider */}
        <G transform="translate(20, 180)">
          {/* Track shadow */}
          <Rect
            x={SHADOW_OFFSET}
            y={12 + SHADOW_OFFSET}
            width="160"
            height="16"
            fill={COLORS.black}
          />
          {/* Track */}
          <Rect
            x="0"
            y="12"
            width="160"
            height="16"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Handle shadow */}
          <Circle cx={110 + SHADOW_OFFSET} cy={20 + SHADOW_OFFSET} r="22" fill={COLORS.black} />
          {/* Handle */}
          <Circle
            cx="110"
            cy="20"
            r="22"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Color palette */}
        <G transform="translate(175, 100)">
          {/* Background shadow */}
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="90" height="90" fill={COLORS.black} />
          {/* Background */}
          <Rect
            x="0"
            y="0"
            width="90"
            height="90"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Color squares */}
          <Rect
            x="10"
            y="10"
            width="30"
            height="30"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={2}
          />
          <Rect
            x="50"
            y="10"
            width="30"
            height="30"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={2}
          />
          <Rect
            x="10"
            y="50"
            width="30"
            height="30"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={2}
          />
          <Rect
            x="50"
            y="50"
            width="30"
            height="30"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={2}
          />
          {/* Selection indicator */}
          <Rect
            x="5"
            y="5"
            width="40"
            height="40"
            fill="none"
            stroke={COLORS.black}
            strokeWidth={4}
          />
        </G>

        {/* Wrench */}
        <G transform="translate(100, 115) rotate(-45)">
          {/* Handle shadow */}
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="70" height="20" fill={COLORS.black} />
          {/* Handle */}
          <Rect
            x="0"
            y="0"
            width="70"
            height="20"
            fill={COLORS.purple}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Head shadow */}
          <Path
            d="M-15 -5 L-15 25 L10 25 L15 15 L15 5 L10 -5 Z"
            fill={COLORS.black}
            transform={`translate(${SHADOW_OFFSET}, ${SHADOW_OFFSET})`}
          />
          {/* Head */}
          <Path
            d="M-15 -5 L-15 25 L10 25 L15 15 L15 5 L10 -5 Z"
            fill={COLORS.purple}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Jaw */}
          <Rect x="-5" y="3" width="12" height="14" fill={COLORS.white} />
        </G>

        {/* Decorative elements */}
        <Rect
          x="5"
          y="240"
          width="20"
          height="15"
          fill={COLORS.green}
          stroke={COLORS.black}
          strokeWidth={2}
        />
        <Circle cx="260" cy="250" r="8" fill={COLORS.pink} stroke={COLORS.black} strokeWidth={2} />
        <Rect
          x="230"
          y="85"
          width="12"
          height="12"
          fill={COLORS.yellow}
          stroke={COLORS.black}
          strokeWidth={2}
        />
      </Svg>
    </View>
  )
}
