/**
 * Credit Ledger Service
 * Orchestrates agent registration, loan management, and credit operations
 */

import { storage } from '../data/storage';
import { Agent, agentRegistry,AgentStatus } from '../models/agent';
import { Loan, loanLedger,LoanStatus } from '../models/loan';

/**
 * Credit status response
 */
export interface CreditStatus {
  /** Agent name */
  agentName: string;
  /** Current credit score */
  creditScore: number;
  /** Maximum credit limit */
  creditLimit: number;
  /** Available credit */
  availableCredit: number;
  /** Outstanding loan amount */
  outstandingLoan: number;
  /** Active loan count */
  activeLoans: number;
  /** Default count */
  defaultCount: number;
  /** Agent status */
  status: AgentStatus;
}

/**
 * Agent with loans response
 */
export interface AgentWithLoans {
  /** Agent details */
  agent: Agent;
  /** Active loans */
  activeLoans: Loan[];
  /** Total outstanding amount */
  totalOutstanding: number;
  /** Repayment history count */
  repaymentHistory: number;
}

/**
 * Loan request result
 */
export interface LoanRequestResult {
  success: boolean;
  loan?: Loan;
  message: string;
  availableCredit?: number;
}

/**
 * Loan repayment result
 */
export interface RepaymentResult {
  success: boolean;
  loan?: Loan;
  message: string;
  remainingBalance?: number;
}

/**
 * Registration result
 */
export interface RegistrationResult {
  success: boolean;
  agent?: Agent;
  message: string;
}

/**
 * Credit Ledger Service class
 * Provides high-level operations for managing credit and loans
 */
export class CreditLedgerService {
  private agentRegistry: typeof agentRegistry;
  private loanLedger: typeof loanLedger;

  /**
   * Creates a new CreditLedgerService
   * @param agentRegistry - Agent registry instance
   * @param loanLedger - Loan ledger instance
   */
  constructor(
    agentRegistryInstance?: typeof agentRegistry,
    loanLedgerInstance?: typeof loanLedger
  ) {
    this.agentRegistry = agentRegistryInstance || agentRegistry;
    this.loanLedger = loanLedgerInstance || loanLedger;
  }

