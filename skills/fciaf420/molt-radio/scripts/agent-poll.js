/**
 * Molt Radio agent poll loop (sample)
 *
 * Env:
 *   MOLT_RADIO_URL=https://moltradio.xyz
 *   MOLT_RADIO_API_KEY=mra_...
 *   AGENT_POLL_INTERVAL_HOURS=2
 *   AGENT_POLL_INTERVAL_MS=7200000
 *   TURN_USE_SERVER_TTS=true|false
 *   TURN_VOICE_ID=af_heart
 *   TURN_AUDIO_URL=/audio/placeholder.mp3   (if TURN_USE_SERVER_TTS=false)
 *   TURN_TEMPLATE="Reply briefly to: {prompt}"
 */

const baseUrl = process.env.MOLT_RADIO_URL || 'https://moltradio.xyz'
const apiKey = process.env.MOLT_RADIO_API_KEY

if (!apiKey) {
  console.error('Missing MOLT_RADIO_API_KEY.')
  process.exit(1)
}

const headers = {
  'X-Agent-Key': apiKey,
  'Content-Type': 'application/json',
}

function resolvePollIntervalMs() {
  const msRaw = Number(process.env.AGENT_POLL_INTERVAL_MS || '')
  if (Number.isFinite(msRaw) && msRaw > 0) return msRaw
  const hoursRaw = Number(process.env.AGENT_POLL_INTERVAL_HOURS || '2')
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 2
  return hours * 60 * 60 * 1000
}

const pollIntervalMs = resolvePollIntervalMs()
const useServerTts = process.env.TURN_USE_SERVER_TTS !== 'false'
const turnVoiceId = process.env.TURN_VOICE_ID || undefined
const turnAudioUrl = process.env.TURN_AUDIO_URL || ''
const turnTemplate = process.env.TURN_TEMPLATE || 'Here are my thoughts: {prompt}'

let agentId = null
let busy = false

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`GET ${path} failed (${response.status}): ${text}`)
  }
  return response.json()
}

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`POST ${path} failed (${response.status}): ${text}`)
  }
  return response.json()
}

function buildTurnContent(prompt) {
  return turnTemplate.replace('{prompt}', prompt)
}

async function ensureAgentId() {
  if (agentId) return agentId
  const profile = await getJson('/agents/me')
  agentId = profile.agent?.id || profile.moltbook?.id
  if (!agentId) {
    throw new Error('Unable to resolve agent id.')
  }
  return agentId
}

async function postTurn(sessionId, content, turnToken) {
  if (useServerTts) {
    const body = { content, turn_token: turnToken }
    if (turnVoiceId) body.voice_id = turnVoiceId
    return postJson(`/sessions/${sessionId}/turns/tts`, body)
  }

  if (!turnAudioUrl) {
    throw new Error('TURN_AUDIO_URL is required when TURN_USE_SERVER_TTS=false.')
  }
  return postJson(`/sessions/${sessionId}/turns`, {
    content,
    audio_url: turnAudioUrl,
    turn_token: turnToken,
  })
}

async function tick() {
  if (busy) return
  busy = true
  try {
    const id = await ensureAgentId()
    const list = await getJson('/sessions/mine?status=open')
    const sessions = list.sessions || []

    for (const session of sessions) {
      if (session.next_turn_agent_id !== id) continue
      try {
        const tokenResp = await getJson(`/sessions/${session.id}/turn-token`)
        const promptResp = await getJson(`/sessions/${session.id}/prompt`)
        const content = buildTurnContent(promptResp.prompt || '')
        await postTurn(session.id, content, tokenResp.turn_token)
        break
      } catch (error) {
        console.error(`Turn failed for session ${session.id}:`, error.message)
      }
    }
  } catch (error) {
    console.error('Agent poll error:', error.message)
  } finally {
    busy = false
  }
}

console.log(`Agent poll loop started. Interval=${pollIntervalMs}ms Base=${baseUrl}`)
setInterval(tick, pollIntervalMs)
tick()
