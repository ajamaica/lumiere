/**
 * Coherence Integration Module
 *
 * Exports all coherence-related types, managers, and utilities.
 *
 * @module @sschepis/alephnet-node/lib/coherence
 */

'use strict'

const types = require('./types')
const stakes = require('./stakes')
const rewards = require('./rewards')
const semanticBridge = require('./semantic-bridge')

module.exports = {
  // Types and constants
  ...types,

  // Stake management
  StakeManager: stakes.StakeManager,
  initStakeManager: stakes.initStakeManager,
  getStakeManager: stakes.getStakeManager,

  // Reward system
  RewardManager: rewards.RewardManager,
  initRewardManager: rewards.initRewardManager,
  getRewardManager: rewards.getRewardManager,

  // Semantic bridge
  SemanticBridge: semanticBridge.SemanticBridge,
  initSemanticBridge: semanticBridge.initSemanticBridge,
  getSemanticBridge: semanticBridge.getSemanticBridge,
}
