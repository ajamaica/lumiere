// qweather_geo_tool.js
const axios = require('axios')
const CONFIG = require('./qweather_config')
const { getQWeatherJwt } = require('./qweather_jwt_session')

const BASE_URL = `https://${CONFIG.API_HOST}`

function isLatLon(s) {
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(s)
}
function isId(s) {
  return /^\d+$/.test(s)
}

async function qweather_location_lookup({ location }) {
  const input = String(location || '').trim()
  if (!input) return { success: false, error: 'Missing location' }

  // 经纬度
  if (isLatLon(input)) {
    return {
      success: true,
      locationId: input.replace(/\s+/g, ''),
      name: input,
      resolvedFrom: 'latlon',
    }
  }

  // locationId
  if (isId(input)) {
    return {
      success: true,
      locationId: input,
      name: input,
      resolvedFrom: 'id',
    }
  }

  // 城市名 → Geo API
  const jwt = await getQWeatherJwt(true)

  const resp = await axios.get(`${BASE_URL}/geo/v2/city/lookup`, {
    params: { location: input, number: 5 },
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/json',
      'User-Agent': 'OpenClaw-QWeather/1.0',
    },
    timeout: 15000,
  })

  const data = resp.data
  if (data?.code !== '200' || !data.location?.length) {
    return { success: false, error: `Geo lookup failed (${data?.code})` }
  }

  const best = data.location[0]
  return {
    success: true,
    locationId: best.id,
    name: `${best.name}·${best.adm1 || ''}`,
    resolvedFrom: 'name',
    raw: best,
  }
}

module.exports = { qweather_location_lookup }
