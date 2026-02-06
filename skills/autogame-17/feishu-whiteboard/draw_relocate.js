const { addNodes } = require('./draw')

// Minimal Node (Proven Working)
function createNode(text, x, y, color) {
  return {
    type: 'composite_shape',
    composite_shape: { type: 'round_rect' },
    x: x,
    y: y,
    width: 160,
    height: 80,
    style: { fill_color: color, fill_opacity: 100 },
    text: { text: text, font_size: 14, horizontal_align: 'center' },
  }
}

function createArrow(x1, y1, x2, y2) {
  return {
    type: 'connector',
    connector: {
      start: { position: { x: x1, y: y1 } },
      end: { position: { x: x2, y: y2 }, arrow_style: 'triangle_arrow' },
    },
  }
}

async function main() {
  const boardId = 'N3UOwBzjNhgPyIbgH7vcWznSnRc'

  // Target Coordinates (Near the massive object o8:3 at 26720, 83320)
  // We will place it slightly to the right and top
  const startX = 26800
  const startY = 83400
  const gap = 300

  const nodes = [
    createNode('📱 App', startX, startY, '#bae7ff'),
    createNode('☁️ Cloud', startX + gap, startY, '#d9f7be'),
    createNode('📛 Badge', startX + gap * 2, startY, '#efdbff'),

    createArrow(startX + 160, startY + 40, startX + gap, startY + 40),
    createArrow(startX + gap + 160, startY + 40, startX + gap * 2, startY + 40),
  ]

  try {
    console.log(`Relocating to Giant's Shoulder (${startX}, ${startY})...`)
    await addNodes(boardId, nodes)
    console.log('Success!')
  } catch (e) {
    console.error('Fail:', e.message)
  }
}

main()
