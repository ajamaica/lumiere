import { describe, expect, it } from 'vitest'

import {
  calculateMemoryAttestationReward,
  calculateMeshParticipationReward,
  // Minting
  calculateMessageReward,
  calculateRisaContributionReward,
  estimateHourlyEarnings,
  projectEarnings,
  validateMintingEligibility,
} from '../minting'
import {
  calculateCoherenceBonus,
  calculateEarlyUnstakePenalty,
  calculateEffectiveApy,
  calculateLockBonus,
  calculatePendingRewards,
  // Staking
  calculateTier,
  canUnstake,
  createStake,
  getTierConfig,
  getTierThresholds,
  projectRewards,
  simulateTierUpgrade,
} from '../staking'
import { type AlephStake, COHERENCE_MINTING_CONFIG, STAKE_TIERS, type StakeTier } from '../types'

describe('Aleph Token Module', () => {
  // ==========================================================================
  // MINTING
  // ==========================================================================
  describe('Minting', () => {
    describe('calculateMessageReward', () => {
      it('should return zero reward for low coherence', () => {
        const result = calculateMessageReward({
          messageCoherence: 0.3,
          entropyBefore: 0.5,
          entropyAfter: 0.5,
          addedToMemoryField: false,
          conversationAverageCoherence: 0.3,
          consecutiveHighCoherenceMessages: 0,
        })

        expect(result.totalReward).toBe(0)
        expect(result.baseReward).toBe(0)
      })

      it('should calculate base reward for coherence at threshold', () => {
        const result = calculateMessageReward({
          messageCoherence: 0.5,
          entropyBefore: 0.5,
          entropyAfter: 0.5,
          addedToMemoryField: false,
          conversationAverageCoherence: 0.5,
          consecutiveHighCoherenceMessages: 0,
        })

        expect(result.baseReward).toBe(COHERENCE_MINTING_CONFIG.baseReward)
        expect(result.coherenceMultiplier).toBeCloseTo(1)
        expect(result.totalReward).toBeGreaterThan(0)
      })

      it('should apply coherence multiplier for high coherence', () => {
        const lowCoherence = calculateMessageReward({
          messageCoherence: 0.5,
          entropyBefore: 0.5,
          entropyAfter: 0.5,
          addedToMemoryField: false,
          conversationAverageCoherence: 0.5,
          consecutiveHighCoherenceMessages: 0,
        })

        const highCoherence = calculateMessageReward({
          messageCoherence: 1.0,
          entropyBefore: 0.5,
          entropyAfter: 0.5,
          addedToMemoryField: false,
          conversationAverageCoherence: 1.0,
          consecutiveHighCoherenceMessages: 0,
        })

        expect(highCoherence.coherenceMultiplier).toBe(
          COHERENCE_MINTING_CONFIG.maxCoherenceMultiplier,
        )
        expect(highCoherence.totalReward).toBeGreaterThan(lowCoherence.totalReward)
      })

      it('should apply entropy reduction bonus', () => {
        const noReduction = calculateMessageReward({
          messageCoherence: 0.7,
          entropyBefore: 0.5,
          entropyAfter: 0.5,
          addedToMemoryField: false,
          conversationAverageCoherence: 0.7,
          consecutiveHighCoherenceMessages: 0,
        })

        const withReduction = calculateMessageReward({
          messageCoherence: 0.7,
          entropyBefore: 0.8,
          entropyAfter: 0.3,
          addedToMemoryField: false,
          conversationAverageCoherence: 0.7,
          consecutiveHighCoherenceMessages: 0,
        })

        expect(withReduction.entropyBonus).toBeGreaterThan(noReduction.entropyBonus)
        expect(withReduction.totalReward).toBeGreaterThan(noReduction.totalReward)
      })

      it('should apply knowledge bonus when added to memory', () => {
        const noMemory = calculateMessageReward({
          messageCoherence: 0.7,
          entropyBefore: 0.5,
          entropyAfter: 0.5,
          addedToMemoryField: false,
          conversationAverageCoherence: 0.7,
          consecutiveHighCoherenceMessages: 0,
        })

        const withMemory = calculateMessageReward({
          messageCoherence: 0.7,
          entropyBefore: 0.5,
          entropyAfter: 0.5,
          addedToMemoryField: true,
          conversationAverageCoherence: 0.7,
          consecutiveHighCoherenceMessages: 0,
        })

        expect(withMemory.knowledgeBonus).toBe(COHERENCE_MINTING_CONFIG.knowledgeBonus)
        expect(noMemory.knowledgeBonus).toBe(0)
      })

      it('should apply sustained coherence bonus', () => {
        const noStreak = calculateMessageReward({
          messageCoherence: 0.8,
          entropyBefore: 0.5,
          entropyAfter: 0.5,
          addedToMemoryField: false,
          conversationAverageCoherence: 0.8,
          consecutiveHighCoherenceMessages: 5,
        })

        const withStreak = calculateMessageReward({
          messageCoherence: 0.8,
          entropyBefore: 0.5,
          entropyAfter: 0.5,
          addedToMemoryField: false,
          conversationAverageCoherence: 0.8,
          consecutiveHighCoherenceMessages: 15,
        })

        expect(withStreak.sustainedBonus).toBeGreaterThan(noStreak.sustainedBonus)
        expect(withStreak.totalReward).toBeGreaterThan(noStreak.totalReward)
      })
    })

    describe('validateMintingEligibility', () => {
      it('should reject short messages', () => {
        const result = validateMintingEligibility(5, null, 0)
        expect(result.eligible).toBe(false)
        expect(result.reason).toContain('short')
      })

      it('should accept messages meeting length requirement', () => {
        const result = validateMintingEligibility(20, null, 0)
        expect(result.eligible).toBe(true)
      })

      it('should enforce cooldown period', () => {
        const recentMint = Date.now() - 1000 // 1 second ago
        const result = validateMintingEligibility(20, recentMint, 0)
        expect(result.eligible).toBe(false)
        expect(result.reason).toContain('Cooldown')
      })

      it('should allow minting after cooldown', () => {
        const oldMint = Date.now() - 10000 // 10 seconds ago
        const result = validateMintingEligibility(20, oldMint, 0)
        expect(result.eligible).toBe(true)
      })

      it('should enforce hourly limit', () => {
        const result = validateMintingEligibility(
          20,
          null,
          COHERENCE_MINTING_CONFIG.maxMintingPerHour + 1,
        )
        expect(result.eligible).toBe(false)
        expect(result.reason).toContain('Hourly')
      })
    })

    describe('calculateMemoryAttestationReward', () => {
      it('should increase reward with memory size', () => {
        const small = calculateMemoryAttestationReward(10, 1, 0.5)
        const large = calculateMemoryAttestationReward(1000, 1, 0.5)
        expect(large).toBeGreaterThan(small)
      })

      it('should increase reward with prime complexity', () => {
        const lowComplex = calculateMemoryAttestationReward(100, 1, 0.5)
        const highComplex = calculateMemoryAttestationReward(100, 10, 0.5)
        expect(highComplex).toBeGreaterThan(lowComplex)
      })

      it('should increase reward with verification level', () => {
        const lowVerif = calculateMemoryAttestationReward(100, 1, 0.3)
        const highVerif = calculateMemoryAttestationReward(100, 1, 1.0)
        expect(highVerif).toBeGreaterThan(lowVerif)
      })
    })

    describe('calculateMeshParticipationReward', () => {
      it('should reward uptime', () => {
        const lowUptime = calculateMeshParticipationReward(0.5, 0, 0, 0)
        const highUptime = calculateMeshParticipationReward(1.0, 0, 0, 0)
        expect(highUptime).toBeGreaterThan(lowUptime)
      })

      it('should reward transaction propagation', () => {
        const noTx = calculateMeshParticipationReward(0.5, 0, 0, 0)
        const withTx = calculateMeshParticipationReward(0.5, 50, 0, 0)
        expect(withTx).toBeGreaterThan(noTx)
      })

      it('should apply coherence contribution multiplier', () => {
        const noCoherence = calculateMeshParticipationReward(0.5, 10, 5, 0)
        const withCoherence = calculateMeshParticipationReward(0.5, 10, 5, 0.5)
        expect(withCoherence).toBeGreaterThan(noCoherence)
      })
    })

    describe('calculateRisaContributionReward', () => {
      it('should return 0 for failed execution', () => {
        const result = calculateRisaContributionReward(100, false, 0.5, 0.5)
        expect(result).toBe(0)
      })

      it('should increase with instruction count', () => {
        const small = calculateRisaContributionReward(10, true, 0.5, 0.5)
        const large = calculateRisaContributionReward(100, true, 0.5, 0.5)
        expect(large).toBeGreaterThan(small)
      })

      it('should apply utility multiplier', () => {
        const lowUtil = calculateRisaContributionReward(50, true, 0.2, 0.5)
        const highUtil = calculateRisaContributionReward(50, true, 1.0, 0.5)
        expect(highUtil).toBeGreaterThan(lowUtil)
      })

      it('should add novelty bonus', () => {
        const noNovelty = calculateRisaContributionReward(50, true, 0.5, 0)
        const withNovelty = calculateRisaContributionReward(50, true, 0.5, 1.0)
        expect(withNovelty).toBeGreaterThan(noNovelty)
      })
    })

    describe('projectEarnings', () => {
      it('should project from hourly rate', () => {
        const proj = projectEarnings(1)
        expect(proj.hourly).toBe(1)
        expect(proj.daily).toBe(24)
        expect(proj.weekly).toBe(168)
        expect(proj.monthly).toBe(720)
        expect(proj.yearly).toBe(8760)
      })
    })

    describe('estimateHourlyEarnings', () => {
      it('should return 0 for low coherence', () => {
        expect(estimateHourlyEarnings(0.3)).toBe(0)
      })

      it('should return positive earnings for valid coherence', () => {
        const earnings = estimateHourlyEarnings(0.7)
        expect(earnings).toBeGreaterThan(0)
      })

      it('should cap at hourly maximum', () => {
        const earnings = estimateHourlyEarnings(1.0)
        expect(earnings).toBeLessThanOrEqual(COHERENCE_MINTING_CONFIG.maxMintingPerHour)
      })
    })
  })

  // ==========================================================================
  // STAKING
  // ==========================================================================
  describe('Staking', () => {
    describe('calculateTier', () => {
      it('should classify Observer tier', () => {
        expect(calculateTier(100)).toBe('observer')
        expect(calculateTier(1000)).toBe('observer')
        expect(calculateTier(9999)).toBe('observer')
      })

      it('should classify Witness tier', () => {
        expect(calculateTier(10000)).toBe('witness')
        expect(calculateTier(50000)).toBe('witness')
        expect(calculateTier(99999)).toBe('witness')
      })

      it('should classify Sentinel tier', () => {
        expect(calculateTier(100000)).toBe('sentinel')
        expect(calculateTier(500000)).toBe('sentinel')
        expect(calculateTier(999999)).toBe('sentinel')
      })

      it('should classify Guardian tier', () => {
        expect(calculateTier(1000000)).toBe('guardian')
        expect(calculateTier(10000000)).toBe('guardian')
      })

      it('should throw for amount below minimum', () => {
        expect(() => calculateTier(50)).toThrow()
      })
    })

    describe('getTierConfig', () => {
      it('should return correct configuration for each tier', () => {
        const tiers: StakeTier[] = ['observer', 'witness', 'sentinel', 'guardian']

        tiers.forEach((tier) => {
          const config = getTierConfig(tier)
          expect(config.tier).toBe(tier)
          expect(config.baseApy).toBeGreaterThan(0)
          expect(config.benefits.length).toBeGreaterThan(0)
        })
      })

      it('should have increasing APY for higher tiers', () => {
        const observer = getTierConfig('observer')
        const witness = getTierConfig('witness')
        const sentinel = getTierConfig('sentinel')
        const guardian = getTierConfig('guardian')

        expect(witness.baseApy).toBeGreaterThan(observer.baseApy)
        expect(sentinel.baseApy).toBeGreaterThan(witness.baseApy)
        expect(guardian.baseApy).toBeGreaterThan(sentinel.baseApy)
      })
    })

    describe('getTierThresholds', () => {
      it('should return all tier thresholds', () => {
        const thresholds = getTierThresholds()
        expect(thresholds.length).toBe(4)
        expect(thresholds.map((t) => t.tier)).toEqual([
          'observer',
          'witness',
          'sentinel',
          'guardian',
        ])
      })
    })

    describe('calculateLockBonus', () => {
      it('should return 0 for no lock period', () => {
        expect(calculateLockBonus('observer', 0)).toBe(0)
        expect(calculateLockBonus('guardian', 0)).toBe(0)
      })

      it('should return bonus for 30-day lock', () => {
        const bonus = calculateLockBonus('observer', 30)
        expect(bonus).toBe(STAKE_TIERS.observer.lockBonuses[30])
      })

      it('should return highest applicable bonus', () => {
        // 200 days should get 180-day bonus
        const bonus = calculateLockBonus('observer', 200)
        expect(bonus).toBe(STAKE_TIERS.observer.lockBonuses[180])
      })

      it('should return max bonus for 365-day lock', () => {
        const bonus = calculateLockBonus('guardian', 365)
        expect(bonus).toBe(STAKE_TIERS.guardian.lockBonuses[365])
      })
    })

    describe('calculateCoherenceBonus', () => {
      it('should return 0 for coherence below 0.5', () => {
        expect(calculateCoherenceBonus(0.3)).toBe(0)
        expect(calculateCoherenceBonus(0.49)).toBe(0)
      })

      it('should return 0 at exactly 0.5', () => {
        expect(calculateCoherenceBonus(0.5)).toBe(0)
      })

      it('should return 3% at coherence 1.0', () => {
        expect(calculateCoherenceBonus(1.0)).toBe(3)
      })

      it('should scale linearly between 0.5 and 1.0', () => {
        const at75 = calculateCoherenceBonus(0.75)
        expect(at75).toBeCloseTo(1.5, 1)
      })
    })

    describe('calculateEffectiveApy', () => {
      it('should combine all APY components', () => {
        const result = calculateEffectiveApy('witness', 90, 0.8)

        expect(result.baseApy).toBe(STAKE_TIERS.witness.baseApy)
        expect(result.lockBonus).toBeGreaterThan(0)
        expect(result.coherenceBonus).toBeGreaterThan(0)
        expect(result.total).toBe(result.baseApy + result.lockBonus + result.coherenceBonus)
      })
    })

    describe('calculatePendingRewards', () => {
      it('should calculate rewards based on time elapsed', () => {
        const amount = 10000
        const apy = 10
        const lastReward = new Date(Date.now() - 365.25 * 24 * 60 * 60 * 1000) // 1 year ago

        const rewards = calculatePendingRewards(amount, apy, lastReward)
        expect(rewards).toBeCloseTo((amount * apy) / 100, 0)
      })

      it('should return 0 for just-staked position', () => {
        const rewards = calculatePendingRewards(10000, 10, new Date())
        expect(rewards).toBeCloseTo(0, 3)
      })
    })

    describe('projectRewards', () => {
      it('should project rewards over time periods', () => {
        const proj = projectRewards(10000, 10)

        expect(proj.yearly).toBe(1000)
        expect(proj.monthly).toBeCloseTo(1000 / 12, 1)
        expect(proj.weekly).toBeCloseTo(1000 / 52, 1)
        expect(proj.daily).toBeCloseTo(1000 / 365, 2)
      })
    })

    describe('createStake', () => {
      it('should create stake with correct tier', () => {
        const result = createStake(10000, 90, 0.7)
        expect(result.tier).toBe('witness')
      })

      it('should calculate effective APY', () => {
        const result = createStake(100000, 180, 0.9)
        expect(result.effectiveApy).toBeGreaterThan(result.baseApy)
      })

      it('should set unlock date for locked stake', () => {
        const result = createStake(10000, 30, 0.5)
        expect(result.unlockAt).not.toBeNull()
        expect(result.unlockAt!.getTime()).toBeGreaterThan(Date.now())
      })

      it('should not set unlock date for unlocked stake', () => {
        const result = createStake(10000, 0, 0.5)
        expect(result.unlockAt).toBeNull()
      })
    })

    describe('canUnstake', () => {
      it('should return false for inactive stake', () => {
        const stake: AlephStake = {
          id: 'test',
          userId: 'user',
          amount: 1000,
          tier: 'observer',
          lockPeriodDays: 0,
          lockType: 'none',
          baseApy: 5,
          lockBonusApy: 0,
          coherenceBonusApy: 0,
          effectiveApy: 5,
          stakedAt: new Date().toISOString(),
          unlockAt: null,
          lastRewardAt: new Date().toISOString(),
          rewardsAccrued: 0,
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const result = canUnstake(stake)
        expect(result.canUnstake).toBe(false)
      })

      it('should return true for unlocked stake', () => {
        const stake: AlephStake = {
          id: 'test',
          userId: 'user',
          amount: 1000,
          tier: 'observer',
          lockPeriodDays: 0,
          lockType: 'none',
          baseApy: 5,
          lockBonusApy: 0,
          coherenceBonusApy: 0,
          effectiveApy: 5,
          stakedAt: new Date().toISOString(),
          unlockAt: null,
          lastRewardAt: new Date().toISOString(),
          rewardsAccrued: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const result = canUnstake(stake)
        expect(result.canUnstake).toBe(true)
      })

      it('should return false for locked stake before unlock', () => {
        const futureUnlock = new Date(Date.now() + 86400000).toISOString() // Tomorrow
        const stake: AlephStake = {
          id: 'test',
          userId: 'user',
          amount: 1000,
          tier: 'observer',
          lockPeriodDays: 30,
          lockType: 'voluntary',
          baseApy: 5,
          lockBonusApy: 1,
          coherenceBonusApy: 0,
          effectiveApy: 6,
          stakedAt: new Date().toISOString(),
          unlockAt: futureUnlock,
          lastRewardAt: new Date().toISOString(),
          rewardsAccrued: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const result = canUnstake(stake)
        expect(result.canUnstake).toBe(false)
        expect(result.timeRemaining).toBeGreaterThan(0)
      })
    })

    describe('calculateEarlyUnstakePenalty', () => {
      it('should return 0 for unlocked stake', () => {
        const stake: AlephStake = {
          id: 'test',
          userId: 'user',
          amount: 1000,
          tier: 'observer',
          lockPeriodDays: 0,
          lockType: 'none',
          baseApy: 5,
          lockBonusApy: 0,
          coherenceBonusApy: 0,
          effectiveApy: 5,
          stakedAt: new Date().toISOString(),
          unlockAt: null,
          lastRewardAt: new Date().toISOString(),
          rewardsAccrued: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        expect(calculateEarlyUnstakePenalty(stake)).toBe(0)
      })

      it('should calculate penalty for early unstake', () => {
        const now = Date.now()
        const stakedAt = new Date(now - 15 * 86400000).toISOString() // 15 days ago
        const unlockAt = new Date(now + 15 * 86400000).toISOString() // 15 days from now

        const stake: AlephStake = {
          id: 'test',
          userId: 'user',
          amount: 1000,
          tier: 'observer',
          lockPeriodDays: 30,
          lockType: 'voluntary',
          baseApy: 5,
          lockBonusApy: 1,
          coherenceBonusApy: 0,
          effectiveApy: 6,
          stakedAt,
          unlockAt,
          lastRewardAt: new Date().toISOString(),
          rewardsAccrued: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const penalty = calculateEarlyUnstakePenalty(stake)
        expect(penalty).toBeGreaterThan(0)
        expect(penalty).toBeLessThanOrEqual(stake.amount * 0.1)
      })
    })

    describe('simulateTierUpgrade', () => {
      it('should detect tier upgrade', () => {
        const result = simulateTierUpgrade(9000, 2000, 90, 0.7)

        expect(result.currentTier).toBe('observer')
        expect(result.newTier).toBe('witness')
        expect(result.tierChanged).toBe(true)
        expect(result.newApy).toBeGreaterThan(result.currentApy)
        expect(result.additionalBenefits.length).toBeGreaterThan(0)
      })

      it('should return same tier when no upgrade', () => {
        const result = simulateTierUpgrade(1000, 500, 0, 0.5)

        expect(result.currentTier).toBe('observer')
        expect(result.newTier).toBe('observer')
        expect(result.tierChanged).toBe(false)
        expect(result.additionalBenefits).toEqual([])
      })
    })
  })

  // ==========================================================================
  // STAKE TIERS CONFIG
  // ==========================================================================
  describe('STAKE_TIERS config', () => {
    it('should have four tiers', () => {
      expect(Object.keys(STAKE_TIERS).length).toBe(4)
    })

    it('should have non-overlapping stake ranges', () => {
      expect(STAKE_TIERS.observer.maxStake).toBeLessThan(STAKE_TIERS.witness.minStake)
      expect(STAKE_TIERS.witness.maxStake).toBeLessThan(STAKE_TIERS.sentinel.minStake)
      expect(STAKE_TIERS.sentinel.maxStake).toBeLessThan(STAKE_TIERS.guardian.minStake)
    })

    it('should have increasing minimum stakes', () => {
      expect(STAKE_TIERS.observer.minStake).toBeLessThan(STAKE_TIERS.witness.minStake)
      expect(STAKE_TIERS.witness.minStake).toBeLessThan(STAKE_TIERS.sentinel.minStake)
      expect(STAKE_TIERS.sentinel.minStake).toBeLessThan(STAKE_TIERS.guardian.minStake)
    })

    it('should have lock bonuses for all standard periods', () => {
      Object.values(STAKE_TIERS).forEach((tier) => {
        expect(tier.lockBonuses[30]).toBeDefined()
        expect(tier.lockBonuses[90]).toBeDefined()
        expect(tier.lockBonuses[180]).toBeDefined()
        expect(tier.lockBonuses[365]).toBeDefined()
      })
    })
  })
})
