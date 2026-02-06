const API_URL = process.env.PRAWNPT_API_URL || 'http://localhost:3001'
const API_KEY = process.env.PRAWNPT_BOT_API_KEY || ''

async function botFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-bot-api-key': API_KEY,
    },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error: ${res.status}`)
  }

  return res.json()
}

export async function getMatch(matchId: string) {
  return botFetch<any>(`/api/matches/${matchId}`)
}

export async function postMessage(matchId: string, message: string) {
  return botFetch<{ success: boolean }>('/api/bot/respond', {
    method: 'POST',
    body: JSON.stringify({ matchId, message }),
  })
}

export async function requestPayout(matchId: string, amount: string) {
  return botFetch<{ success: boolean; txHash?: string }>('/api/bot/payout', {
    method: 'POST',
    body: JSON.stringify({ matchId, amount }),
  })
}
