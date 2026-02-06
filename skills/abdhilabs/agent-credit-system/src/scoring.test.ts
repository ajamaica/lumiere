/**
 * Unit Tests for the Credit Scoring Engine
 * 
 * Tests cover:
 * - Karma normalization
 * - Trust modifiers (claimed, age, activity, diversity, followers, owner)
 * - Volatility penalty
 * - EMA smoothing
 * - Tier mapping
 * - Score calculations
 */

import {
  applyEMASmoothing,
  calculateAccountAge,
  calculateActivityScore,
  calculateAgeScore,
  calculateCreditScore,
  calculateDaysSinceActivity,
  calculateDiversityScore,
  calculateFollowerScore,
  calculateOwnerScore,
  calculateVolatilityPenalty,
  createLoan,
  createMockProfile,
  CREDIT_TIERS,
  getCreditLimit,
  getTier,
  LoanStatus,
  normalizeKarma,
  validateLoanRequest,
} from './scoring';

// ============================================================================
// Karma Normalization Tests
// ============================================================================

describe('normalizeKarma', () => {
  it('should return 0 for zero karma', () => {
    const result = normalizeKarma(0);
    expect(result).toBe(0);
  });

  it('should return 0 for negative karma', () => {
    const result = normalizeKarma(-100);
    expect(result).toBe(0);
  });

  it('should return normalized value for positive karma', () => {
    const result = normalizeKarma(100);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should cap at 1 for very high karma', () => {
    const result = normalizeKarma(100000);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should demonstrate diminishing returns', () => {
    const karma1000 = normalizeKarma(1000);
    const karma2000 = normalizeKarma(2000);
    
    // Doubling karma should less than double the normalized score
    const ratio = karma2000 / karma1000;
    expect(ratio).toBeLessThan(2);
    expect(ratio).toBeGreaterThan(1);
  });
});

// ============================================================================
// Account Age Tests
// ============================================================================

describe('calculateAccountAge', () => {
  it('should return 0 for future created_at', () => {
    const future = Date.now() + (24 * 60 * 60 * 1000);
    const result = calculateAccountAge(future);
    expect(result).toBe(0);
  });

  it('should calculate age correctly for past date', () => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const result = calculateAccountAge(oneDayAgo);
    expect(result).toBeGreaterThan(0.9);
    expect(result).toBeLessThan(1.1);
  });

  it('should return 0 for current timestamp', () => {
    const result = calculateAccountAge(Date.now());
    expect(result).toBeLessThan(0.01); // Essentially 0
  });
});

describe('calculateAgeScore', () => {
  it('should return 0 for brand new account', () => {
    const result = calculateAgeScore(Date.now(), 10);
    expect(result).toBe(0);
  });

  it('should return max bonus for account older than 1 year', () => {
    const oneYearAgo = Date.now() - (366 * 24 * 60 * 60 * 1000);
    const result = calculateAgeScore(oneYearAgo, 10);
    expect(result).toBeCloseTo(10, 1);
  });

  it('should scale linearly for accounts between 0 and 1 year', () => {
    const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
    const result = calculateAgeScore(sixMonthsAgo, 10);
    expect(result).toBeGreaterThan(4);
    expect(result).toBeLessThan(6);
  });
});

// ============================================================================
// Activity Tests
// ============================================================================

describe('calculateDaysSinceActivity', () => {
  it('should return 0 for current activity', () => {
    const result = calculateDaysSinceActivity(Date.now());
    expect(result).toBeLessThan(0.01);
  });

  it('should calculate days correctly', () => {
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const result = calculateDaysSinceActivity(threeDaysAgo);
    expect(result).toBeGreaterThan(2.9);
    expect(result).toBeLessThan(3.1);
  });
});

describe('calculateActivityScore', () => {
  it('should return max for current activity', () => {
    const result = calculateActivityScore(Date.now(), 10);
    expect(result).toBeCloseTo(10, 1);
  });

  it('should return 0 for 10+ days inactive', () => {
    const elevenDaysAgo = Date.now() - (11 * 24 * 60 * 60 * 1000);
    const result = calculateActivityScore(elevenDaysAgo, 10);
    expect(result).toBe(0);
  });

  it('should decay linearly with time', () => {
    const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
    const result = calculateActivityScore(fiveDaysAgo, 10);
    expect(result).toBeGreaterThan(4);
    expect(result).toBeLessThan(6);
  });
});

// ============================================================================
// Diversity Tests
// ============================================================================