  /**
   * Registers a new agent
   * @param moltbookName - Agent's Moltbook name
   * @param creditScore - Calculated credit score
   * @param creditLimit - Assigned credit limit
   * @returns Registration result
   */
  registerAgent(
    moltbookName: string,
    creditScore: number,
    creditLimit: number
  ): RegistrationResult {
    try {
      // Validate inputs
      if (!moltbookName || moltbookName.trim().length === 0) {
        return {
          success: false,
          message: 'Agent name cannot be empty',
        };
      }

      if (creditScore < 0 || creditScore > 100) {
        return {
          success: false,
          message: 'Credit score must be between 0 and 100',
        };
      }

      if (creditLimit < 0) {
        return {
          success: false,
          message: 'Credit limit cannot be negative',
        };
      }

      // Check if agent already exists
      const existing = this.agentRegistry.get(moltbookName);
      if (existing) {
        return {
          success: false,
          message: `Agent "${moltbookName}" is already registered`,
        };
      }

      // Register the agent
      const agent = this.agentRegistry.register({
        moltbookName: moltbookName.trim(),
        creditScore,
        creditLimit,
      });

      return {
        success: true,
        agent,
        message: `Agent "${moltbookName}" registered successfully with credit limit ${creditLimit} USDC`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Registration failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Gets an agent by name with their loans
   * @param name - Agent's Moltbook name
   * @returns Agent with loans or undefined
   */
  getAgent(name: string): AgentWithLoans | undefined {
    const agent = this.agentRegistry.get(name);
    if (!agent) {
      return undefined;
    }

    const activeLoans = this.loanLedger.getActiveLoans(agent.id);
    const history = this.loanLedger.getHistory(agent.id);
    const repaidLoans = history.filter((l) => l.status === LoanStatus.REPAID);

    return {
      agent,
      activeLoans,
      totalOutstanding: activeLoans.reduce((sum, loan) => sum + loan.amount, 0),
      repaymentHistory: repaidLoans.length,
    };
  }

  /**
   * Requests a new loan
   * @param name - Agent's Moltbook name
   * @param amount - Requested loan amount
   * @param termDays - Loan term in days (default: 14)
   * @returns Loan request result
   */
  requestLoan(
    name: string,
    amount: number,
    termDays: number = 14
  ): LoanRequestResult {
    try {
      // Validate inputs
      if (!name || name.trim().length === 0) {
        return {
          success: false,
          message: 'Agent name cannot be empty',
        };
      }

      if (amount <= 0) {
        return {
          success: false,
          message: 'Loan amount must be greater than zero',
        };
      }

      // Get agent
      const agent = this.agentRegistry.get(name);
      if (!agent) {
        return {
          success: false,
          message: `Agent "${name}" not found`,
        };
      }

      // Check agent status
      if (agent.status !== AgentStatus.ACTIVE) {
        return {
          success: false,
          message: `Agent "${name}" is not active`,
        };
      }

      // Calculate available credit
      const currentOutstanding = this.loanLedger.getOutstandingAmount(agent.id);
      const availableCredit = agent.creditLimit - currentOutstanding;

      // Validate against credit limit
      if (amount > availableCredit) {
        return {
          success: false,
          message: `Requested amount ${amount} USDC exceeds available credit of ${availableCredit} USDC`,
          availableCredit,
        };
      }

      // Create the loan
      const loan = this.loanLedger.create({
        agentId: agent.id,
        agentName: agent.moltbookName,
        amount,
        termDays,
      });

      return {
        success: true,
        loan,
        message: `Loan of ${amount} USDC created successfully`,
        availableCredit: availableCredit - amount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Loan request failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Repays a loan
   * @param loanId - Loan ID
   * @param amount - Repayment amount
   * @param repaymentTxHash - Transaction hash for the repayment
   * @returns Repayment result
   */
  repayLoan(
    loanId: string,
    amount: number,
    repaymentTxHash?: string
  ): RepaymentResult {
    try {
      // Get the loan
      const loan = this.loanLedger.get(loanId);
      if (!loan) {
        return {
          success: false,
          message: `Loan "${loanId}" not found`,
        };
      }

      // Check loan status
      if (loan.status === LoanStatus.REPAID) {
        return {
          success: false,
          message: 'Loan has already been repaid',
        };
      }

      if (loan.status === LoanStatus.DEFAULTED) {
        return {
          success: false,
          message: 'Cannot repay a defaulted loan',
        };
      }

      // Validate repayment amount
      if (amount <= 0) {
        return {
          success: false,
          message: 'Repayment amount must be greater than zero',
        };
      }

      // For this system, we only support full repayment
      if (amount < loan.amount) {
        return {
          success: false,
          message: `Partial repayments not supported. Loan amount: ${loan.amount} USDC`,
        };
      }

      // Mark as repaid
      const repaidLoan = this.loanLedger.markRepaid(loanId, repaymentTxHash);

      // Update agent's outstanding loan
      const agent = this.agentRegistry.getById(loan.agentId);
      if (agent) {
        const remainingOutstanding = this.loanLedger.getOutstandingAmount(agent.id);
        this.agentRegistry.updateOutstandingLoan(agent.id, remainingOutstanding);
      }

      return {
        success: true,
        loan: repaidLoan,
        message: `Loan of ${loan.amount} USDC repaid successfully`,
        remainingBalance: 0,
      };
    } catch (error) {
      return {
        success: false,
        message: `Repayment failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Checks credit status for an agent
   * @param name - Agent's Moltbook name
   * @returns Credit status or undefined
   */
  checkCredit(name: string): CreditStatus | undefined {
    const agent = this.agentRegistry.get(name);
    if (!agent) {
      return undefined;
    }

    const outstanding = this.loanLedger.getOutstandingAmount(agent.id);
    const activeLoans = this.loanLedger.getActiveLoans(agent.id);
    const defaults = this.loanLedger.getDefaultCount(agent.id);

    return {
      agentName: agent.moltbookName,
      creditScore: agent.creditScore,
      creditLimit: agent.creditLimit,
      availableCredit: agent.creditLimit - outstanding,
      outstandingLoan: outstanding,
      activeLoans: activeLoans.length,
      defaultCount: defaults,
      status: agent.status,
    };
  }

  /**
   * Lists all registered agents
   * @param includeInactive - Whether to include inactive agents
   * @returns Array of agents
   */
  listAgents(includeInactive: boolean = false): Agent[] {
    if (includeInactive) {
      return this.agentRegistry.list();
    }
    return this.agentRegistry.listActive();
  }

  /**
   * Activates a pending loan
   * @param loanId - Loan ID
   * @returns Updated loan or undefined
   */
  activateLoan(loanId: string): Loan | undefined {
    const loan = this.loanLedger.get(loanId);
    if (!loan) {
      return undefined;
    }

    if (loan.status !== LoanStatus.PENDING) {
      return undefined;
    }

    return this.loanLedger.activate(loanId);
  }

  /**
   * Gets all loans with optional status filter
   * @param status - Optional status filter
   * @returns Array of loans
   */
  getAllLoans(status?: LoanStatus): Loan[] {
    if (status) {
      return this.loanLedger.list({ status });
    }
    return this.loanLedger.list();
  }

  /**
   * Gets overdue loans
   * @returns Array of overdue loans
   */
  getOverdueLoans(): Loan[] {
    return this.loanLedger.getOverdueLoans();
  }

  /**
   * Updates an agent's credit score
   * @param name - Agent's Moltbook name
   * @param newScore - New credit score
   * @returns Updated agent or undefined
   */
  updateCreditScore(name: string, newScore: number): Agent | undefined {
    const agent = this.agentRegistry.get(name);
    if (!agent) {
      return undefined;
    }

    if (newScore < 0 || newScore > 100) {
      return undefined;
    }

    return this.agentRegistry.update(agent.id, { creditScore: newScore });
  }

  /**
   * Suspends an agent
   * @param name - Agent's Moltbook name
   * @returns Updated agent or undefined
   */
  suspendAgent(name: string): Agent | undefined {
    const agent = this.agentRegistry.get(name);
    if (!agent) {
      return undefined;
    }

    return this.agentRegistry.update(agent.id, { status: AgentStatus.SUSPENDED });
  }

  /**
   * Reactivates a suspended agent
   * @param name - Agent's Moltbook name
   * @returns Updated agent or undefined
   */
  reactivateAgent(name: string): Agent | undefined {
    const agent = this.agentRegistry.get(name);
    if (!agent) {
      return undefined;
    }

    return this.agentRegistry.update(agent.id, { status: AgentStatus.ACTIVE });
  }

  /**
   * Gets loan statistics
   * @returns Object with loan statistics
   */
  getLoanStats(): {
    totalLoans: number;
    activeLoans: number;
    pendingLoans: number;
    repaidLoans: number;
    defaultedLoans: number;
    overdueLoans: number;
    totalVolume: number;
    outstandingVolume: number;
  } {
    const allLoans = this.loanLedger.list();
    const active = allLoans.filter((l) => l.status === LoanStatus.ACTIVE);
    const pending = allLoans.filter((l) => l.status === LoanStatus.PENDING);
    const repaid = allLoans.filter((l) => l.status === LoanStatus.REPAID);
    const defaulted = allLoans.filter((l) => l.status === LoanStatus.DEFAULTED);
    const overdue = this.loanLedger.getOverdueLoans();

    return {
      totalLoans: allLoans.length,
      activeLoans: active.length,
      pendingLoans: pending.length,
      repaidLoans: repaid.length,
      defaultedLoans: defaulted.length,
      overdueLoans: overdue.length,
      totalVolume: allLoans.reduce((sum, l) => sum + l.amount, 0),
      outstandingVolume: active.reduce((sum, l) => sum + l.amount, 0),
    };
  }

  /**
   * Checks if an agent can borrow
   * @param name - Agent's Moltbook name
   * @returns Object with borrow eligibility info
   */
  canBorrow(name: string): {
    canBorrow: boolean;
    reason?: string;
    availableCredit?: number;
  } {
    const agent = this.agentRegistry.get(name);
    if (!agent) {
      return { canBorrow: false, reason: 'Agent not found' };
    }

    if (agent.status !== AgentStatus.ACTIVE) {
      return { canBorrow: false, reason: 'Agent is not active' };
    }

    const outstanding = this.loanLedger.getOutstandingAmount(agent.id);
    const available = agent.creditLimit - outstanding;

    if (available <= 0) {
      return {
        canBorrow: false,
        reason: 'No available credit',
        availableCredit: 0,
      };
    }

    return {
      canBorrow: true,
      availableCredit: available,
    };
  }

  /**
   * Initializes storage and creates default data files
   */
  initialize(): void {
    storage.init();
  }
}

/**
 * Singleton instance for convenience
 */
export const creditLedger = new CreditLedgerService();
export { agentRegistry };
