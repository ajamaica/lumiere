const { apiRequest } = require('./api')

async function probeWiki(token) {
  try {
    console.log(`Probing Wiki Token ${token}...`)
    // Try GET node directly
    // Note: Real endpoint is GET /open-apis/wiki/v2/spaces/get_node with query params
    const res = await apiRequest('GET', `/open-apis/wiki/v2/spaces/get_node?token=${token}`)
    console.log('Result:', JSON.stringify(res, null, 2))
  } catch (e) {
    console.error('Probe Failed:', e.message)
  }
}

if (require.main === module) {
  probeWiki(process.argv[2])
}