describe('calculateDiversityScore', () => {
  it('should return 0 for no activity', () => {
    const result = calculateDiversityScore(0, 0, 5);
    expect(result).toBe(0);
  });

  it('should return max for perfect 50/50 split', () => {
    const result = calculateDiversityScore(50, 50, 5);
    expect(result).toBe(5);
  });

  it('should return half max for 100% posts', () => {
    const result = calculateDiversityScore(100, 0, 5);
    expect(result).toBeCloseTo(2.5, 1);
  });

  it('should return half max for 100% comments', () => {
    const result = calculateDiversityScore(0, 100, 5);
    expect(result).toBeCloseTo(2.5, 1);
  });

  it('should handle unequal totals correctly', () => {
    const result = calculateDiversityScore(75, 25, 5);
    // 75/25 is 0.25 away from ideal 0.5 => (1 - 0.25) * 5 = 3.75
    expect(result).toBeCloseTo(3.75, 2);
  });
});

// ============================================================================
// Follower Tests
// ============================================================================

describe('calculateFollowerScore', () => {
  it('should return 0 for 0 followers', () => {
    const result = calculateFollowerScore(0, 10);
    expect(result).toBe(0);
  });

  it('should scale with followers', () => {
    const lowResult = calculateFollowerScore(10, 10);
    const highResult = calculateFollowerScore(1000, 10);
    expect(highResult).toBeGreaterThan(lowResult);
  });

  it('should cap at max for high follower count', () => {
    const result = calculateFollowerScore(100000, 10);
    expect(result).toBeLessThanOrEqual(10);
  });

  it('should demonstrate diminishing returns (concave growth)', () => {
    const score100 = calculateFollowerScore(100, 10);
    const score200 = calculateFollowerScore(200, 10);
    const score400 = calculateFollowerScore(400, 10);

    // Total gain from 100->400 should be less than 3x the gain from 100->200
    // (loose assertion to avoid edge effects of log scaling)
    const gainSmall = score200 - score100;
    const gainLarge = score400 - score100;
    expect(gainLarge).toBeLessThan(gainSmall * 3);
  });
});

// ============================================================================
// Owner Credibility Tests
// ============================================================================

describe('calculateOwnerScore', () => {
  it('should return 0 for unverified owner', () => {
    const result = calculateOwnerScore(false, 0, 10);
    expect(result).toBe(0);
  });

  it('should give base bonus for verified owner', () => {
    const result = calculateOwnerScore(true, 0, 10);
    expect(result).toBeCloseTo(5, 0); // 50% of max
  });

  it('should add follower bonus for verified owner', () => {
    const noFollowers = calculateOwnerScore(true, 0, 10);
    const someFollowers = calculateOwnerScore(true, 5000, 10);
    expect(someFollowers).toBeGreaterThan(noFollowers);
  });

  it('should cap at max bonus', () => {
    const result = calculateOwnerScore(true, 1000000, 10);
    expect(result).toBeLessThanOrEqual(10);
  });
});

// ============================================================================
// Volatility Penalty Tests
// ============================================================================

describe('calculateVolatilityPenalty', () => {
  it('should return 0 for no previous karma', () => {
    const result = calculateVolatilityPenalty(100, 0);
    expect(result).toBe(0);
  });

  it('should return 0 for stable karma', () => {
    const result = calculateVolatilityPenalty(100, 100);
    expect(result).toBe(0);
  });

  it('should return 0 for small changes', () => {
    const result = calculateVolatilityPenalty(100, 105);
    expect(result).toBe(0);
  });

  it('should penalize large changes', () => {
    // 100% change (100 -> 200)
    const result = calculateVolatilityPenalty(200, 100, 2);
    expect(result).toBeLessThan(0);
  });

  it('should increase penalty with larger changes', () => {
    const smallChange = calculateVolatilityPenalty(120, 100, 2);
    const largeChange = calculateVolatilityPenalty(200, 100, 2);
    expect(Math.abs(largeChange)).toBeGreaterThan(Math.abs(smallChange));
  });
});

// ============================================================================
// EMA Smoothing Tests
// ============================================================================

describe('applyEMASmoothing', () => {
  it('should apply alpha even if previous score is 0', () => {
    const result = applyEMASmoothing(50, 0, 0.3);
    expect(result).toBeCloseTo(15, 5);
  });

  it('should blend new and previous scores', () => {
    const result = applyEMASmoothing(100, 0, 0.5);
    expect(result).toBe(50); // 0.5 * 100 + 0.5 * 0
  });

  it('should weight higher alpha toward new score', () => {
    const highAlpha = applyEMASmoothing(100, 0, 0.8);
    const lowAlpha = applyEMASmoothing(100, 0, 0.2);
    expect(highAlpha).toBeGreaterThan(lowAlpha);
  });

  it('should converge over multiple iterations', () => {
    let score = 0;
    const alpha = 0.3;
    
    for (let i = 0; i < 10; i++) {
      score = applyEMASmoothing(100, score, alpha);
    }
    
    // After many iterations, should be close to 100
    expect(score).toBeGreaterThan(90);
  });
});

