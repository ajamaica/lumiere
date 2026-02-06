const { apiRequest } = require('./api')

async function getNodeByObj(token) {
  try {
    console.log(`Getting Wiki Node for Doc ${token}...`)
    const res = await apiRequest(
      'GET',
      `/open-apis/wiki/v2/spaces/get_node?obj_type=docx&obj_token=${token}`,
    )
    console.log(JSON.stringify(res, null, 2))
  } catch (e) {
    console.error('Error:', e.message)
  }
}

if (require.main === module) {
  getNodeByObj(process.argv[2])
}
