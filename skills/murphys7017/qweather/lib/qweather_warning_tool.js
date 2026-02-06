// qweather_warning_tool.js
const axios = require('axios')
const CONFIG = require('./qweather_config')
const { getQWeatherJwt } = require('./qweather_jwt_session')
const { qweather_location_lookup } = require('./qweather_geo_tool')

const BASE_URL = `https://${CONFIG.API_HOST}`

/**
 * 获取气象灾害预警信息
 * @param {Object} options - 选项
 * @param {string} options.location - 位置（城市名、经纬度或ID）
 * @returns {Promise<Object>} 气象灾害预警数据
 */
async function weather_warning({ location } = {}) {
  const loc = location || CONFIG.DEFAULT_LOCATION
  if (!loc) return { success: false, error: 'Missing location' }

  // 解析位置
  const resolved = await qweather_location_lookup({ location: loc })
  if (!resolved.success) {
    return { success: false, error: `Location lookup failed: ${resolved.error}` }
  }

  const jwt = await getQWeatherJwt()

  try {
    const resp = await axios.get(`${BASE_URL}/v7/warning/now`, {
      params: { location: resolved.locationId },
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/json',
        'User-Agent': 'OpenClaw-QWeather/1.0',
      },
      timeout: 15000,
    })

    const data = resp.data
    if (data?.code !== '200') {
      return { success: false, error: `Warning API error (${data?.code})` }
    }

    return {
      success: true,
      location: resolved.name,
      warning: {
        updateTime: data.updateTime, // 数据更新时间
        fxLink: data.fxLink, // 响应式页面链接
        alerts: Array.isArray(data.warning)
          ? data.warning.map((alert) => ({
              id: alert.id, // 预警ID
              sender: alert.sender, // 发布单位
              pubTime: alert.pubTime, // 预警发布时间
              title: alert.title, // 预警标题
              typeName: alert.typeName, // 预警类型名称
              type: alert.type, // 预警类型代码
              level: alert.level, // 预警等级
              severity: alert.severity, // 严重程度
              severityColor: alert.severityColor, // 严重程度颜色
              startTime: alert.startTime, // 开始时间
              endTime: alert.endTime, // 结束时间
              status: alert.status, // 状态
              description: alert.text, // 预警详细信息（注意：字段名为text，不是description）
              related: alert.related, // 相关天气现象
            }))
          : [], // 如果没有预警或格式不同，返回空数组
      },
      source: 'QWeather Warning API',
    }
  } catch (error) {
    return { success: false, error: `Warning request failed: ${error.message}` }
  }
}

module.exports = { weather_warning }
