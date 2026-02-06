const { apiRequest } = require('./api')

async function updateNode(boardId, nodeId, x, y) {
  try {
    console.log(`Moving node ${nodeId} to (${x}, ${y})...`)
    const res = await apiRequest(
      'PUT',
      `/open-apis/board/v1/whiteboards/${boardId}/nodes/${nodeId}`,
      {
        node: {
          x: x,
          y: y,
        },
      },
    )
    console.log(`Moved ${nodeId}: Success`)
  } catch (e) {
    console.error(`Failed to move ${nodeId}:`, e.message)
  }
}

async function main() {
  const boardId = 'N3UOwBzjNhgPyIbgH7vcWznSnRc'

  // IDs from the previous read output
  // App: o2:40 (2000, 8500) -> Move to (1250, 7800)
  // Cloud: o2:41 (2250, 8500) -> Move to (1550, 7800)
  // Badge: o2:42 (2500, 8500) -> Move to (1850, 7800)
  // Arrows need to be deleted/redrawn or moved. Connectors usually auto-update if linked by ID, but mine were coord-based.
  // If they were coord-based, moving the shapes won't move the arrows' endpoints if they aren't bound.
  // My previous script used coordinate connectors. So I need to delete the old arrows and draw new ones, or just leave them as debris for now and focus on showing the nodes.

  // Let's just move the shapes first so he can SEE them.

  await updateNode(boardId, 'o2:40', 1250, 7800)
  await updateNode(boardId, 'o2:41', 1550, 7800)
  await updateNode(boardId, 'o2:42', 1850, 7800)
}

main()
