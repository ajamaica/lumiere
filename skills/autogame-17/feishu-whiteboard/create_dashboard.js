const { createWhiteboard } = require('./create')
const { addNodes, createShape, createConnector } = require('./draw')

async function main() {
  try {
    // 1. Create Board
    console.log('Creating Dashboard Concept Board...')
    const board = await createWhiteboard('🤖 AI Agent Dashboard (Concept)')
    const boardId = board.whiteboard_id
    console.log(`Board Created: ${boardId}`)

    // 2. Define Nodes
    const nodes = []

    // Center: Live2D Anchor
    nodes.push(
      createShape('center_avatar', 'circle', 0, 0, 200, 200, 'Live2D\nAvatar\n(Center)', {
        r: 255,
        g: 200,
        b: 200,
        a: 1,
      }),
    )

    // Left: Work Bench
    nodes.push(
      createShape(
        'left_work',
        'rect',
        -400,
        0,
        250,
        400,
        '🛠️ Workbench\n- Skills\n- Terminal\n- Tasks',
        { r: 200, g: 200, b: 255, a: 1 },
      ),
    )

    // Right: Life Area
    nodes.push(
      createShape(
        'right_life',
        'rect',
        400,
        0,
        250,
        400,
        '🧠 Life & Memory\n- Diary\n- Friends\n- Soul.md',
        { r: 200, g: 255, b: 200, a: 1 },
      ),
    )

    // Bottom: Assets (Background/Back)
    nodes.push(
      createShape(
        'bottom_assets',
        'rect',
        0,
        400,
        600,
        200,
        '📦 Asset Library\n- Images\n- Stickers\n- Voice',
        { r: 255, g: 255, b: 200, a: 1 },
      ),
    )

    // Connectors
    nodes.push(createConnector('conn_work', 'center_avatar', 'left_work'))
    nodes.push(createConnector('conn_life', 'center_avatar', 'right_life'))
    nodes.push(createConnector('conn_asset', 'center_avatar', 'bottom_assets'))

    // 3. Draw
    await addNodes(boardId, nodes)

    console.log(`SUCCESS: ${board.url}`)
  } catch (e) {
    console.error('Error:', e.message)
  }
}

main()
