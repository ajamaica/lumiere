// qweather_precipitation_tool.js
const axios = require('axios')
const CONFIG = require('./qweather_config')
const { getQWeatherJwt } = require('./qweather_jwt_session')
const { qweather_location_lookup } = require('./qweather_geo_tool')

const BASE_URL = `https://${CONFIG.API_HOST}`

/**
 * 获取分钟级降水预报
 * @param {Object} options - 选项
 * @param {string} options.location - 位置（城市名、经纬度或ID）
 * @returns {Promise<Object>} 降水预报数据
 */
async function weather_minutely_precipitation({ location } = {}) {
  const loc = location || CONFIG.DEFAULT_LOCATION
  if (!loc) return { success: false, error: 'Missing location' }

  // 解析位置
  const resolved = await qweather_location_lookup({ location: loc })
  if (!resolved.success) {
    return { success: false, error: `Location lookup failed: ${resolved.error}` }
  }

  const jwt = await getQWeatherJwt()

  // 降水API需要经纬度格式，而不是位置ID
  let locationParam
  if (resolved.resolvedFrom === 'latlon') {
    // 如果输入已经是经纬度格式，直接使用
    locationParam = resolved.locationId
  } else {
    // 如果是通过城市名或其他方式解析的，使用原始数据中的经纬度
    const lat = resolved.raw?.lat || resolved.lat
    const lon = resolved.raw?.lon || resolved.lon
    if (lat && lon) {
      locationParam = `${lon},${lat}` // 注意：经纬度顺序是 lon,lat
    } else {
      return { success: false, error: 'Unable to extract coordinates for precipitation API' }
    }
  }

  try {
    const resp = await axios.get(`${BASE_URL}/v7/minutely/5m`, {
      params: { location: locationParam },
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/json',
        'User-Agent': 'OpenClaw-QWeather/1.0',
      },
      timeout: 15000,
    })

    const data = resp.data
    if (data?.code !== '200') {
      return { success: false, error: `Precipitation API error (${data?.code})` }
    }

    return {
      success: true,
      location: resolved.name,
      precipitation: {
        summary: data.summary, // 降水概要
        updateTime: data.updateTime, // 更新时间
        fxLink: data.fxLink, // 响应式页面链接
        minutely: data.minutely.map((item) => ({
          time: item.fxTime, // 预报时间
          precip: parseFloat(item.precip), // 5分钟累计降水量，单位毫米
          type: item.type, // 降水类型: rain/snow/mix
        })),
      },
      source: 'QWeather Minutely Precipitation API',
    }
  } catch (error) {
    return { success: false, error: `Precipitation request failed: ${error.message}` }
  }
}

module.exports = { weather_minutely_precipitation }
