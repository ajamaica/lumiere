// staking.js
// Simplified for JS port

function calculateTier(stakeAmount, lockDurationDays) {
  // Mock implementation for the skill wrapper
  if (stakeAmount > 10000) return 'Archon'
  if (stakeAmount > 1000) return 'Magus'
  if (stakeAmount > 100) return 'Adept'
  return 'Neophyte'
}

module.exports = {
  calculateTier,
}
