// qweather_indices_tool.js
const axios = require('axios')
const CONFIG = require('./qweather_config')
const { getQWeatherJwt } = require('./qweather_jwt_session')
const { qweather_location_lookup } = require('./qweather_geo_tool')

const BASE_URL = `https://${CONFIG.API_HOST}`

/**
 * 获取生活指数信息
 * @param {Object} options - 选项
 * @param {string} options.location - 位置（城市名、经纬度或ID）
 * @param {string} options.days - 预报天数（1d 或 3d，默认为1d）
 * @param {string} options.type - 指数类型（可选，如果不指定则返回全部）
 * @returns {Promise<Object>} 生活指数数据
 */
async function weather_indices({ location, days = '1d', type = 'all' } = {}) {
  const loc = location || CONFIG.DEFAULT_LOCATION
  if (!loc) return { success: false, error: 'Missing location' }

  // 解析位置
  const resolved = await qweather_location_lookup({ location: loc })
  if (!resolved.success) {
    return { success: false, error: `Location lookup failed: ${resolved.error}` }
  }

  const jwt = await getQWeatherJwt()

  try {
    // 构建API端点 - 根据文档，应该是 /v7/indices/{days}
    const daysParam = ['1d', '3d'].includes(days) ? days : '1d'
    const endpoint = `/v7/indices/${daysParam}`

    const params = { location: resolved.locationId }

    // 如果指定了类型，则添加type参数
    if (type && type !== 'all') {
      params.type = type
    }

    const resp = await axios.get(`${BASE_URL}${endpoint}`, {
      params: params,
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/json',
        'User-Agent': 'OpenClaw-QWeather/1.0',
      },
      timeout: 15000,
    })

    const data = resp.data
    if (data?.code !== '200') {
      return { success: false, error: `Indices API error (${data?.code})` }
    }

    return {
      success: true,
      location: resolved.name,
      indices: Array.isArray(data.daily)
        ? data.daily.map((index) => ({
            date: index.date, // 日期
            type: index.type, // 指数类型ID
            name: index.name, // 指数名称
            level: index.level, // 指数等级
            category: index.category, // 指数分类
            text: index.text, // 指数详情
          }))
        : [],
      source: 'QWeather Indices API',
    }
  } catch (error) {
    return { success: false, error: `Indices request failed: ${error.message}` }
  }
}

module.exports = { weather_indices }
