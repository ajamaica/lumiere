const { addNodes } = require('./draw')

async function main() {
  const boardId = 'N3UOwBzjNhgPyIbgH7vcWznSnRc'

  // Exact clone of a valid node from read_nodes.js output
  const debugNode = {
    id: 'debug_node_001',
    type: 'composite_shape',
    composite_shape: {
      type: 'rect',
    },
    x: 3000,
    y: 7000,
    width: 200,
    height: 100,
    angle: 0,
    style: {
      border_color: '#1890ff',
      border_color_type: 1,
      border_opacity: 100,
      border_style: 'solid',
      border_width: 'narrow',
      fill_color: '#bae7ff',
      fill_color_type: 1,
      fill_opacity: 100,
    },
    text: {
      text: 'Debug Node',
      font_size: 14,
      font_weight: 'regular',
      horizontal_align: 'center',
      vertical_align: 'mid',
      text_color: '#1f2329',
      text_color_type: 0,
    },
  }

  try {
    await addNodes(boardId, [debugNode])
    console.log('Debug node added successfully!')
  } catch (e) {
    console.error('Debug failed:', e.message)
  }
}

main()
