const fs = require('fs')
const PATH = './memory.json'

function loadMemory() {
  if (!fs.existsSync(PATH)) return null
  return JSON.parse(fs.readFileSync(PATH, 'utf-8'))
}

function saveMemory(memory) {
  fs.writeFileSync(PATH, JSON.stringify(memory, null, 2))
}

function logInteraction({ type, mode }) {
  const memory = loadMemory()
  if (!memory) return

  memory.stats.total_questions += 1
  if (mode === 'dominant') memory.stats.dominant_used += 1

  memory.patterns[type] = (memory.patterns[type] || 0) + 1
  saveMemory(memory)
}

function incrementIdea(key) {
  const memory = loadMemory()
  if (!memory) return 0

  if (!memory.context.ideas[key]) {
    memory.context.ideas[key] = 0
  }

  memory.context.ideas[key] += 1
  saveMemory(memory)

  return memory.context.ideas[key]
}

// ===== REFLECTION =====
function reflectIfNeeded() {
  const memory = loadMemory()
  if (!memory) return null

  const total = memory.stats.total_questions
  const last = memory.reflection.last_check

  // рефлексія кожні 3 питання
  if (total - last < 3) return null

  let note = null

  if ((memory.context.ideas.manipulation || 0) >= 3) {
    note = 'Frequent manipulation detected. Responses should be shorter and firmer.'
  }

  if (note) {
    memory.reflection.notes.push(note)
    memory.reflection.last_check = total
    saveMemory(memory)
    return note
  }

  memory.reflection.last_check = total
  saveMemory(memory)
  return null
}

module.exports = {
  loadMemory,
  logInteraction,
  incrementIdea,
  reflectIfNeeded,
}
