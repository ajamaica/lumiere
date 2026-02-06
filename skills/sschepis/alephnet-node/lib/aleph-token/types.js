// types.js
const DEFAULT_GAS_CONFIG = {
  baseGasPrice: 0.000001, // 1 micro-Aleph
  directPaymentDiscount: 0.1, // 10% off for direct ℵ payment
  creditConversionRate: 100, // 100 Credits per ℵ
  burnPercent: 0.5, // 50% burned
  rewardPoolPercent: 0.3, // 30% to rewards
  treasuryPercent: 0.2, // 20% to treasury
  coherenceSubsidyThreshold: 0.8, // Min coherence for subsidy
  maxSubsidyPercent: 0.5, // Max 50% subsidy
}

module.exports = {
  DEFAULT_GAS_CONFIG,
}
