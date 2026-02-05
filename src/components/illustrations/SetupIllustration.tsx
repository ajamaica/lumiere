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

export function SetupIllustration() {
  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        {/* Plug */}
        <G transform="translate(20, 70)">
          {/* Plug body shadow */}
          <Rect
            x={SHADOW_OFFSET}
            y={20 + SHADOW_OFFSET}
            width="70"
            height="50"
            fill={COLORS.black}
          />
          {/* Plug body */}
          <Rect
            x="0"
            y="20"
            width="70"
            height="50"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Prongs */}
          <Rect
            x={75 + SHADOW_OFFSET}
            y={30 + SHADOW_OFFSET}
            width="35"
            height="12"
            fill={COLORS.black}
          />
          <Rect
            x="75"
            y="30"
            width="35"
            height="12"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Rect
            x={75 + SHADOW_OFFSET}
            y={48 + SHADOW_OFFSET}
            width="35"
            height="12"
            fill={COLORS.black}
          />
          <Rect
            x="75"
            y="48"
            width="35"
            height="12"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Cable */}
          <Path
            d="M0 45 Q-25 45 -30 80 Q-35 130 -10 160"
            fill="none"
            stroke={COLORS.black}
            strokeWidth={14}
          />
          <Path
            d="M0 45 Q-25 45 -30 80 Q-35 130 -10 160"
            fill="none"
            stroke={COLORS.yellow}
            strokeWidth={10}
          />
        </G>

        {/* Server/Socket */}
        <G transform="translate(150, 40)">
          {/* Server shadow */}
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="100" height="140" fill={COLORS.black} />
          {/* Server body */}
          <Rect
            x="0"
            y="0"
            width="100"
            height="140"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Socket holes */}
          <Rect
            x="-15"
            y="45"
            width="20"
            height="50"
            fill={COLORS.black}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle cx="-5" cy="58" r="6" fill={COLORS.white} />
          <Circle cx="-5" cy="78" r="6" fill={COLORS.white} />
          {/* Status light */}
          <Circle cx={50 + 4} cy={25 + 4} r="15" fill={COLORS.black} />
          <Circle
            cx="50"
            cy="25"
            r="15"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Screen lines */}
          <Rect x="15" y="55" width="70" height="10" fill={COLORS.black} />
          <Rect x="15" y="75" width="50" height="10" fill={COLORS.black} />
          <Rect x="15" y="95" width="60" height="10" fill={COLORS.black} />
          {/* Blinking cursor */}
          <Rect x="80" y="95" width="5" height="10" fill={COLORS.white} />
        </G>

        {/* Connection spark */}
        <G transform="translate(115, 85)">
          {/* Spark shadow */}
          <Path
            d="M0 0 L15 20 L5 20 L20 45 L8 25 L18 25 L0 0"
            fill={COLORS.black}
            transform={`translate(${SHADOW_OFFSET}, ${SHADOW_OFFSET})`}
          />
          {/* Spark */}
          <Path
            d="M0 0 L15 20 L5 20 L20 45 L8 25 L18 25 L0 0"
            fill={COLORS.orange}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Checkmark badge */}
        <G transform="translate(200, 195)">
          {/* Shadow */}
          <Circle cx={30 + SHADOW_OFFSET} cy={30 + SHADOW_OFFSET} r="30" fill={COLORS.black} />
          {/* Circle */}
          <Circle
            cx="30"
            cy="30"
            r="30"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Checkmark */}
          <Path
            d="M15 30 L25 40 L45 18"
            fill="none"
            stroke={COLORS.black}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>

        {/* Motion lines */}
        <Path d="M100 105 L85 105" stroke={COLORS.black} strokeWidth={4} />
        <Path d="M100 120 L80 120" stroke={COLORS.black} strokeWidth={4} />
        <Path d="M100 135 L85 135" stroke={COLORS.black} strokeWidth={4} />

        {/* Decorative elements */}
        <Rect
          x="5"
          y="10"
          width="25"
          height="25"
          fill={COLORS.pink}
          stroke={COLORS.black}
          strokeWidth={2}
        />
        <Circle cx="60" cy="20" r="10" fill={COLORS.green} stroke={COLORS.black} strokeWidth={2} />
        <Rect
          x="5"
          y="235"
          width="15"
          height="15"
          fill={COLORS.yellow}
          stroke={COLORS.black}
          strokeWidth={2}
        />
        <Circle cx="270" cy="15" r="8" fill={COLORS.blue} stroke={COLORS.black} strokeWidth={2} />
      </Svg>
    </View>
  )
}
