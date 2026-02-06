const { createWhiteboard } = require('./create')
const { addNodes, createShape, createConnector } = require('./draw')

async function runTest() {
  try {
    console.log('=== Starting Feishu Whiteboard Test ===')

    // 1. Create Board
    const boardData = await createWhiteboard(`Test Board ${new Date().toLocaleTimeString()}`)
    if (!boardData || !boardData.whiteboard_id) {
      throw new Error('Failed to get whiteboard_id from creation response')
    }
    const boardId = boardData.whiteboard_id
    console.log(`Board Created: ${boardId}`)

    // 2. Prepare Nodes
    // Note: Using random IDs to ensure uniqueness if needed, though simple strings usually work per board
    const nodes = [
      createShape('shape_1', 'rect', 100, 100, 200, 100, 'Frontend', '#e6f7ff'),
      createShape('shape_2', 'rect', 500, 100, 200, 100, 'Backend', '#fff7e6'),
      createConnector('conn_1', 'shape_1', 'shape_2'),
    ]

    // 3. Add Nodes
    await addNodes(boardId, nodes)
    console.log('=== Test Complete: Success ===')
    console.log(`URL: https://open.feishu.cn/board/${boardId}`) // Guessing URL format
  } catch (e) {
    console.error('Test Failed:', e)
    process.exit(1)
  }
}

runTest()
