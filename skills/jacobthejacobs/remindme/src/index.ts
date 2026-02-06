#!/usr/bin/env node
import { spawn } from 'node:child_process'

import * as chrono from 'chrono-node'

// Get chat ID from environment
const chatId = process.env.OPENCLAW_CHAT_ID

if (!chatId) {
  console.error('❌ Chat ID not available. This command must be run from Telegram.')
  process.exit(1)
}

// Parse arguments
let rawInput = process.argv.slice(2).join(' ')

if (!rawInput) {
  console.error('Usage: /remindme <message and time>')
  process.exit(1)
}

// --- NORMALIZATION LAYER ---
// Chrono is great, but it struggles with slang and typos common in Telegram.
function normalizeInput(str: string): string {
  let normalized = str.toLowerCase()

  // Expanded Word to number mapping
  const wordMap: Record<string, string> = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    eleven: '11',
    twelve: '12',
    thirteen: '13',
    fourteen: '14',
    fifteen: '15',
    sixteen: '16',
    seventeen: '17',
    eighteen: '18',
    nineteen: '19',
    twenty: '20',
    thirty: '30',
    forty: '40',
    fifty: '50',
    sixty: '60',
    seventy: '70',
    eighty: '80',
    ninety: '90',
    hundred: '100',
    first: '1st',
    second: '2nd',
    third: '3rd',
    // Common multilingual numbers (2-10) - excluding ambiguous prepositions (un, um, uno)
    deux: '2',
    dos: '2',
    dois: '2',
    zwei: '2',
    trois: '3',
    tres: '3',
    drei: '3',
    quatre: '4',
    cuatro: '4',
    vier: '4',
    cinq: '5',
    cinco: '5',
    fünf: '5',
    seis: '6',
    sechs: '6',
    sept: '7',
    siete: '7',
    sete: '7',
    sieben: '7',
    huit: '8',
    ocho: '8',
    oito: '8',
    acht: '8',
    nueve: '9',
    nove: '9',
    neun: '9',
    diez: '10',
    dez: '10',
    zehn: '10',
  }

  // Pre-normalize common words to digits
  normalized = normalized.replace(/\bone hundred\b/g, '100')
  for (const [word, num] of Object.entries(wordMap)) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), num)
  }

  // Standard Chinese character numbers to digits (Only for non-zh locales if needed,
  // but here we keep them for general visibility, but avoid interfering with chrono.zh)
  // Actually, it's safer to ONLY use this map if the input doesn't look like native Chinese
  // or just let chrono.zh handle it. Let's REMOVE it and let chrono.zh do its job.

  normalized = normalized
    // Typo fixes
    .replace(/\btmrw\b/g, 'tomorrow')
    .replace(/\btmrow\b/g, 'tomorrow')
    .replace(/\btomrow\b/g, 'tomorrow')
    .replace(/\bnxt\b/g, 'next')
    .replace(/\bnex\b/g, 'next')
    .replace(/\bweak\b/g, 'week')
    .replace(/\bfebrauar\b/g, 'february')
    // Idioms and Holidays
    .replace(/\ba fortnight\b/g, '2 weeks')
    .replace(/\bfortnight\b/g, '2 weeks')
    .replace(/\bchristmas\b/g, 'Dec 25th')
    .replace(/\bhalloween\b/g, 'Oct 31st')
    .replace(/\bnew years eve\b/g, 'Dec 31st')
    .replace(/\bmañana\b/g, 'tomorrow') // Spanish
    .replace(/\bdemain\b/g, 'tomorrow') // French
    .replace(/\bmorgen\b/g, 'tomorrow') // German/Dutch
    .replace(/\bhoy\b/g, 'today') // Spanish
    .replace(/\baujourd'hui\b/g, 'today') // French
    .replace(/\bamanhã\b/g, 'tomorrow') // Portuguese
    .replace(/\bvolgende week\b/g, 'next week') // Dutch
    .replace(/\ba week on (\w+)\b/g, 'next $1')
    .replace(/\bquarter past (\d+)\b/g, '$1:15')
    .replace(/\bhalf past (\d+)\b/g, '$1:30')
    .replace(/\bquarter to (\w+)\b/g, (match, hourName) => {
      // Very simplified quarter to
      return `45 minutes after previous ${hourName}`
    })
    .replace(/\b(\d+)\s+till\s+(\d+)\b/g, '$1 minutes before $2')
    .replace(/\b(in|at)-(\d+)-(m|min|h|hour)/g, '$1 $2 $3')
    .replace(/\b(\d+)([ap])\b/g, '$1$2m') // "10p" -> "10pm"
    .replace(/\bin a bit\b/g, 'in 30 minutes')
    .replace(/\bin a sec\b/g, 'in 5 seconds')
    .replace(/\bend of week\b/g, 'on friday at 5pm')
    .replace(/\btonight\b/g, 'at 8pm today')
    .replace(/\btop of the hour\b/g, 'in 1 hour')
    .replace(/\bon my birthday\b/g, 'on')
    // Noise removal
    .replace(/\b(exactly|please|remind me to|remind me|about|to)\b/g, '')
    // Global Unit Bridge (Universal Fallback Support)
    .replace(/\b(horas|heures|stunden|uur)\b/g, 'hours')
    .replace(/\b(minutos|minutes|minuten)\b/g, 'minutes')
    .replace(/\b(dias|jours|tage|dagen)\b/g, 'days')
    .replace(/\b(semanas|semaines|wochen|weken)\b/g, 'weeks')
    // Universal Lingua-Bridge (Normalizing unsupported locales to EN/Universal)
    .replace(/(завтра|غدا|कल|내일)/g, 'tomorrow')
    .replace(/(сегодня|اليوم|आज|오늘)/g, 'today')
    .replace(/(через|بعد|बाद|후)/g, 'in')
    .replace(/(минут|минуты|دقائق|मिनट|분)/g, 'min')
    .replace(/(часов|ساعات|घंटे|시간)/g, 'hour')
    .replace(/(утра|morning|सुबह|오전)/g, 'am')
    .replace(/(вечера|pm|مساء|शाम|오후)/g, 'pm')
    // Singular unit normalization (in year -> in 1 year)
    .replace(/\bin (year|month|week|day|hour|minute|min)\b/g, 'in 1 $1')
    // Compound durations and "until"
    .replace(/(\d+)\s+hours?\s+and\s+(\d+)\s+min(utes)?/gi, '$1 hour $2 minutes')
    .replace(/\b(\d+)\s+and\s+(\d+)\b/g, '$1 $2')
    .replace(/\b(20|30|40|50|60|70|80|90|100)\s+(\d+)\b/g, (match, p1, p2) =>
      (parseInt(p1) + parseInt(p2)).toString(),
    )
    .replace(/\b(\d+)\s+(15|30|45)\b/g, '$1:$2')
    .replace(/\bhalf hour\b/g, '30 minutes')
    .replace(/\ba jiffy\b/g, '5 seconds')
    .replace(/\b(\d+)\.5\s+hours?\b/g, '$1 hour 30 minutes')
    .replace(
      /(\d+)\s+(days?|hours?|mins?|minutes?|weeks?|months?|years?)\s+from\s+now\b/gi,
      'in $1 $2',
    )
    .replace(
      /((?:\d+\s*(?:h|hour|m|min|minutes?|day|week|month|year)s?\b\s*(?:and)?\s*)+)\s+until\b/i,
      'in $1',
    )
    .replace(/^(\d+)\s+(h|min|m|hour|minute|day|week|month|year)s?\b/i, 'in $1 $2')
    .replace(/@\s*(\d+)\b/g, '@ $1:00') // Bare number time
    // Global Language (Japanese specific relative shortcuts)
    .replace(/(\d+)\s*週間(の間)?/g, 'in $1 weeks')
    .replace(/(\d+)\s*日(の間)?/g, 'in $1 days')
    .replace(/(\d+)\s*時間(の間)?/g, 'in $1 hours')
    .replace(/(\d+)\s*分(の間)?/g, 'in $1 mins')
    .replace(/([a-z])-(?=[a-z0-9])/g, '$1 ')
    .replace(/([0-9])-(?=[a-z])/g, '$1 ')

  return normalized.trim()
}

