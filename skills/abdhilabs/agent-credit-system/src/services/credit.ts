/**
 * Credit Service - Orchestrates credit operations
 * 
 * Combines:
 * - Moltbook adapter (agent profiles)
 * - Scoring engine (credit calculation)
 * - Ledger service (agent + loan records)
 * - Circle adapter (USDC transfers)
 */

import { CircleClient, createCircleClient } from '../adapters/circle';
import { createMoltbookClient,MoltbookClient, MoltbookProfile } from '../adapters/moltbook';
import type { Agent } from '../models/agent';
import type { Loan } from '../models/loan';
import { calculateCreditScore, CREDIT_TIERS,CreditScore } from '../scoring';
import { AgentProfile } from '../types.js';
import { creditLedger } from './ledger';

/**
 * Credit service configuration
 */
export interface CreditServiceConfig {
  moltbookApiKey?: string;
  circleConfig?: {
    apiKey: string;
    entitySecret: string;
    env?: 'sandbox' | 'production';
  };
  mockMode?: boolean;
}

/**
 * Credit operation result
 */
export interface CreditResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Agent registration result
 */
export interface RegisterResult {
  agent: Agent;
  creditScore: CreditScore;
}

/**
 * Loan disbursement result
 */
export interface DisburseResult {
  loan: Loan;
  transactionId: string;
  txHash?: string;
}

/**
 * Credit Service
 */
export class CreditService {
  private moltbook: MoltbookClient | null = null;
  private circle: CircleClient;
  private mockMode: boolean;

  constructor(config?: CreditServiceConfig) {
    this.mockMode = config?.mockMode || false;
    
    // Initialize Moltbook client
    if (!this.mockMode && config?.moltbookApiKey) {
      this.moltbook = createMoltbookClient(config.moltbookApiKey);
    }
    
    // Initialize Circle client
    if (config?.circleConfig) {
      this.circle = createCircleClient({ ...config.circleConfig, mockMode: this.mockMode });
    } else {
      this.circle = createCircleClient({ 
        apiKey: 'demo', 
        entitySecret: 'demo', 
        mockMode: true 
      });
    }
  }

