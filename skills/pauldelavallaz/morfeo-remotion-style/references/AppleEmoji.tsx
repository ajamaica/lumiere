import React from 'react'

// Convert emoji to unified codepoint for Apple emoji CDN
// Some emojis need the variation selector (fe0f) in the filename
const emojiToCodepoint = (emoji: string): string => {
  const codepoints: string[] = []
  for (const char of emoji) {
    const code = char.codePointAt(0)
    if (code) {
      codepoints.push(code.toString(16))
    }
  }
  return codepoints.join('-')
}

interface AppleEmojiProps {
  emoji: string
  size?: number
  style?: React.CSSProperties
}

export const AppleEmoji: React.FC<AppleEmojiProps> = ({ emoji, size = 64, style = {} }) => {
  const codepoint = emojiToCodepoint(emoji)
  // Apple emoji images from jsDelivr CDN
  const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${codepoint}.png`

  return (
    <img
      src={url}
      alt={emoji}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  )
}

// Inline emoji for text (smaller, inline with text)
export const InlineEmoji: React.FC<AppleEmojiProps> = ({ emoji, size = 32, style = {} }) => {
  return (
    <AppleEmoji
      emoji={emoji}
      size={size}
      style={{
        marginLeft: 4,
        marginRight: 4,
        ...style,
      }}
    />
  )
}
