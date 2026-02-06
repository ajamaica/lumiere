const { addNodes } = require('./draw')

// Standard Node
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
  const boardId = 'Qxqpwl88FhdtPtbitIjc015en7e' // New Board ID

  // Start fresh at Origin
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
    console.log(`Drawing on NEW Board ${boardId}...`)
    await addNodes(boardId, nodes)
    console.log('Success!')
  } catch (e) {
    console.error('Fail:', e.message)
  }
}

main()
