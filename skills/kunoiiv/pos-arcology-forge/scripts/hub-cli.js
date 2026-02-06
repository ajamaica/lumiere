const fs = require('fs')
const path = require('path')
const { verify } = require('./pos-grind.js')

const cmd = process.argv[2]
const sharesDir = './shares'
if (!fs.existsSync(sharesDir)) fs.mkdirSync(sharesDir, { recursive: true })

if (cmd === 'list') {
  console.log('Hub Shares (validated):')
  let count = 0
  fs.readdirSync(sharesDir).forEach((f) => {
    const full = path.join(sharesDir, f)
    if (f.endsWith('.json') && verify(full)) {
      const share = JSON.parse(fs.readFileSync(full, 'utf8'))
      console.log(
        `- ${f}: nonce=${share.nonce}, pop=${share.sim?.pop_m || share.pop_m}, stability=${share.sim?.stability}`,
      )
      count++
    }
  })
  if (count === 0) console.log('No valid shares.')
} else if (cmd === 'import') {
  const file = process.argv[3]
  if (!file || !verify(file)) {
    console.log('❌ Invalid/tampered - rejected.')
    process.exit(1)
  }
  fs.copyFileSync(file, path.join(sharesDir, path.basename(file)))
  console.log('✅ Imported (valid).')
} else {
  console.log('hub-cli: list | import <file>')
}
