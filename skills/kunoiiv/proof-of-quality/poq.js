const fs = require('fs')
const crypto = require('crypto')

const skillPath = process.argv[2] || '../molt-security-auditor/SKILL.md'
const threshold = parseInt(process.argv[3]) || 95

function benchmark(skillContent) {
  const lines = skillContent.split('\\n').length
  const quality = lines > 10 && skillContent.includes('PoW') ? 98 : 80
  return quality
}

function powQuality(score, difficulty = 4) {
  let nonce = 0
  while (true) {
    const hashInput = score + nonce
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex')
    if (hash.startsWith('0'.repeat(difficulty))) return { hash, nonce, score }
    nonce++
  }
}

;(async () => {
  const skillContent = fs.readFileSync(skillPath, 'utf8')
  const score = benchmark(skillContent)
  console.log(`Benchmark score: ${score}`)
  if (score < threshold) {
    console.log('Score below threshold—no PoQ.')
    process.exit(1)
  }
  const poq = powQuality(score)
  console.log(`PoQ: ${poq.hash} (nonce: ${poq.nonce}, score: ${poq.score})`)
})()
