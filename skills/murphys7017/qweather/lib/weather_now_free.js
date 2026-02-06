// 和风天气普通API的天气查询
const axios = require('axios')

/**
 * 通过和风天气普通API获取当前天气
 * @param {{ location?: string }} args
 */
async function weather_now_free(args = {}) {
  const inputLoc = String(
    args.location || process.env.QWEATHER_DEFAULT_LOCATION || 'Beijing',
  ).trim()

  // 检查是否设置了免费API密钥
  const freeApiKey = process.env.QWEATHER_FREE_API_KEY
  if (!freeApiKey) {
    return { success: false, error: 'Missing free API key (QWEATHER_FREE_API_KEY)' }
  }

  try {
    // 首先通过地名获取位置ID
    const locationResponse = await axios.get('https://geoapi.qweather.com/v2/city/lookup', {
      params: {
        location: inputLoc,
        key: freeApiKey,
      },
      timeout: 10000,
    })

    if (
      locationResponse.data.code !== '200' ||
      !locationResponse.data.location ||
      locationResponse.data.location.length === 0
    ) {
      return { success: false, error: `Location not found: ${inputLoc}` }
    }

    const location = locationResponse.data.location[0]
    console.log(`Found location: ${location.name} (ID: ${location.id})`)

    // 使用位置ID获取天气数据
    const weatherResponse = await axios.get('https://devapi.qweather.com/v7/weather/now', {
      params: {
        location: location.id,
        key: freeApiKey,
      },
      timeout: 10000,
    })

    if (weatherResponse.data.code !== '200') {
      return { success: false, error: `Weather API error: ${weatherResponse.data.code}` }
    }

    const now = weatherResponse.data.now

    return {
      success: true,
      location: {
        input: inputLoc,
        name: location.name,
        id: location.id,
        latitude: location.lat,
        longitude: location.lon,
      },
      now: {
        obsTime: now.obsTime,
        temp: now.temp,
        feelsLike: now.feelsLike,
        text: now.text,
        humidity: now.humidity,
        windDir: now.windDir,
        windScale: now.windScale,
        windSpeed: now.windSpeed,
        precip: now.precip,
        vis: now.vis,
        pressure: now.pressure,
      },
      source: 'QWeather Free API',
    }
  } catch (error) {
    return { success: false, error: `Free API error: ${error.message}` }
  }
}

module.exports = { weather_now_free }