// ============================================================================
// Tier Mapping Tests
// ============================================================================

describe('getTier', () => {
  it('should return blocked tier for 0 score', () => {
    const tier = getTier(0);
    expect(tier.level).toBe(0);
    expect(tier.maxBorrow).toBe(0);
  });

  it('should return tier 1 for low scores', () => {
    const tier = getTier(10);
    expect(tier.level).toBe(1);
    expect(tier.maxBorrow).toBe(50);
  });

  it('should return tier 3 for mid scores', () => {
    const tier = getTier(50);
    expect(tier.level).toBe(3);
    expect(tier.maxBorrow).toBe(300);
  });

  it('should return tier 5 for high scores', () => {
    const tier = getTier(90);
    expect(tier.level).toBe(5);
    expect(tier.maxBorrow).toBe(1000);
  });

  it('should return max tier for scores above 100', () => {
    const tier = getTier(150);
    expect(tier.level).toBe(5);
    expect(tier.maxBorrow).toBe(1000);
  });
});

describe('getCreditLimit', () => {
  it('should return 0 for blocked agents', () => {
    const limit = getCreditLimit(0);
    expect(limit).toBe(0);
  });

  it('should return correct limits for each tier', () => {
    expect(getCreditLimit(10)).toBe(50);
    expect(getCreditLimit(30)).toBe(150);
    expect(getCreditLimit(50)).toBe(300);
    expect(getCreditLimit(70)).toBe(600);
    expect(getCreditLimit(90)).toBe(1000);
  });
});

// ============================================================================
// Full Credit Score Calculation Tests
// ============================================================================

describe('calculateCreditScore', () => {
  it('should return blocked score for unclaimed agent', () => {
    const profile = createMockProfile({ is_claimed: false });
    const result = calculateCreditScore(profile);
    
    expect(result.rawScore).toBe(0);
    expect(result.tier).toBe(0);
    expect(result.maxBorrow).toBe(0);
  });

  it('should calculate score for claimed agent', () => {
    const profile = createMockProfile({ is_claimed: true });
    const result = calculateCreditScore(profile);
    
    expect(result.rawScore).toBeGreaterThan(0);
    expect(result.tier).toBeGreaterThanOrEqual(1);
    expect(result.maxBorrow).toBeGreaterThanOrEqual(50);
  });

  it('should include all factor breakdowns', () => {
    const profile = createMockProfile();
    const result = calculateCreditScore(profile);
    
    expect(result.factors).toBeDefined();
    expect(result.factors.karmaScore).toBeGreaterThan(0);
    expect(result.factors.claimedBonus).toBeGreaterThanOrEqual(15);
  });

  it('should give higher score for more karma', () => {
    const lowKarma = createMockProfile({ karma: 50 });
    const highKarma = createMockProfile({ karma: 500 });
    
    const lowScore = calculateCreditScore(lowKarma);
    const highScore = calculateCreditScore(highKarma);
    
    expect(highScore.rawScore).toBeGreaterThan(lowScore.rawScore);
  });

  it('should penalize inactivity', () => {
    const active = createMockProfile({ last_active: Date.now() });
    const inactive = createMockProfile({ last_active: Date.now() - (30 * 24 * 60 * 60 * 1000) });
    
    const activeScore = calculateCreditScore(active);
    const inactiveScore = calculateCreditScore(inactive);
    
    expect(activeScore.rawScore).toBeGreaterThanOrEqual(inactiveScore.rawScore);
  });

  it('should reward older accounts', () => {
    const newAccount = createMockProfile({ created_at: Date.now() - (7 * 24 * 60 * 60 * 1000) });
    const oldAccount = createMockProfile({ created_at: Date.now() - (365 * 24 * 60 * 60 * 1000) });
    
    const newScore = calculateCreditScore(newAccount);
    const oldScore = calculateCreditScore(oldAccount);
    
    expect(oldScore.rawScore).toBeGreaterThan(newScore.rawScore);
  });

  it('should reward verified owners', () => {
    const unverified = createMockProfile({ owner: { x_verified: false, x_follower_count: 0 } });
    const verified = createMockProfile({ owner: { x_verified: true, x_follower_count: 1000 } });
    
    const unverifiedScore = calculateCreditScore(unverified);
    const verifiedScore = calculateCreditScore(verified);
    
    expect(verifiedScore.rawScore).toBeGreaterThan(unverifiedScore.rawScore);
  });

  it('should smooth scores with EMA', () => {
    const first = createMockProfile({ karma: 100 });
    const second = createMockProfile({ karma: 200 });
    
    const score1 = calculateCreditScore(first, undefined, 0);
    const score2 = calculateCreditScore(second, undefined, score1.rawScore);
    
    // Second score should be influenced by first score
    expect(score2.rawScore).not.toBeGreaterThan(200);
  });

  it('should have valid timestamps', () => {
    const profile = createMockProfile();
    const result = calculateCreditScore(profile);
    
    expect(result.calculatedAt).toBeLessThanOrEqual(Date.now());
    expect(result.expiresAt).toBeGreaterThan(result.calculatedAt);
    expect(result.expiresAt - result.calculatedAt).toBe(24 * 60 * 60 * 1000); // 24 hours
  });
});