  /**
   * Register a new agent
   */
  async registerAgent(name: string): Promise<CreditResult<RegisterResult>> {
    try {
      // Fetch Moltbook profile
      let profile: MoltbookProfile;
      if (this.moltbook) {
        const result = await this.moltbook.getAgentProfile(name);
        if ('success' in result && !result.success) {
          return { success: false, error: result.error };
        }
        profile = result as MoltbookProfile;
      } else {
        // Mock profile
        profile = this.createMockProfile(name);
      }

      // Calculate credit score
      const scoringProfile = this.convertToScoringProfile(profile);
      const creditScore = calculateCreditScore(scoringProfile);

      // Create agent record
      const agent: Agent = {
        id: `agent-${Date.now()}`,
        name: profile.name,
        profileId: profile.id,
        creditTier: creditScore.tier,
        maxBorrow: creditScore.maxBorrow,
        isBorrowingEnabled: creditScore.tier > 0,
        outstandingLoan: 0,
        defaultCount: 0,
        registeredAt: Date.now(),
        lastScoreAt: creditScore.calculatedAt,
      };

      // Check if already registered
      const existing = await creditLedger.findAgentByName(name);
      if (existing) {
        return { 
          success: false, 
          error: `Agent "${name}" is already registered` 
        };
      }

      // Store in ledger
      await creditLedger.registerAgent(agent);

      return {
        success: true,
        data: { agent, creditScore },
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  }

  /**
   * Check agent's credit status
   */
  async checkCredit(name: string): Promise<CreditResult<{
    agent: Agent;
    creditScore: CreditScore;
    poolBalance: number;
  }>> {
    try {
      const agent = await creditLedger.findAgentByName(name);
      if (!agent) {
        return { success: false, error: `Agent "${name}" not found` };
      }

      // Fetch latest profile for scoring
      let scoringProfile: AgentProfile;
      if (this.moltbook) {
        const profile = await this.moltbook.getAgentProfile(name);
        if ('success' in profile && !profile.success) {
          // Use cached profile
          scoringProfile = this.convertToScoringProfile(profile as unknown as MoltbookProfile);
        } else {
          scoringProfile = this.convertToScoringProfile(profile as MoltbookProfile);
        }
      } else {
        scoringProfile = this.convertToScoringProfile(this.createMockProfile(name));
      }

      const creditScore = calculateCreditScore(scoringProfile);

      // Get pool balance
      const pool = await this.circle.getPoolWallet();
      const poolBalance = 'usdcBalance' in pool ? pool.usdcBalance : 0;

      return {
        success: true,
        data: { agent, creditScore, poolBalance },
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Check failed' 
      };
    }
  }

  /**
   * Borrow USDC
   */
  async borrow(name: string, amount: number): Promise<CreditResult<DisburseResult>> {
    try {
      const agent = await creditLedger.findAgentByName(name);
      if (!agent) {
        return { success: false, error: `Agent "${name}" not registered` };
      }

      if (!agent.isBorrowingEnabled) {
        return { success: false, error: 'Borrowing is disabled for this agent' };
      }

      if (agent.outstandingLoan > 0) {
        return { success: false, error: 'Already has an active loan' };
      }

      if (amount > agent.maxBorrow) {
        return { 
          success: false, 
          error: `Amount exceeds max borrow limit of ${agent.maxBorrow} USDC` 
        };
      }

      // Check pool balance
      const pool = await this.circle.getPoolWallet();
      if ('usdcBalance' in pool && pool.usdcBalance < amount) {
        return { success: false, error: 'Insufficient pool balance' };
      }

      // Create loan record
      const loan: Loan = {
        id: `loan-${Date.now()}`,
        agentId: agent.id,
        amount,
        interestRate: 0,
        termDays: 14,
        issuedAt: Date.now(),
        dueAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
        status: 'active',
      };

      // Disburse USDC
      const disbursement = await this.circle.disburseLoan(
        agent.walletAddress || '0x0000000000000000000000000000000000000000',
        amount
      );

      if (!disbursement.success) {
        return { success: false, error: disbursement.error };
      }

      // Record loan
      await creditLedger.recordLoan(loan);
      await creditLedger.updateAgentBorrowing(agent.id, amount, loan.dueAt);

      return {
        success: true,
        data: {
          loan,
          transactionId: disbursement.transactionId || '',
          txHash: disbursement.txHash,
        },
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Borrow failed' 
      };
    }
  }

  /**
   * Repay USDC loan
   */
  async repay(name: string, amount: number): Promise<CreditResult<{
    loan: Loan;
    transactionId: string;
  }>> {
    try {
      const agent = await creditLedger.findAgentByName(name);
      if (!agent) {
        return { success: false, error: `Agent "${name}" not registered` };
      }

      if (agent.outstandingLoan <= 0) {
        return { success: false, error: 'No active loan to repay' };
      }

      if (amount !== agent.outstandingLoan) {
        return { 
          success: false, 
          error: 'Full repayment required (partial repayment not supported)' 
        };
      }

      // Get active loan
      const loans = await creditLedger.getAgentLoans(agent.id);
      const activeLoan = loans.find(l => l.status === 'active');
      if (!activeLoan) {
        return { success: false, error: 'No active loan found' };
      }

      // Process repayment
      const repayment = await this.circle.receiveRepayment(
        agent.walletAddress || '0x0000000000000000000000000000000000000000',
        amount
      );

      if (!repayment.success) {
        return { success: false, error: repayment.error };
      }

      // Update loan status
      await creditLedger.recordRepayment(
        activeLoan.id,
        repayment.transactionId || `repay-${Date.now()}`,
        amount
      );
      await creditLedger.updateAgentAfterRepayment(agent.id, 0);

      return {
        success: true,
        data: {
          loan: { ...activeLoan, status: 'repaid' },
          transactionId: repayment.transactionId || '',
        },
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Repay failed' 
      };
    }
  }

  /**
   * List all registered agents
   */
  async listAgents(): Promise<CreditResult<Agent[]>> {
    try {
      const agents = await creditLedger.listAgents();
      return { success: true, data: agents };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'List failed' 
      };
    }
  }

  /**
   * Get loan history for an agent
   */
  async getHistory(name: string): Promise<CreditResult<Loan[]>> {
    try {
      const agent = await creditLedger.findAgentByName(name);
      if (!agent) {
        return { success: false, error: `Agent "${name}" not found` };
      }

      const loans = await creditLedger.getAgentLoans(agent.id);
      return { success: true, data: loans };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'History failed' 
      };
    }
  }

  /**
   * Create mock Moltbook profile
   */
  private createMockProfile(name: string): MoltbookProfile {
    const now = new Date();
    return {
      id: `mock-${name}`,
      name,
      description: 'Mock agent for testing',
      created_at: now.toISOString(),
      last_active: now.toISOString(),
      karma: Math.floor(Math.random() * 500) + 50,
      metadata: {},
      is_claimed: true,
      claimed_at: now.toISOString(),
      owner_id: 'mock-owner',
      owner: {
        xHandle: 'mockOwner',
        xName: 'Mock Owner',
        xAvatar: '',
        xBio: '',
        xFollowerCount: Math.floor(Math.random() * 2000) + 100,
        xFollowingCount: Math.floor(Math.random() * 100) + 10,
        xVerified: true,
      },
      stats: {
        posts: Math.floor(Math.random() * 30) + 5,
        comments: Math.floor(Math.random() * 50) + 10,
        subscriptions: Math.floor(Math.random() * 10) + 1,
      },
    };
  }

  /**
   * Convert Moltbook profile to scoring profile
   */
  private convertToScoringProfile(profile: MoltbookProfile): AgentProfile {
    const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : Date.now();
    const lastActive = profile.last_active ? new Date(profile.last_active).getTime() : Date.now();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return {
      id: profile.id,
      name: profile.name,
      karma: profile.karma,
      is_claimed: profile.is_claimed,
      is_active: lastActive > sevenDaysAgo,
      created_at: createdAt,
      last_active: lastActive,
      stats: {
        posts: profile.stats.posts,
        comments: profile.stats.comments,
      },
      follower_count: profile.owner?.xFollowerCount || 0,
      following_count: profile.owner?.xFollowingCount || 0,
      owner: {
        x_verified: profile.owner?.xVerified || false,
        x_follower_count: profile.owner?.xFollowerCount || 0,
      },
    };
  }
}

/**
 * Create credit service instance
 */
export function createCreditService(config?: CreditServiceConfig): CreditService {
  return new CreditService(config);
}
