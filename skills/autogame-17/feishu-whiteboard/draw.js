const { apiRequest } = require('./api')

async function addNodes(whiteboardId, nodes) {
  if (!whiteboardId) {
    throw new Error('Whiteboard ID is required')
  }

  try {
    console.log(`Adding ${nodes.length} nodes to board ${whiteboardId}...`)
    const result = await apiRequest(
      'POST',
      `/open-apis/board/v1/whiteboards/${whiteboardId}/nodes`,
      {
        nodes: nodes,
      },
    )
    console.log('Nodes added successfully!')
    return result
  } catch (error) {
    console.error('Failed to add nodes:', error.message)
    throw error
  }
}

// Helper to create a shape node
function createShape(id, shapeType, x, y, width, height, text = '', color = null) {
  const node = {
    id: id,
    type: 'shape',
    shape_type: shapeType, // rect, circle, ellipse, etc.
    x: x,
    y: y,
    width: width,
    height: height,
    style: {},
  }

  if (color) {
    node.style.fill_color = color
  }

  if (text) {
    node.text = {
      content: text,
    }
  }

  return node
}

// Helper to create a connector
function createConnector(id, startId, endId) {
  return {
    id: id,
    type: 'connector',
    start_object_id: startId,
    end_object_id: endId,
  }
}

if (require.main === module) {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.log('Usage: node draw.js <whiteboard_id> [demo]')
    process.exit(1)
  }

  const boardId = args[0]
  const mode = args[1]

  if (mode === 'demo') {
    const nodes = [
      createShape('node1', 'rect', 100, 100, 150, 80, 'Service A'),
      createShape('node2', 'circle', 400, 100, 100, 100, 'DB', '#ffcc00'),
      createConnector('conn1', 'node1', 'node2'),
    ]
    addNodes(boardId, nodes).catch(() => process.exit(1))
  } else {
    console.log("Please provide 'demo' as second argument to run the demo.")
  }
}

module.exports = { addNodes, createShape, createConnector }
