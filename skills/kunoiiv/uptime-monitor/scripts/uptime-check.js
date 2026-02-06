const fs = require('fs')
const path = require('path')

const uptimeDir = path.join('.', 'uptime')
if (!fs.existsSync(uptimeDir)) fs.mkdirSync(uptimeDir, { recursive: true })

const streakPath = path.join(uptimeDir, 'streak.json')
const deadPath = path.join(uptimeDir, 'dead.json')
const uptimePath = path.join(uptimeDir, 'uptime.json')

const now = Date.now()
const streakHours = 5 / 60 // 5min ping

let streak = { streak_hours: 0, last_ping: now }
if (fs.existsSync(streakPath)) {
  try {
    streak = JSON.parse(fs.readFileSync(streakPath, 'utf8'))
    streak.streak_hours += streakHours
    streak.last_ping = now
  } catch {
    streak.streak_hours = streakHours
  }
}

const SEVEN_DAYS_HOURS = 168
if (streak.streak_hours >= SEVEN_DAYS_HOURS) {
  fs.writeFileSync(
    uptimePath,
    JSON.stringify(
      {
        streak_hours: streak.streak_hours,
        verified: true,
        start_ts: now - streak.streak_hours * 3600000,
        end_ts: now,
      },
      null,
      2,
    ),
  )
  console.log('✅ 7d UPTIME!')
} else {
  // Still building streak
}

fs.writeFileSync(streakPath, JSON.stringify(streak, null, 2))
console.log(`Streak: ${streak.streak_hours.toFixed(1)}h`)
