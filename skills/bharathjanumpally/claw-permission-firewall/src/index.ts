#!/usr/bin/env node
import fs from 'node:fs'

import { evaluate } from './evaluate.js'

function usage() {
  console.error(
    `Usage:
  claw-permission-firewall evaluate --input action.json [--policy policy.yaml]

Exit codes:
  0: ALLOW or NEED_CONFIRMATION
  1: DENY
  2: usage error`,
  )
}

async function main() {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (cmd !== 'evaluate') {
    usage()
    process.exit(2)
  }

  const inputIdx = args.indexOf('--input')
  const policyIdx = args.indexOf('--policy')

  const inputPath = inputIdx !== -1 ? args[inputIdx + 1] : null
  const policyPath = policyIdx !== -1 ? args[policyIdx + 1] : 'policy.yaml'

  if (!inputPath) {
    console.error('Missing --input')
    usage()
    process.exit(2)
  }

  const raw = fs.readFileSync(inputPath, 'utf8')
  const input = JSON.parse(raw)

  const out = await evaluate(input, policyPath)
  process.stdout.write(JSON.stringify(out, null, 2) + '\n')

  if (out.decision === 'DENY') process.exit(1)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
