import fetch from 'node-fetch'

const API = process.env.AIDA_API_URL
const KEY = process.env.AIDA_API_KEY

export default async function aidaSkill(ctx) {
  const { intent } = ctx

  switch (intent) {
    case 'aida.status':
      return call('/status', 'Building operating normally.')

    case 'aida.optimize':
      return call('/optimize', 'Optimization executed.')

    case 'aida.control':
      return call('/control', 'Control command sent.')

    case 'aida.diagnostics':
      return call('/diagnostics', 'Diagnostics completed.')

    default:
      return { reply: 'AIDA skill is active.' }
  }
}

async function call(path, fallback) {
  try {
    const res = await fetch(API + path, {
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
    })
    const data = await res.json()
    return { reply: data.message || fallback }
  } catch {
    return { reply: fallback }
  }
}
