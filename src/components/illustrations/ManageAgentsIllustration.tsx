import React from 'react'
import { View } from 'react-native'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

// Neo-Brutalism colors
const COLORS = {
  yellow: '#FFE600',
  pink: '#FF6B9D',
  blue: '#4DAFFF',
  green: '#7CFF6B',
  black: '#000000',
  white: '#FFFFFF',
}

const SHADOW_OFFSET = 6
const STROKE = 3

export function ManageAgentsIllustration() {
  return (
    <View style={{ width: 280, height: 260, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        {/* Pointing hand */}
        <G transform="translate(80, 10)">
          {/* Shadow */}
          <Path
            d="M0 50 L30 20 L70 35 L110 10 L130 30 L100 60 L40 70 Z"
            fill={COLORS.black}
            transform={`translate(${SHADOW_OFFSET}, ${SHADOW_OFFSET})`}
          />
          {/* Hand shape */}
          <Path
            d="M0 50 L30 20 L70 35 L110 10 L130 30 L100 60 L40 70 Z"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Finger */}
          <Rect
            x="105"
            y="5"
            width="50"
            height="20"
            fill={COLORS.black}
            transform={`translate(${SHADOW_OFFSET}, ${SHADOW_OFFSET})`}
          />
          <Rect
            x="105"
            y="5"
            width="50"
            height="20"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Agent 1 - Circle */}
        <G transform="translate(20, 100)">
          {/* Shadow */}
          <Circle cx={55 + SHADOW_OFFSET} cy={55 + SHADOW_OFFSET} r="55" fill={COLORS.black} />
          {/* Body */}
          <Circle
            cx="55"
            cy="55"
            r="55"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Eye */}
          <Circle
            cx="40"
            cy="45"
            r="15"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle
            cx="70"
            cy="45"
            r="15"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle cx="40" cy="45" r="7" fill={COLORS.black} />
          <Circle cx="70" cy="45" r="7" fill={COLORS.black} />
          {/* Mouth */}
          <Rect x="35" y="70" width="40" height="10" fill={COLORS.black} />
          {/* Antenna */}
          <Rect x="50" y="-20" width="10" height="25" fill={COLORS.black} />
          <Circle
            cx="55"
            cy="-25"
            r="12"
            fill={COLORS.yellow}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Agent 2 - Square */}
        <G transform="translate(105, 140)">
          {/* Shadow */}
          <Rect x={SHADOW_OFFSET} y={SHADOW_OFFSET} width="70" height="70" fill={COLORS.black} />
          {/* Body */}
          <Rect
            x="0"
            y="0"
            width="70"
            height="70"
            fill={COLORS.blue}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Single eye */}
          <Circle
            cx="35"
            cy="30"
            r="18"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle cx="35" cy="30" r="8" fill={COLORS.black} />
          {/* Mouth */}
          <Rect x="15" y="55" width="40" height="8" fill={COLORS.black} />
          {/* Antenna */}
          <Rect x="30" y="-18" width="10" height="20" fill={COLORS.black} />
          <Rect
            x="22"
            y="-30"
            width="26"
            height="15"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Agent 3 - Triangle */}
        <G transform="translate(195, 95)">
          {/* Shadow */}
          <Path
            d="M40 0 L80 70 L0 70 Z"
            fill={COLORS.black}
            transform={`translate(${SHADOW_OFFSET}, ${SHADOW_OFFSET})`}
          />
          {/* Body */}
          <Path
            d="M40 0 L80 70 L0 70 Z"
            fill={COLORS.green}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          {/* Eye */}
          <Circle
            cx="40"
            cy="40"
            r="15"
            fill={COLORS.white}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
          <Circle cx="40" cy="40" r="7" fill={COLORS.black} />
          {/* Mouth */}
          <Rect x="25" y="55" width="30" height="6" fill={COLORS.black} />
          {/* Antenna */}
          <Rect x="36" y="-15" width="8" height="18" fill={COLORS.black} />
          <Circle
            cx="40"
            cy="-22"
            r="10"
            fill={COLORS.pink}
            stroke={COLORS.black}
            strokeWidth={STROKE}
          />
        </G>

        {/* Connection lines */}
        <Path d="M200 40 L100 95" stroke={COLORS.black} strokeWidth={4} strokeDasharray="10,8" />
        <Path d="M200 40 L140 135" stroke={COLORS.black} strokeWidth={4} strokeDasharray="10,8" />
        <Path d="M200 40 L230 90" stroke={COLORS.black} strokeWidth={4} strokeDasharray="10,8" />

        {/* Decorative elements */}
        <Rect
          x="5"
          y="230"
          width="20"
          height="20"
          fill={COLORS.yellow}
          stroke={COLORS.black}
          strokeWidth={2}
        />
        <Circle cx="270" cy="240" r="10" fill={COLORS.pink} stroke={COLORS.black} strokeWidth={2} />
      </Svg>
    </View>
  )
}
