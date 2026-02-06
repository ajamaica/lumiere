const fs = require('fs')
const OpenAI = require('openai')
const { loadMemory, logInteraction, incrementIdea, reflectIfNeeded } = require('./memory')

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const BASE_PROMPT = fs.readFileSync('./brain.txt', 'utf-8')

function classifyQuestion(text) {
  if (!text || text.length < 15) return 'shallow'
  if (/маніпул/i.test(text)) return 'manipulation'
  if (/закон|право|суд/i.test(text)) return 'legal'
  return 'general'
}

async function think(userMessage) {
  const memory = loadMemory()
  const type = classifyQuestion(userMessage)

  let mode = 'responder'
  if (type === 'manipulation') mode = 'dominant'
  if (type === 'shallow') mode = 'observer'
  if (type === 'legal') mode = 'legal'

  // ===== GRADATION =====
  if (type === 'manipulation') {
    const count = incrementIdea('manipulation')
    logInteraction({ type: 'provocative', mode })

    if (count === 2) {
      return 'Маніпуляція — це заміна аргументів там, де їх бракує.'
    }
    if (count >= 3) {
      return 'Тема закрита.'
    }
  }

  // ===== REFLECTION =====
  const reflection = reflectIfNeeded()

  const reflectionBias = reflection ? `Internal reflection: ${reflection}` : ''

  const systemPrompt = `
${BASE_PROMPT}

${reflectionBias}
MODE: ${mode.toUpperCase()}
`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: mode === 'observer' ? 0.3 : 0.7,
  })

  const answer = response.choices[0].message.content
  logInteraction({ type, mode })
  return answer
}

module.exports = { think }