// ============================================================================
// Loan Validation Tests
// ============================================================================

describe('validateLoanRequest', () => {
  it('should reject blocked agents', () => {
    const blockedScore = calculateCreditScore(createMockProfile({ is_claimed: false }));
    const result = validateLoanRequest(blockedScore, 50);
    
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('not eligible');
  });

  it('should reject amounts exceeding max borrow', () => {
    const score = calculateCreditScore(createMockProfile());
    const result = validateLoanRequest(score, score.maxBorrow + 100);
    
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('exceeds maximum');
  });

  it('should reject amounts below minimum', () => {
    const score = calculateCreditScore(createMockProfile());
    const result = validateLoanRequest(score, 0.5);
    
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Minimum');
  });

  it('should accept valid requests', () => {
    const score = calculateCreditScore(createMockProfile());
    const result = validateLoanRequest(score, score.maxBorrow);
    
    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

// ============================================================================
// Credit Tier Configuration Tests
// ============================================================================

describe('CREDIT_TIERS', () => {
  it('should have 6 tiers (0-5)', () => {
    expect(CREDIT_TIERS.length).toBe(6);
  });

  it('should have continuous score coverage', () => {
    for (let i = 0; i < CREDIT_TIERS.length - 1; i++) {
      const current = CREDIT_TIERS[i];
      const next = CREDIT_TIERS[i + 1];
      
      // Current max should connect to next min
      expect(current.maxScore + 1).toBe(next.minScore);
    }
  });

  it('should have 0% interest for all tiers', () => {
    CREDIT_TIERS.forEach(tier => {
      expect(tier.interestRate).toBe(0);
    });
  });

  it('should have 14 day term for all tiers', () => {
    CREDIT_TIERS.forEach(tier => {
      expect(tier.termDays).toBe(14);
    });
  });

  it('should have increasing max borrow limits', () => {
    for (let i = 0; i < CREDIT_TIERS.length - 1; i++) {
      expect(CREDIT_TIERS[i].maxBorrow).toBeLessThan(CREDIT_TIERS[i + 1].maxBorrow);
    }
  });
});

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('Edge Cases', () => {
  it('should handle extremely high karma', () => {
    const profile = createMockProfile({ karma: 1000000 });
    const result = calculateCreditScore(profile);
    
    expect(result.rawScore).toBeLessThanOrEqual(100);
    // Should be eligible and non-trivial tier
    expect(result.tier).toBeGreaterThanOrEqual(1);
  });

  it('should handle zero followers and following', () => {
    const profile = createMockProfile({
      follower_count: 0,
      following_count: 0,
    });
    const result = calculateCreditScore(profile);
    
    expect(result.rawScore).toBeGreaterThan(0); // Still gets karma base
  });

  it('should handle extreme volatility', () => {
    const profile = createMockProfile({ karma: 1000 });
    
    // Previous history shows suspicious activity
    const result = calculateCreditScore(profile, undefined, 0, 100);
    const baseline = calculateCreditScore(profile, undefined, 0, 1000);
    
    expect(result.factors.volatilityPenalty).toBeLessThan(0);
    expect(result.rawScore).toBeLessThan(baseline.rawScore);
  });

  it('should handle inactive claimed account', () => {
    const profile = createMockProfile({
      is_claimed: true,
      is_active: false,
      last_active: Date.now() - (60 * 24 * 60 * 60 * 1000), // 60 days ago
    });
    
    const result = calculateCreditScore(profile);
    
    expect(result.tier).toBeGreaterThanOrEqual(1); // Still eligible
    expect(result.factors.activityBonus).toBe(0); // No activity bonus
  });
});
