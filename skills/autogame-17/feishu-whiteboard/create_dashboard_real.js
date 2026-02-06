const { addNodes } = require('./draw')

// Correct Schema Helper based on Reverse Engineering
function createRealShape(id, shapeType, x, y, width, height, text, fillColor) {
  return {
    id: id,
    type: 'composite_shape',
    composite_shape: {
      type: shapeType, // rect, round_rect, circle, diamond
    },
    x: x,
    y: y,
    width: width,
    height: height,
    style: {
      fill_color: fillColor || '#ffffff',
      fill_opacity: 100,
      border_color: '#000000',
      border_width: 'regular', // or "narrow"
    },
    text: {
      text: text,
      font_size: 14,
      horizontal_align: 'center',
      vertical_align: 'mid',
    },
  }
}

function createRealConnector(id, startId, endId, startSide = 'right', endSide = 'left') {
  // Simplified connector logic - Feishu connectors link shapes by ID, not just coordinates if supported?
  // Actually the read output showed connectors linking positions.
  // Linking by ID usually requires "start_object_id" and "end_object_id" which IS in my original draw.js schema.
  // Let's stick to the ID linking, hoping it works with the correct endpoint.
  // If not, we might need to calculate coordinates.
  // Wait, read output shows: "start": { "position": { "x": ... } }
  // But docs say object linking is possible. Let's try object linking first.
  return {
    id: id,
    type: 'connector',
    connector: {
      start: { id: startId, side: startSide }, // Hypothetical, need to check if ID binding works
      end: { id: endId, side: endSide },
    },
  }
}

// Fallback: Coordinate Connector
function createCoordinateConnector(id, x1, y1, x2, y2) {
  return {
    id: id,
    type: 'connector',
    connector: {
      start: { position: { x: x1, y: y1 } },
      end: { position: { x: x2, y: y2 }, arrow_style: 'triangle_arrow' },
      shape: 'curved',
    },
  }
}

async function main() {
  const boardId = 'N3UOwBzjNhgPyIbgH7vcWznSnRc' // Fan Maowei's Board
  const startX = 3000
  const startY = 7000

  const nodes = []

  // 1. Center: Avatar (Circle)
  nodes.push(
    createRealShape(
      'node_center',
      'circle',
      startX,
      startY,
      200,
      200,
      'Live2D Avatar\n(Interaction)',
      '#ffccc7',
    ),
  ) // Red-ish

  // 2. Left: Work (Rect)
  nodes.push(
    createRealShape(
      'node_left',
      'rect',
      startX - 400,
      startY,
      200,
      400,
      'Workbench\n(Skills/CLI)',
      '#bae7ff',
    ),
  ) // Blue-ish

  // 3. Right: Life (Rect)
  nodes.push(
    createRealShape(
      'node_right',
      'rect',
      startX + 400,
      startY,
      200,
      400,
      'Life & Memory\n(Soul)',
      '#d9f7be',
    ),
  ) // Green-ish

  // 4. Bottom: Assets (Rect)
  nodes.push(
    createRealShape(
      'node_bottom',
      'rect',
      startX,
      startY + 400,
      600,
      150,
      'Asset Library\n(Media)',
      '#efdbff',
    ),
  ) // Purple-ish

  // 5. Connectors (Using Coordinates for safety since I know the layout)
  // Left -> Center
  nodes.push(createCoordinateConnector('conn_1', startX - 200, startY + 100, startX, startY + 100))
  // Center -> Right
  nodes.push(
    createCoordinateConnector('conn_2', startX + 200, startY + 100, startX + 400, startY + 100),
  )
  // Center -> Bottom
  nodes.push(
    createCoordinateConnector('conn_3', startX + 100, startY + 200, startX + 100, startY + 400),
  )

  try {
    await addNodes(boardId, nodes)
    console.log('Dashboard drawn successfully!')
  } catch (e) {
    console.error('Failed:', e.message)
  }
}

main()
