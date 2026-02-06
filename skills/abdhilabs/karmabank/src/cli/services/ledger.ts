/**
 * Ledger Service
 * 
 * A lightweight in-memory / file-based ledger for tracking:
 * - Registered agents
 * - Loans
 * - Repayments
 * 
 * This is a CLI-focused implementation meant for hackathon demos.
 * It can be replaced with a proper database-backed ledger later.
 */

import fs from 'fs/promises';
import path from 'path';

import { AgentStatus } from '../../data/storage.js';
// Import Agent from models (canonical source)
import type { Agent } from '../../models/agent';

/**
 * Loan status enumeration
 */
export enum LoanStatus {
  ACTIVE = 'active',
  REPAID = 'repaid',
  DEFAULTED = 'defaulted',
  PENDING = 'pending',
}

/**
 * Loan record stored in ledger
 */
export interface Loan {
  id: string;
  agentId: string;
  amount: number;
  interestRate: number;
  termDays: number;
  issuedAt: number;
  dueAt: number;
  status: LoanStatus;
  repaymentTxHash?: string;
  repaidAt?: number;
}

/**
 * Internal ledger storage schema
 */
interface LedgerStore {
  agents: Agent[];
  loans: Loan[];
}

/**
 * Default ledger file location
 */
const LEDGER_PATH = process.env.CREDIT_LEDGER_PATH || path.join(process.cwd(), '.credit-ledger.json');

/**
 * LedgerService provides CRUD operations for agents and loans.
 */
class LedgerService {
  /**
   * Load ledger from disk
   * @returns Ledger store
   */
  private async load(): Promise<LedgerStore> {
    try {
      const raw = await fs.readFile(LEDGER_PATH, 'utf8');
      return JSON.parse(raw) as LedgerStore;
    } catch {
      return { agents: [], loans: [] };
    }
  }

  /**
   * Persist ledger to disk
   * @param store - Ledger store
   */
  private async save(store: LedgerStore): Promise<void> {
    await fs.writeFile(LEDGER_PATH, JSON.stringify(store, null, 2), 'utf8');
  }

  /**
   * Register a new agent
   * @param agent - Agent record
   */
  async registerAgent(agent: Agent): Promise<void> {
    const store = await this.load();
    store.agents.push(agent);
    await this.save(store);
  }

  /**
   * Find an agent by name
   * @param name - Agent name
   * @returns Agent or undefined
   */
  async findAgentByName(name: string): Promise<Agent | undefined> {
    const store = await this.load();
    return store.agents.find(a => a.moltbookName.toLowerCase() === name.toLowerCase());
  }

  /**
   * List all agents
   * @returns Array of agents
   */
  async listAgents(): Promise<Agent[]> {
    const store = await this.load();
    return store.agents;
  }

  /**
   * Record a loan
   * @param loan - Loan record
   */
  async recordLoan(loan: Loan): Promise<void> {
    const store = await this.load();
    store.loans.push(loan);
    await this.save(store);
  }

  /**
   * Get all loans for an agent
   * @param agentId - Agent ID
   * @returns Loans for agent
   */
  async getAgentLoans(agentId: string): Promise<Loan[]> {
    const store = await this.load();
    return store.loans.filter(l => l.agentId === agentId);
  }

  /**
   * Update agent after borrowing
   * @param agentId - Agent ID
   * @param amount - Borrowed amount
   * @param dueAt - Due date
   */
  async updateAgentBorrowing(agentId: string, amount: number, dueAt: number): Promise<void> {
    const store = await this.load();
    const agent = store.agents.find(a => a.id === agentId);
    if (!agent) throw new Error('Agent not found');
    
    agent.outstandingLoan = amount;
    agent.lastActivity = new Date(dueAt).toISOString();
    await this.save(store);
  }

  /**
   * Record repayment of a loan
   * @param loanId - Loan ID
   * @param txHash - Transaction hash/id
   * @param amount - Amount repaid
   */
  async recordRepayment(loanId: string, txHash: string, amount: number): Promise<void> {
    const store = await this.load();
    const loan = store.loans.find(l => l.id === loanId);
    if (!loan) throw new Error('Loan not found');
    
    loan.repaymentTxHash = txHash;
    loan.repaidAt = Date.now();
    loan.status = LoanStatus.REPAID;
    await this.save(store);
  }

  /**
   * Update agent after repayment
   * @param agentId - Agent ID
   * @param newOutstanding - New outstanding amount
   */
  async updateAgentAfterRepayment(agentId: string, newOutstanding: number): Promise<void> {
    const store = await this.load();
    const agent = store.agents.find(a => a.id === agentId);
    if (!agent) throw new Error('Agent not found');
    
    agent.outstandingLoan = newOutstanding;
    if (newOutstanding <= 0) {
      agent.status = AgentStatus.SUSPENDED;
    }
    await this.save(store);
  }
}

/**
 * Singleton ledger service instance
 */
export const ledgerService = new LedgerService();
