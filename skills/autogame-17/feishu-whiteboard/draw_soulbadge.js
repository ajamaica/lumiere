const { addNodes } = require('./draw')

// STRICTLY Minimal Schema (Proven Working)
function createNode(text, x, y, color) {
  return {
    type: 'composite_shape',
    composite_shape: {
      type: 'round_rect',
    },
    x: x,
    y: y,
    width: 160,
    height: 80,
    style: {
      fill_color: color,
      fill_opacity: 100,
    },
    text: {
      text: text,
      font_size: 14,
      font_weight: 'regular',
      horizontal_align: 'center',
      vertical_align: 'mid',
    },
  }
}

function createArrow(startX, startY, endX, endY) {
  return {
    type: 'connector',
    connector: {
      start: { position: { x: startX, y: startY } },
      end: { position: { x: endX, y: endY }, arrow_style: 'triangle_arrow' },
    },
  }
}

async function main() {
  const boardId = 'N3UOwBzjNhgPyIbgH7vcWznSnRc'

  // Absolute Origin (0,0)
  const startX = 0
  const startY = 0
  const gap = 300

  const nodes = [
    createNode('📱 App', startX, startY, '#bae7ff'),
    createNode('☁️ Cloud', startX + gap, startY, '#d9f7be'),
    createNode('📛 Badge', startX + gap * 2, startY, '#efdbff'),

    createArrow(startX + 160, startY + 40, startX + gap, startY + 40),
    createArrow(startX + gap + 160, startY + 40, startX + gap * 2, startY + 40),
  ]

  try {
    console.log(`Drawing at (0,0)...`)
    await addNodes(boardId, nodes)
    console.log('Success!')
  } catch (e) {
    console.error('Failed:', e.message)
  }
}

main()
