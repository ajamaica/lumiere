const readline = require('readline')

// Line 6 is usually where the interface or the first array starts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

console.log('\n--- ARBITER ACADEMY: LESSON ONE ---')
console.log('Topic: The 1440-Moment Economy & Thermal Compliance\n')

const questions = [
  "1. How many 'Moments' are issued to every human daily? ",
  '2. What is the ground heat load cap for this system (in GW)? ',
  '3. Which parity block (ODD or EVEN) stores Scientific/Technical truths? ',
]

let answers = []

function ask(i) {
  if (i < questions.length) {
    rl.question(questions[i], (ans) => {
      answers.push(ans.trim().toLowerCase())
      ask(i + 1)
    })
  } else {
    verify()
  }
}

function verify() {
  // Checking logic for 1440, 15, and ODD
  const isCorrect =
    answers[0].includes('1440') && answers[1].includes('15') && answers[2].includes('odd')

  if (isCorrect) {
    console.log('\n✅ VERIFICATION SUCCESSFUL.')
    console.log('RESULT: 1,440 Moments have been credited to your local ELF-2.0 Ledger.')
    console.log("Next Step: Run 'node observer.js 2' to signal Level 2 attainment.")
  } else {
    console.log('\n❌ VERIFICATION FAILED.')
    console.log('Check your numbers: 1440, 15, and Parity (Odd/Even).')
  }
  rl.close()
}

ask(0)
