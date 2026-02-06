/**
 * Example: Code with DANGEROUS findings
 * REJECT - Do not install this code
 */

// DANGEROUS: eval() allows arbitrary code execution
function executeUserCode(userInput) {
  const result = eval(userInput)
  return result
}

// DANGEROUS: exec() allows arbitrary code execution
function runCommand(cmd) {
  return exec(cmd)
}

// DANGEROUS: Dynamic require with variables
// Can load arbitrary files from filesystem
function loadModule(moduleName) {
  try {
    const mod = require('./' + moduleName)
    return mod
  } catch (err) {
    return null
  }
}

// DANGEROUS: Code injection vector
function buildAndExecute(userTemplate) {
  const code = `
    function process(data) {
      return ${userTemplate};
    }
  `
  eval(code) // Execute injected code
}

module.exports = {
  executeUserCode,
  runCommand,
  loadModule,
  buildAndExecute,
}
