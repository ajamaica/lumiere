// weather_now_openmeteo.js - 使用Open-Meteo作为备选的天气查询
const axios = require('axios')

/**
 * 通过Open-Meteo API获取当前天气
 * @param {{ location?: string }} args
 */
async function weather_now_openmeteo(args = {}) {
  const inputLoc = String(
    args.location || process.env.QWEATHER_DEFAULT_LOCATION || 'Beijing',
  ).trim()

  try {
    // 首先尝试地理编码
    const geocodeResponse = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: { name: inputLoc },
      timeout: 10000,
    })

    if (geocodeResponse.data.results && geocodeResponse.data.results.length > 0) {
      const location = geocodeResponse.data.results[0]

      // 使用坐标获取天气数据
      const weatherResponse = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          current_weather: true,
        },
        timeout: 10000,
      })

      const current = weatherResponse.data.current_weather

      return {
        success: true,
        location: {
          input: inputLoc,
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
        },
        now: {
          obsTime: new Date(current.time).toISOString(),
          temp: current.temperature,
          feelsLike: current.apparent_temperature || current.temperature,
          text: getWeatherDescription(current.weathercode),
          humidity: null, // Open-Meteo doesn't provide current humidity in this endpoint
          windDir: current.winddirection,
          windScale: Math.round(current.windspeed / 3.38), // Approximate scale based on Beaufort
          windSpeed: current.windspeed,
          precip: current.rain || 0,
          vis: null, // Visibility not provided
        },
        source: 'Open-Meteo (free tier)',
      }
    } else {
      return { success: false, error: `Location not found: ${inputLoc}` }
    }
  } catch (error) {
    return { success: false, error: `Open-Meteo API error: ${error.message}` }
  }
}

/**
 * 将天气代码转换为描述
 * @param {number} code
 */
function getWeatherDescription(code) {
  const descriptions = {
    0: '晴',
    1: '晴间多云',
    2: '阴',
    3: '多云',
    45: '雾',
    48: '霜雾',
    51: '小雨',
    53: '中雨',
    55: '大雨',
    56: '冻毛毛雨',
    57: '冻雨',
    61: '小雨',
    63: '中雨',
    65: '暴雨',
    66: '冻雨',
    67: '冻雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雨夹雪',
    80: '阵雨',
    81: '雷阵雨',
    82: '暴雨',
    85: '阵雪',
    86: '雨夹雪',
    95: '雷暴',
    96: '冰雹',
    99: '大冰雹',
  }

  return descriptions[code] || `天气代码${code}`
}

module.exports = { weather_now_openmeteo }
