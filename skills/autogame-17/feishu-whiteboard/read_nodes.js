const { apiRequest } = require('./api')

async function listNodes(whiteboardId) {
  if (!whiteboardId) {
    throw new Error('Whiteboard ID is required')
  }

  try {
    console.log(`Listing nodes from board ${whiteboardId}...`)
    const result = await apiRequest('GET', `/open-apis/board/v1/whiteboards/${whiteboardId}/nodes`)
    console.log('Nodes fetched successfully!')
    return result
  } catch (error) {
    console.error('Failed to list nodes:', error.message)
    throw error
  }
}

if (require.main === module) {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.log('Usage: node read_nodes.js <whiteboard_id>')
    process.exit(1)
  }

  const boardId = args[0]
  listNodes(boardId)
    .then((data) => console.log(JSON.stringify(data, null, 2)))
    .catch(() => process.exit(1))
}

module.exports = { listNodes }
