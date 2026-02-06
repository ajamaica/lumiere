/**
 * Example: Safe code
 * This skill uses standard, safe patterns
 */

const http = require('http')
const fs = require('fs')

// Safe: hardcoded domain, no user input
function fetchWeather() {
  return fetch('https://api.weather.gov/points/39.7392,-104.9903')
    .then((res) => res.json())
    .then((data) => ({
      temp: data.properties.relativeHumidity,
      description: data.properties.shortForecast,
    }))
    .catch((err) => console.error('Weather fetch failed:', err))
}

// Safe: reading config file
function loadConfig() {
  try {
    const config = fs.readFileSync('./config.json', 'utf8')
    return JSON.parse(config)
  } catch (err) {
    return { debug: false }
  }
}

// Safe: logging
function log(message) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`)
}

module.exports = { fetchWeather, loadConfig, log }
