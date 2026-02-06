// qweather_hourly_tool.js
const axios = require('axios')
const CONFIG = require('./qweather_config')
const { getQWeatherJwt } = require('./qweather_jwt_session')
const { qweather_location_lookup } = require('./qweather_geo_tool')

const BASE_URL = `https://${CONFIG.API_HOST}`

/**
 * 获取逐小时天气预报
 * @param {Object} options - 选项
 * @param {string} options.location - 位置（城市名、经纬度或ID）
 * @param {string} options.hours - 预报小时数（24h, 72h, 168h，默认为24h）
 * @returns {Promise<Object>} 逐小时天气预报数据
 */
async function weather_hourly({ location, hours = '24h' } = {}) {
  const loc = location || CONFIG.DEFAULT_LOCATION
  if (!loc) return { success: false, error: 'Missing location' }

  // 解析位置
  const resolved = await qweather_location_lookup({ location: loc })
  if (!resolved.success) {
    return { success: false, error: `Location lookup failed: ${resolved.error}` }
  }

  const jwt = await getQWeatherJwt()

  // 验证小时参数
  const validHours = ['24h', '72h', '168h']
  const hoursParam = validHours.includes(hours) ? hours : '24h'

  try {
    const resp = await axios.get(`${BASE_URL}/v7/weather/${hoursParam}`, {
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
      return { success: false, error: `Hourly forecast API error (${data?.code})` }
    }

    return {
      success: true,
      location: resolved.name,
      hours: hoursParam,
      hourly: data.hourly.map((hour) => ({
        time: hour.fxTime, // 预报时间
        temp: parseInt(hour.temp), // 温度
        text: hour.text, // 天气状况描述
        icon: hour.icon, // 天气图标代码
        wind360: hour.wind360, // 风向360度
        windDir: hour.windDir, // 风向
        windScale: hour.windScale, // 风力等级
        windSpeed: parseInt(hour.windSpeed), // 风速(km/h)
        humidity: parseInt(hour.humidity), // 相对湿度(%)
        precip: parseFloat(hour.precip), // 降水量(mm)
        pop: parseInt(hour.pop) || 0, // 降水概率(%)
        pressure: parseInt(hour.pressure), // 大气压强(hPa)
        cloud: parseInt(hour.cloud) || 0, // 云量(%)
        dew: parseInt(hour.dew) || null, // 露点温度(°C)
      })),
      source: 'QWeather Hourly Forecast API',
    }
  } catch (error) {
    return { success: false, error: `Hourly forecast request failed: ${error.message}` }
  }
}

module.exports = { weather_hourly }
