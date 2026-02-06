const { apiRequest } = require('./api')

async function testAdd(boardId) {
  const node = {
    type: 'composite_shape',
    composite_shape: { type: 'rect' },
    x: 2000,
    y: 8000, // Safe distance
    width: 200,
    height: 100,
    style: {
      fill_color: '#ffffff',
      fill_color_type: 1, // Color type: 1 (Custom?)
      border_color: '#000000',
      border_color_type: 1,
      border_width: 'regular',
    },
    text: {
      text: 'Write Test',
      font_size: 14,
      horizontal_align: 'center',
      vertical_align: 'mid',
      text_color: '#000000',
      text_color_type: 0, // Color type: 0
    },
  }

  try {
    console.log(`Adding node to ${boardId}...`)
    const res = await apiRequest('POST', `/open-apis/board/v1/whiteboards/${boardId}/nodes`, {
      nodes: [node],
    })
    console.log('Success:', JSON.stringify(res))
  } catch (e) {
    console.error('Fail:', e.message)
  }
}

if (require.main === module) {
  testAdd(process.argv[2])
}
