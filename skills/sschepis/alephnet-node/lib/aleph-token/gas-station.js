// gas-station.js
const { DEFAULT_GAS_CONFIG } = require('./types')

function estimateGas(transactionType, complexity = 1, config = DEFAULT_GAS_CONFIG) {
  const baseGas = {
    contract_deploy: 100000,
    contract_call: 21000,
    token_transfer: 5000,
    stake: 10000,
    unstake: 10000,
    memory_store: 50000,
    memory_retrieve: 1000,
    mesh_propagate: 2000,
    consensus_vote: 5000,
  }

  const base = baseGas[transactionType] || 10000
  return Math.ceil(base * complexity)
}

function calculateGasCost(
  gasUnits,
  userCoherence = 0.5,
  hasAlephBalance = true,
  userCredits = 0,
  config = DEFAULT_GAS_CONFIG,
) {
  const baseCost = gasUnits * config.baseGasPrice
  const directCost = baseCost * (1 - config.directPaymentDiscount)
  const creditEquivalent = Math.ceil(baseCost * config.creditConversionRate)

  let subsidyAvailable = 0
  if (userCoherence >= config.coherenceSubsidyThreshold) {
    const subsidyScale =
      (userCoherence - config.coherenceSubsidyThreshold) / (1 - config.coherenceSubsidyThreshold)
    subsidyAvailable = baseCost * subsidyScale * config.maxSubsidyPercent
  }

  const subsidizedCost = Math.max(0, baseCost - subsidyAvailable)

  let recommended = 'converted'
  if (hasAlephBalance && directCost <= subsidizedCost) {
    recommended = 'direct'
  } else if (subsidyAvailable > 0 && userCoherence >= config.coherenceSubsidyThreshold) {
    recommended = 'subsidized'
  } else if (userCredits >= creditEquivalent) {
    recommended = 'converted'
  } else if (hasAlephBalance) {
    recommended = 'direct'
  }

  return {
    gasUnits,
    baseCost,
    directCost,
    creditEquivalent,
    subsidyAvailable,
    subsidizedCost,
    recommended,
  }
}

class GasStation {
  constructor(config = DEFAULT_GAS_CONFIG) {
    this.config = config
  }

  estimate(
    transactionType,
    complexity = 1,
    userCoherence = 0.5,
    hasAlephBalance = true,
    userCredits = 0,
  ) {
    const gasUnits = estimateGas(transactionType, complexity, this.config)
    return calculateGasCost(gasUnits, userCoherence, hasAlephBalance, userCredits, this.config)
  }
}

const gasStation = new GasStation()

module.exports = {
  estimateGas,
  calculateGasCost,
  GasStation,
  gasStation,
}
