import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

import { AppleEmoji, InlineEmoji } from './AppleEmoji'
import { BrandIcon } from './BrandIcon'
import { colors, fonts } from './styles'

export const MorfeoStory1: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Animation timings
  const tagOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const tagY = spring({ frame, fps, from: -50, to: 0, config: { damping: 15 } })

  const emojiScale = spring({ frame: frame - 15, fps, from: 0, to: 1, config: { damping: 10 } })

  const titleOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' })
  const titleY = spring({ frame: frame - 30, fps, from: 30, to: 0, config: { damping: 15 } })

  const line1Opacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' })
  const line2Opacity = interpolate(frame, [90, 110], [0, 1], { extrapolateRight: 'clamp' })
  const line3Opacity = interpolate(frame, [120, 140], [0, 1], { extrapolateRight: 'clamp' })

  // Pulsing effect for emoji
  const pulse = interpolate(frame % 60, [0, 30, 60], [1, 1.1, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.black,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
        fontFamily: fonts.body,
      }}
    >
      {/* Top tag */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
          fontSize: 28,
          fontWeight: 600,
          fontFamily: fonts.body,
          color: colors.black,
          backgroundColor: colors.lime,
          padding: '12px 28px',
          borderRadius: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <AppleEmoji emoji="🤖" size={28} /> ESTO ES BLACK MIRROR
      </div>

      {/* Emoji */}
      <div
        style={{
          marginBottom: 40,
          transform: `scale(${emojiScale * pulse})`,
        }}
      >
        <AppleEmoji emoji="🗣️" size={140} />
      </div>

      {/* Title - Instrument Serif */}
      <h1
        style={{
          fontSize: 68,
          fontWeight: 400,
          fontFamily: fonts.heading,
          fontStyle: 'italic',
          color: colors.white,
          textAlign: 'center',
          lineHeight: 1.15,
          margin: 0,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Todo el mundo habla de <span style={{ color: colors.lime }}>OpenClaw</span>
      </h1>

      {/* Subtitle lines - DM Sans */}
      <div
        style={{
          marginTop: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <p
          style={{
            fontSize: 38,
            fontFamily: fonts.body,
            color: colors.gray,
            margin: 0,
            opacity: line1Opacity,
          }}
        >
          El asistente de IA por
        </p>
        <div
          style={{
            display: 'flex',
            gap: 30,
            opacity: line2Opacity,
            alignItems: 'center',
          }}
        >
          {/* WhatsApp */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <BrandIcon brand="whatsapp" size={44} />
            <span
              style={{
                fontSize: 36,
                fontFamily: fonts.body,
                fontWeight: 500,
                color: '#25D366',
              }}
            >
              WhatsApp
            </span>
          </div>

          <span style={{ color: colors.gray, fontSize: 36 }}>y</span>

          {/* Telegram */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <BrandIcon brand="telegram" size={44} />
            <span
              style={{
                fontSize: 36,
                fontFamily: fonts.body,
                fontWeight: 500,
                color: '#26A5E4',
              }}
            >
              Telegram
            </span>
          </div>
        </div>
        <p
          style={{
            fontSize: 38,
            fontFamily: fonts.body,
            color: colors.gray,
            margin: 0,
            opacity: line3Opacity,
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Le mandás un audio y te responde <InlineEmoji emoji="🎙️" size={38} />
        </p>
      </div>
    </AbsoluteFill>
  )
}
