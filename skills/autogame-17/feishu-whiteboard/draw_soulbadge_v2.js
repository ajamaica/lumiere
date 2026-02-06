const { addNodes } = require('./draw')

// Rebuilding functionality layer by layer
function createWorkingNode(text, x, y, color) {
  return {
    type: 'composite_shape',
    composite_shape: { type: 'round_rect' },
    x: x,
    y: y,
    width: 160,
    height: 80,
    // Style seems to be the breaker. Let's add it back carefully.
    style: {
      fill_color: color,
      fill_opacity: 100, // Required if color is set
      // Omit border_color_type etc. for now, let defaults handle it
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
      end: { position: { x: x2, y: y2 } },
    },
  }
}

async function main() {
  const boardId = 'N3UOwBzjNhgPyIbgH7vcWznSnRc'
  const startX = 2000
  const startY = 8500 // New row
  const gap = 250

  const nodes = [
    createWorkingNode('📱 App', startX, startY, '#bae7ff'),
    createWorkingNode('☁️ Cloud', startX + gap, startY, '#d9f7be'),
    createWorkingNode('📛 Badge', startX + gap * 2, startY, '#efdbff'),

    createWorkingArrow(startX + 160, startY + 40, startX + gap, startY + 40),
    createWorkingArrow(startX + gap + 160, startY + 40, startX + gap * 2, startY + 40),
  ]

  try {
    console.log('Attempting V2 Draw...')
    await addNodes(boardId, nodes)
    console.log('V2 Success!')
  } catch (e) {
    console.error('V2 Fail:', e.message)
  }
}

main()
