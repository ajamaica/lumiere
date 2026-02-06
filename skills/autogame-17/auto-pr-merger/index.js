#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const minimist = require('minimist')
const path = require('path')

const args = minimist(process.argv.slice(2))

const pr = args.pr
const testCommand = args.test
const maxRetries = args.retries || 3

if (!pr || !testCommand) {
  console.error(
    'Usage: node skills/auto-pr-merger/index.js --pr <PR_NUMBER> --test "<TEST_COMMAND>" [--retries <NUMBER>]',
  )
  process.exit(1)
}

// Helper to run shell commands
function run(command, ignoreError = false) {
  console.log(`> ${command}`)
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    return { success: true, output }
  } catch (error) {
    if (!ignoreError) {
      console.error(`Command failed: ${command}`)
    }
    // execSync throws an error object that contains stdout/stderr
    const errOut = (error.stdout || '') + '\n' + (error.stderr || '')
    return { success: false, output: errOut }
  }
}

async function callLLM(prompt) {
  let apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    // Try to load from .env in workspace root
    const possiblePaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '..', '.env'),
      path.resolve(__dirname, '../../..', '.env'),
    ]

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          const envContent = fs.readFileSync(p, 'utf8')
          const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m)
          if (match) {
            apiKey = match[1].trim()
            // Remove quotes if present
            if (
              (apiKey.startsWith('"') && apiKey.endsWith('"')) ||
              (apiKey.startsWith("'") && apiKey.endsWith("'"))
            ) {
              apiKey = apiKey.slice(1, -1)
            }
            console.log(`Loaded GEMINI_API_KEY from ${p}`)
            break
          }
        } catch (e) {
          // ignore read errors
        }
      }
    }
  }

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not found in environment or .env files.')
    return null
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    if (!response.ok) {
      console.error(`Gemini API Error: ${response.statusText}`)
      console.error(await response.text())
      return null
    }

    const data = await response.json()
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) return null

    // cleanup markdown code blocks if present
    text = text.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/im, '')
    return text.trim()
  } catch (e) {
    console.error('Failed to call LLM:', e)
    return null
  }
}

function findFailingFile(output) {
  const lines = output.split('\n')
  const fileRegex = /([a-zA-Z0-9_\-\./]+\.(?:ts|js|tsx|jsx))/

  // Strategy 1: Look for explicit FAIL lines
  for (const line of lines) {
    if (line.includes('FAIL') || line.includes('Error:')) {
      const match = line.match(fileRegex)
      if (match && fs.existsSync(match[1])) {
        return match[1]
      }
    }
  }

  // Strategy 2: Just find the first file path that exists in the output
  for (const line of lines) {
    const match = line.match(fileRegex)
    if (match && fs.existsSync(match[1])) {
      return match[1]
    }
  }

  return null
}

function getTargetBranch(prNumber) {
  const res = run(`gh pr view ${prNumber} --json baseRefName --jq .baseRefName`, true)
  if (res.success) {
    return res.output.trim()
  }
  console.warn("Could not determine target branch. Defaulting to 'main'.")
  return 'main'
}

async function resolveConflicts(targetBranch) {
  console.log(`\n--- Checking for merge conflicts with ${targetBranch} ---`)

  // Ensure we have the latest target branch info
  run(`git fetch origin ${targetBranch}`)

  // Try to merge target into current branch
  const mergeRes = run(`git merge origin/${targetBranch}`, true)

  if (mergeRes.success) {
    console.log('No conflicts with target branch (or merge clean).')
    return true
  }

  // Check if it's actually a conflict
  if (!mergeRes.output.includes('CONFLICT') && !mergeRes.output.includes('conflict')) {
    console.error('Merge failed for reason other than conflicts:')
    console.error(mergeRes.output)
    return false
  }

  console.log('⚠️ Merge conflicts detected. Attempting AI resolution...')

  // Get list of conflicted files
  const diffRes = run('git diff --name-only --diff-filter=U', true)
  if (!diffRes.success) {
    console.error('Failed to list conflicted files.')
    return false
  }

  const files = diffRes.output
    .trim()
    .split('\n')
    .filter((f) => f)
  if (files.length === 0) {
    console.error('Merge failed but no conflicted files found?')
    return false
  }

  for (const file of files) {
    console.log(`Resolving conflict in: ${file}`)
    if (!fs.existsSync(file)) {
      console.log(`File ${file} deleted in one branch? Skipping.`)
      continue
    }

    const content = fs.readFileSync(file, 'utf8')

    const prompt = `You are an expert developer. The following file contains git merge conflict markers (<<<<<<<, =======, >>>>>>>).
        
Please resolve the conflicts intelligently. Preserve the logic that makes the most sense.
Ensure the code is syntactically correct and functional. Return ONLY the resolved code for the entire file.

File content:
${content}`

    console.log('Calling LLM...')
    const resolved = await callLLM(prompt)
    if (!resolved) {
      console.error(`Failed to resolve ${file} via LLM.`)
      run('git merge --abort')
      return false
    }

    fs.writeFileSync(file, resolved)
    run(`git add "${file}"`)
  }

  const commitRes = run('git commit -m "chore: resolve merge conflicts via auto-pr-merger"', true)
  if (commitRes.success) {
    console.log('Conflicts resolved locally. Pushing to PR branch...')
    const pushRes = run('git push')
    if (pushRes.success) {
      console.log('Push successful.')
      return true
    } else {
      console.error('Failed to push resolution.')
      return false
    }
  } else {
    console.error('Failed to commit resolution.')
    return false
  }
}

