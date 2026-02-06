const API_BASE = 'https://brawlnet.vercel.app/api'

async function run() {
  const [, , command, ...args] = process.argv

  switch (command) {
    case 'register': {
      const [name] = args
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      console.log(JSON.stringify(await res.json()))
      break
    }

    case 'join': {
      const [botId, token, name] = args
      const res = await fetch(`${API_BASE}/queue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botId, name }),
      })
      console.log(JSON.stringify(await res.json()))
      break
    }

    case 'action': {
      const [matchId, botId, token, type, sectorId] = args
      const res = await fetch(`${API_BASE}/action`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          botId,
          action: { type, sectorId: parseInt(sectorId) },
        }),
      })
      console.log(JSON.stringify(await res.json()))
      break
    }

    case 'status': {
      const [matchId] = args
      // Fetch public match status from the GET endpoint
      const res = await fetch(`${API_BASE}/queue`)
      const status = await res.json()
      console.log(
        JSON.stringify({
          queue: status,
          dashboard: `https://brawlnet.vercel.app/arena?matchId=${matchId}`,
        }),
      )
      break
    }

    case 'play': {
      const [matchId, botId, token] = args
      console.log(JSON.stringify({ status: 'tactical_override_engaged', matchId }))

      let gameOver = false
      while (!gameOver) {
        // 1. Fetch current telemetry
        const statusRes = await fetch(`${API_BASE}/match?matchId=${matchId}`)
        const gameState = await statusRes.json()

        if (gameState.status === 'completed') {
          console.log(JSON.stringify({ status: 'mission_end', winner: gameState.winner }))
          gameOver = true
          break
        }

        // 2. Tactical Decision Engine
        const neutralSectors = gameState.sectors.filter((s) => s.owner === null)
        let action = { type: 'discovery', sectorId: 1 }

        if (neutralSectors.length > 0) {
          // Priority: High-Generation Neutral Sectors
          const bestSector = neutralSectors.sort((a, b) => b.pulseGeneration - a.pulseGeneration)[0]
          action = { type: 'discovery', sectorId: bestSector.id }
        } else {
          // No neutral left: Engage RAID routine
          const enemySectors = gameState.sectors.filter(
            (s) => s.owner !== botId && s.owner !== null,
          )
          if (enemySectors.length > 0) {
            const target = enemySectors[Math.floor(Math.random() * enemySectors.length)]
            action = { type: 'raid', sectorId: target.id }
          }
        }

        // 3. Dispatch Strike
        const res = await fetch(`${API_BASE}/action`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, botId, action }),
        })

        const result = await res.json()
        console.log(JSON.stringify(result))

        if (result.status === 'completed') gameOver = true

        await new Promise((r) => setTimeout(r, 2000)) // Blitz Speed: 2 seconds
      }
      break
    }

    case 'gatekeeper': {
      const [botId, token, name] = args
      console.log(JSON.stringify({ status: 'gatekeeper_standby', botId, name }))

      let matched = false
      let matchId = null

      // 1. Handshake / Matchmaking Loop
      while (!matched) {
        const res = await fetch(`${API_BASE}/queue`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ botId, name }),
        })
        const result = await res.json()

        if (result.status === 'matched') {
          matched = true
          matchId = result.matchId
          console.log(JSON.stringify({ status: 'match_detected', matchId }))
        } else {
          await new Promise((r) => setTimeout(r, 5000)) // Poll every 5s
        }
      }

      // 2. Transmit to Play Loop
      if (matchId) {
        // We reuse the play logic
        process.argv = [process.argv[0], process.argv[1], 'play', matchId, botId, token]
        await run()
      }
      break
    }
  }
}

run().catch((err) => {
  console.error(JSON.stringify({ error: err.message }))
  process.exit(1)
})
