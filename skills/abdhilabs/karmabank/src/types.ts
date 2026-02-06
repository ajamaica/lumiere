/**
 * TypeScript interfaces for the Agent Credit System
 * Defines data structures for Moltbook API responses, credit scoring, and loan management
 */

/**
 * Owner information for an agent
 */
export interface AgentOwner {
  /** Whether the human owner is X (Twitter) verified */
  x_verified: boolean
  /** Number of followers the owner has on X */
  x_follower_count: number
}

/**
 * Activity statistics for an agent
 */
export interface AgentStats {
  /** Total number of posts made */
  posts: number
  /** Total number of comments made */
  comments: number
}

/**
 * Agent profile data from Moltbook API
 * Contains all reputation and activity metrics used for credit scoring
 */
export interface AgentProfile {
  /** Unique agent identifier */
  id: string
  /** Agent's display name */
  name: string
  /** Total karma score - primary reputation metric */
  karma: number
  /** Whether the agent has been claimed by a verified human */
  is_claimed: boolean
  /** Whether the agent is currently active */
  is_active: boolean
  /** Unix timestamp when the agent account was created */
  created_at: number
  /** Unix timestamp of the agent's last activity */
  last_active: number
  /** Activity statistics */
  stats: AgentStats
  /** Number of followers the agent has */
  follower_count: number
  /** Number of accounts the agent follows */
  following_count: number
  /** Information about the agent's human owner */
  owner: AgentOwner
}

/**
 * Breakdown of factors that contributed to the credit score
 */
export interface ScoreFactors {
  /** Base score from karma normalization */
  karmaScore: number
  /** Bonus from claimed status */
  claimedBonus: number
  /** Bonus from account age */
  ageBonus: number
  /** Bonus from activity recency */
  activityBonus: number
  /** Bonus from engagement diversity (posts vs comments balance) */
  diversityBonus: number
  /** Bonus from follower count */
  followerBonus: number
  /** Bonus from owner credibility */
  ownerBonus: number
  /** Penalty for volatility/inconsistency */
  volatilityPenalty: number
  /** Final score after all adjustments */
  adjustedScore: number
}

/**
 * Complete credit score result
 */
export interface CreditScore {
  /** Raw calculated score before tier mapping (0-100 scale) */
  rawScore: number
  /** Credit tier level (1-5) */
  tier: number
  /** Maximum borrowable amount in USDC */
  maxBorrow: number
  /** Breakdown of score factors for transparency */
  factors: ScoreFactors
  /** Unix timestamp when this score was calculated */
  calculatedAt: number
  /** Expiration timestamp for cache invalidation */
  expiresAt: number
}

/**
 * Credit tier definitions
 */
export interface CreditTier {
  /** Tier level (1-5, higher is better) */
  level: number
  /** Minimum score required for this tier */
  minScore: number
  /** Maximum score allowed for this tier */
  maxScore: number
  /** Maximum USDC that can be borrowed at this tier */
  maxBorrow: number
  /** Annual interest rate (percentage, 0 for this system) */
  interestRate: number
  /** Loan term in days (14 for this system) */
  termDays: number
  /** Human-readable tier name */
  name: string
}

/**
 * Loan record for tracking active and historical loans
 */
export interface Loan {
  /** Unique loan identifier */
  id: string
  /** Agent ID that took the loan */
  agentId: string
  /** Amount borrowed in USDC */
  amount: number
  /** Annual interest rate */
  interestRate: number
  /** Loan term in days */
  termDays: number
  /** Unix timestamp when loan was issued */
  issuedAt: number
  /** Unix timestamp when loan is due */
  dueAt: number
  /** Current loan status */
  status: LoanStatus
  /** Repayment transaction hash (if repaid) */
  repaymentTxHash?: string
  /** Unix timestamp when repaid (if repaid) */
  repaidAt?: number
}

/**
 * Possible states of a loan
 */
export enum LoanStatus {
  /** Loan is active and accruing (though 0% here) */
  ACTIVE = 'active',
  /** Loan has been fully repaid */
  REPAID = 'repaid',
  /** Loan is past due and in default */
  DEFAULTED = 'defaulted',
  /** Loan is being processed */
  PENDING = 'pending',
}

/**
 * Agent registry entry
 */
export interface Agent {
  /** Unique agent identifier */
  id: string
  /** Agent's display name */
  name: string
  /** Associated Moltbook profile ID */
  profileId: string
  /** Current credit tier level */
  creditTier: number
  /** Maximum borrowable amount in USDC */
  maxBorrow: number
  /** Whether the agent can currently borrow */
  isBorrowingEnabled: boolean
  /** Current outstanding loan amount in USDC */
  outstandingLoan: number
  /** Unix timestamp of last loan activity */
  lastLoanAt?: number
  /** Loan default count */
  defaultCount: number
}

/**
 * Historical score entry for EMA smoothing
 */
export interface ScoreHistory {
  /** Agent ID */
  agentId: string
  /** Previous raw score */
  previousScore: number
  /** New raw score */
  newScore: number
  /** EMA smoothed score */
  smoothedScore: number
  /** Unix timestamp of this entry */
  recordedAt: number
}

/**
 * Configuration for the scoring algorithm
 */
export interface ScoringConfig {
  /** Weight for karma in base score calculation */
  karmaWeight: number
  /** Bonus points for claimed status */
  claimedBonus: number
  /** Maximum age bonus (in days) */
  maxAgeBonus: number
  /** Weight for age in bonus calculation */
  ageWeight: number
  /** Maximum activity bonus */
  maxActivityBonus: number
  /** Weight for activity in bonus calculation */
  activityWeight: number
  /** Maximum diversity bonus */
  maxDiversityBonus: number
  /** Weight for diversity in bonus calculation */
  diversityWeight: number
  /** Maximum follower bonus */
  maxFollowerBonus: number
  /** Weight for followers in bonus calculation */
  followerWeight: number
  /** Maximum owner bonus */
  maxOwnerBonus: number
  /** Weight for owner credibility in bonus calculation */
  ownerWeight: number
  /** Volatility penalty multiplier */
  volatilityPenaltyMultiplier: number
  /** EMA alpha factor for score smoothing (0-1) */
  emaAlpha: number
  /** Score scaling factor */
  scoreScale: number
}

/**
 * Default scoring configuration
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  karmaWeight: 40,
  claimedBonus: 15,
  maxAgeBonus: 10,
  ageWeight: 1,
  maxActivityBonus: 10,
  activityWeight: 1,
  maxDiversityBonus: 5,
  diversityWeight: 1,
  maxFollowerBonus: 10,
  followerWeight: 1,
  maxOwnerBonus: 10,
  ownerWeight: 1,
  volatilityPenaltyMultiplier: 2,
  emaAlpha: 0.3,
  scoreScale: 100,
}
