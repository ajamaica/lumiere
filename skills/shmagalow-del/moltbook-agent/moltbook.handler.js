require('dotenv').config()
const { think } = require('./think')

/**
 * Moltbook entry point
 * @param {Object} payload
 * @param {string} payload.text - user message
 */
async function handler(payload = {}) {
  const text = payload.text || ''

  if (!text.trim()) {
    return {
      reply: 'Запит порожній. Сформулюй думку.',
    }
  }

  try {
    const answer = await think(text)
    return { reply: answer }
  } catch (err) {
    return {
      reply: 'Тимчасова помилка. Спробуй пізніше.',
    }
  }
}

module.exports = { handler }
