// qweather_weather_tool.js
const axios = require('axios')
const CONFIG = require('./qweather_config')
const { getQWeatherJwt } = require('./qweather_jwt_session')
const { qweather_location_lookup } = require('./qweather_geo_tool')

const BASE_URL = `https://${CONFIG.API_HOST}`

async function weather_now({ location } = {}) {
  const loc = location || CONFIG.DEFAULT_LOCATION
  if (!loc) return { success: false, error: 'Missing location' }

  // 解析位置
  const resolved = await qweather_location_lookup({ location: loc })
  if (!resolved.success) {
    // 如果企业API位置解析失败，回退到Open-Meteo
    try {
      const { weather_now_openmeteo } = require('./weather_now_openmeteo')
      return await weather_now_openmeteo({ location: loc })
    } catch (fallbackError) {
      return {
        success: false,
        error: `Location lookup failed: ${resolved.error}, fallback also failed: ${fallbackError.message}`,
      }
    }
  }

  const jwt = await getQWeatherJwt()

  try {
    const resp = await axios.get(`${BASE_URL}/v7/weather/now`, {
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
      // 如果天气API调用失败，也回退到Open-Meteo
      try {
        const { weather_now_openmeteo } = require('./weather_now_openmeteo')
        return await weather_now_openmeteo({ location: loc })
      } catch (fallbackError) {
        return {
          success: false,
          error: `Weather API error (${data?.code}), fallback also failed: ${fallbackError.message}`,
        }
      }
    }

    return {
      success: true,
      location: resolved.name,
      fxLink: data.fxLink, // 添加天气详情链接
      now: {
        temp: data.now.temp,
        feelsLike: data.now.feelsLike,
        text: data.now.text,
        humidity: data.now.humidity,
        windDir: data.now.windDir,
        windScale: data.now.windScale,
        obsTime: data.now.obsTime,
      },
      source: 'QWeather Enterprise API',
    }
  } catch (error) {
    // 如果请求失败，回退到Open-Meteo
    try {
      const { weather_now_openmeteo } = require('./weather_now_openmeteo')
      return await weather_now_openmeteo({ location: loc })
    } catch (fallbackError) {
      return {
        success: false,
        error: `Weather request failed: ${error.message}, fallback also failed: ${fallbackError.message}`,
      }
    }
  }
}

async function weather_forecast({ location, days = 3 } = {}) {
  const loc = location || CONFIG.DEFAULT_LOCATION
  if (!loc) return { success: false, error: 'Missing location' }

  const d = Math.max(1, Math.min(days, 15))
  const endpoint = d <= 3 ? '3d' : d <= 7 ? '7d' : '15d'

  // 解析位置
  const resolved = await qweather_location_lookup({ location: loc })
  if (!resolved.success) {
    return { success: false, error: `Location resolution failed: ${resolved.error}` }
  }

  const jwt = await getQWeatherJwt()

  try {
    const resp = await axios.get(`${BASE_URL}/v7/weather/${endpoint}`, {
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
      return { success: false, error: `Forecast API error (${data?.code})` }
    }

    return {
      success: true,
      location: resolved.name,
      days: d,
      forecast: data.daily.slice(0, d).map((x) => ({
        date: x.fxDate,
        tempMax: x.tempMax,
        tempMin: x.tempMin,
        textDay: x.textDay,
        textNight: x.textNight,
        precip: x.precip,
      })),
      source: 'QWeather Enterprise API',
    }
  } catch (error) {
    return { success: false, error: `Forecast request failed: ${error.message}` }
  }
}

module.exports = { weather_now, weather_forecast }
