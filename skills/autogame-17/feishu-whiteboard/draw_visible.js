const { addNodes } = require('./draw')

function createWorkingNode(text, x, y, color) {
  return {
    type: 'composite_shape',
    composite_shape: { type: 'round_rect' },
    x: x,
    y: y,
    width: 140,
    height: 80,
    style: {
      fill_color: color,
      fill_opacity: 100,
    },
    text: {
      text: text,
      font_size: 14,
      horizontal_align: 'center',
    },
  }
}

function createWorkingArrow(x1, y1, x2, y2) {
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

  // Target: Directly below the existing diagram (y ~ 7300-7500)
  const startX = 1250
  const startY = 7800 // Visible area
  const gap = 200

  const nodes = [
    createWorkingNode('📱 App', startX, startY, '#bae7ff'),
    createWorkingNode('☁️ Cloud', startX + gap, startY, '#d9f7be'),
    createWorkingNode('📛 Badge', startX + gap * 2, startY, '#efdbff'),

    createWorkingArrow(startX + 140, startY + 40, startX + gap, startY + 40),
    createWorkingArrow(startX + gap + 140, startY + 40, startX + gap * 2, startY + 40),
  ]

  try {
    console.log('Drawing in Visible Area (y=7800)...')
    await addNodes(boardId, nodes)
    console.log('Success!')
  } catch (e) {
    console.error('Fail:', e.message)
  }
}

main()
