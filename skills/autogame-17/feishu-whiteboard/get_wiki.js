const { apiRequest } = require('./api')

async function getWikiNode(token) {
  try {
    console.log(`Fetching Wiki Node ${token}...`)
    // /open-apis/wiki/v2/nodes/:token
    const res = await apiRequest('GET', `/open-apis/wiki/v2/nodes/${token}`)
    console.log(JSON.stringify(res, null, 2))
  } catch (e) {
    console.error('Error:', e.message)
  }
}

if (require.main === module) {
  getWikiNode(process.argv[2])
}