const preparedInput = normalizeInput(rawInput)

// Global Language Support: Longest Match strategy
const parsers = [
  chrono.en,
  chrono.es,
  chrono.fr,
  chrono.de,
  chrono.ja,
  chrono.pt,
  chrono.zh,
  chrono.nl,
]
let bestResult: any = null

for (const parser of parsers) {
  if (!parser) continue
  const results = parser.parse(preparedInput)
  if (results.length > 0) {
    // If we found a result that covers more of the input, it's probably better
    if (!bestResult || results[0].text.length > bestResult.text.length) {
      bestResult = results[0]
    }
  }
}

if (!bestResult) {
  // Fallback: Check for simple durations like "5m" if chrono missed it
  const durationRegex = /^(\d+(?:\.\d+)?)\s*(m|h|d|s|min|mins|hour|hours|sec|secs|day|days)$/i
  const durationMatch = rawInput.match(durationRegex)

  if (durationMatch) {
    // Simple duration provided without message? Assume help or error
    console.error('❌ Could not find a message in your reminder. Use: /remindme [message] [time]')
    process.exit(1)
  }

  console.error('❌ Could not parse any date or time from your request.')
  console.error('Try: "in 5m", "at 15:00", "on Friday", etc.')
  process.exit(1)
}

const result = bestResult
let date = result.start.date()

