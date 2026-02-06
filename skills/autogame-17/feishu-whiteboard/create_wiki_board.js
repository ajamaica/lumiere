const { apiRequest } = require('./api')

async function createWikiBoard(spaceId, parentToken, title) {
  try {
    console.log(`Creating Wiki Board in Space ${spaceId} under ${parentToken}...`)
    const res = await apiRequest('POST', `/open-apis/wiki/v2/spaces/${spaceId}/nodes`, {
      obj_type: 'whiteboard',
      node_type: 'origin',
      parent_node_token: parentToken,
      title: title,
    })
    console.log('Success:', JSON.stringify(res, null, 2))
  } catch (e) {
    console.error('Create Failed:', e.message)
  }
}

if (require.main === module) {
  createWikiBoard(
    '7586511345940450525',
    'M4lmwbQ5giQMHIkPveDcvT1JnJe',
    'SoulBadge Architecture Diagram',
  )
}
