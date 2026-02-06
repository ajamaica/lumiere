const { apiRequest } = require('./api')

async function createWhiteboard(title = 'Untitled Whiteboard') {
  try {
    console.log(`Creating whiteboard: ${title}...`)
    const result = await apiRequest('POST', '/open-apis/board/v1/whiteboards', {
      title: title,
    })
    console.log('Whiteboard created successfully!')
    console.log(JSON.stringify(result, null, 2))
    return result
  } catch (error) {
    console.error('Failed to create whiteboard:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  const title = process.argv[2] || `New Board ${new Date().toISOString()}`
  createWhiteboard(title)
}

module.exports = { createWhiteboard }