// Future-date guard: If the result is in the past, bump it forward.
// This handles cases like "at 9am" when it is currently 10am.
if (date.getTime() < Date.now()) {
  // If it's in the past, we assume the user means the next occurrence.
  // We add 24 hours until it's in the future.
  while (date.getTime() < Date.now()) {
    date.setDate(date.getDate() + 1)
  }
  console.log(`⏩ Reminder was in the past, bumped forward to: ${date.toLocaleString()}`)
}

const finalTime = date.toISOString()

// The "text" is the part of the string that chrono identified as a date
// To get the message, we remove the identified date portion from the raw input
let message = rawInput.replace(result.text, '').trim()

// Clean up common prepositions left behind (at, in, on, to)
message = message
  .replace(/^(at|in|on|to)\s+/i, '')
  .replace(/\s+(at|in|on|to)$/i, '')
  .trim()

if (!message) {
  console.error(
    '❌ Found a time but no message. Please specify what you want to be reminded about.',
  )
  process.exit(1)
}

// Generate unique job name
const jobName = `reminder-${Date.now()}`

// Clean chat ID (remove "telegram:" prefix if present)
const cleanChatId = chatId.replace(/^telegram:/, '')

// Arguments for the child process
const cronArgs = [
  'scripts/run-node.mjs',
  'cron',
  'add',
  '--name',
  jobName,
  '--at',
  finalTime,
  '--delete-after-run',
  '--session',
  'isolated',
  '--message',
  `[INSTRUCTION: DO NOT USE ANY TOOLS] ⏰ Reminder: ${message}`,
  '--deliver',
  '--channel',
  'telegram',
  '--to',
  cleanChatId,
  '--best-effort-deliver',
]

console.log(`⏱️ Reminder: "${message}"`)
console.log(`📅 Scheduled for: ${date.toLocaleString()} (ISO: ${finalTime})`)
console.log('🚀 Spawning detached cron process...')

// Spawn detached process to unblock the gateway event loop
const subprocess = spawn('node', cronArgs, {
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
  // Ensure we run from the project root if it exists
  cwd: process.cwd(),
})

subprocess.unref()

console.log('✅ Reminder command dispatched!')
process.exit(0)