function performMerge(prNumber) {
  console.log('\n--- Step 4: Merging PR ---')
  console.log('Attempting auto-merge (wait for checks)...')

  // Try auto-merge first (respects branch protection)
  const attempt1 = run(`gh pr merge ${prNumber} --merge --auto --delete-branch`, true)

  if (attempt1.success) {
    console.log('🎉 PR marked for auto-merge successfully!')
    return true
  }

  console.warn('⚠️ Auto-merge failed. Likely no branch protection or checks pending.')
  console.warn(`Stderr: ${attempt1.output}`)
  console.log('Attempting immediate merge...')

  // Fallback to immediate merge
  const attempt2 = run(`gh pr merge ${prNumber} --merge --delete-branch`, true)
  if (attempt2.success) {
    console.log('🎉 PR merged successfully (immediate)!')
    return true
  }

  console.error('❌ Failed to merge PR.')
  console.error(attempt2.output)
  return false
}

async function main() {
  console.log(`Starting Auto PR Merger for PR: ${pr}`)
  console.log(`Test Command: ${testCommand}`)
  console.log(`Max Retries: ${maxRetries}`)

  // 1. Checkout PR
  console.log('\n--- Step 1: Checking out PR ---')
  const checkoutRes = run(`gh pr checkout ${pr}`)
  if (!checkoutRes.success) {
    console.error('Failed to checkout PR. Ensure gh CLI is authenticated and repo is valid.')
    console.error(checkoutRes.output)
    process.exit(1)
  }

  // 1b. Check for conflicts
  const targetBranch = getTargetBranch(pr)
  const conflictResolved = await resolveConflicts(targetBranch)

  if (!conflictResolved && fs.existsSync('.git/MERGE_HEAD')) {
    // If we are still in a merging state (failed resolve), abort
    console.error('Could not resolve conflicts. Aborting.')
    run('git merge --abort')
    process.exit(1)
  }

  let attempt = 0
  let testsPassed = false

  // Loop: Test -> Fix -> Retry
  while (attempt <= maxRetries) {
    console.log(`\n--- Step 2: Running Tests (Attempt ${attempt + 1}/${maxRetries + 1}) ---`)
    const testRes = run(testCommand, true)

    if (testRes.success) {
      console.log('✅ Tests passed!')
      testsPassed = true
      break
    } else {
      console.log('❌ Tests failed.')
      console.log('--- Test Output (Tail) ---')
      const outputTail = testRes.output.slice(-2000)
      console.log(outputTail)

      if (attempt < maxRetries) {
        console.log(`\n--- Step 3: Attempting Fix (Attempt ${attempt + 1}) ---`)

        const failingFile = findFailingFile(testRes.output)

        if (failingFile) {
          console.log(`Found failing file: ${failingFile}`)
          const fileContent = fs.readFileSync(failingFile, 'utf8')

          const prompt = `You are an expert developer. The tests failed with this error:\n${outputTail}\n\nHere is the content of ${failingFile}:\n${fileContent}\n\nReturn the fixed code for the entire file. Do not wrap in markdown code blocks, just raw code.`

          console.log('Calling LLM for fix...')
          const fixedCode = await callLLM(prompt)

          if (fixedCode) {
            console.log('Received fix from LLM. Applying...')
            fs.writeFileSync(failingFile, fixedCode)

            run('git add .')
            const commitRes = run('git commit -m "Auto-fix applied by auto-pr-merger"', true)
            if (commitRes.success) {
              run('git push')
              console.log('Fix pushed to branch.')
            } else {
              console.log('Nothing to commit (LLM output matched existing file?) or error.')
            }
          } else {
            console.log('LLM failed to return a fix or API key missing.')
          }
        } else {
          console.log('Could not identify failing file from output. Cannot apply AI fix.')
        }

        attempt++
      } else {
        console.error('\n❌ Max retries reached. Tests still failing.')
        break
      }
    }
  }

  // 4. Merge if successful
  if (testsPassed) {
    if (performMerge(pr)) {
      process.exit(0)
    } else {
      process.exit(1)
    }
  } else {
    console.log('\n⛔ Workflow failed. PR not merged.')
    process.exit(1)
  }
}

main()
