/**
 * Loan Ledger Model
 * Tracks all loans and their statuses
 */

import { randomUUID } from 'crypto';

import {
  defaultLoansData,
  LoanRecord,
  LoanRecordStatus,
  storage,
} from '../data/storage';

/**
 * Loan record for the ledger
 */
export interface Loan {
  /** Unique loan identifier */
  id: string;
  /** Associated agent ID */
  agentId: string;
  /** Agent's Moltbook name */
  agentName: string;
  /** Loan amount in USDC */
  amount: number;
  /** Current status */
  status: LoanStatus;
  /** ISO timestamp when loan is due */
  dueDate: string;
  /** ISO timestamp when loan was created */
  createdAt: string;
  /** ISO timestamp when loan was repaid (optional) */
  repaidAt?: string;
  /** Annual interest rate (optional, defaults to 0) */
  interestRate?: number;
}

/**
 * Loan status enum
 */
export enum LoanStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  REPAID = 'repaid',
  DEFAULTED = 'defaulted',
  OVERDUE = 'overdue',
}

/**
 * Loan creation input
 */
export interface CreateLoanInput {
  /** Agent ID */
  agentId: string;
  /** Agent's Moltbook name */
  agentName: string;
  /** Loan amount in USDC */
  amount: number;
  /** Loan term in days */
  termDays: number;
  /** Annual interest rate (optional, defaults to 0) */
  interestRate?: number;
}

/**
 * Loan update input
 */
export interface UpdateLoanInput {
  /** New status (optional) */
  status?: LoanStatus;
  /** Repayment transaction hash (optional) */
  repaymentTxHash?: string;
}

/**
 * Loan query options
 */
export interface LoanQueryOptions {
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by status */
  status?: LoanStatus;
  /** Filter by due date before */
  dueBefore?: Date;
  /** Filter by due date after */
  dueAfter?: Date;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Loan Ledger class for managing loan records
 */
export class LoanLedger {
  private dataFile = 'loans';
  private defaultTermDays = 14;

  /**
   * Creates a new loan
   * @param input - Loan creation input
   * @returns The created loan
   */
  create(input: CreateLoanInput): Loan {
    const data = storage.read<{ loans: LoanRecord[] }>(
      this.dataFile,
      defaultLoansData()
    );

    const now = new Date();
    const dueDate = new Date(now.getTime() + input.termDays * 24 * 60 * 60 * 1000);

    const loan: LoanRecord = {
      id: randomUUID(),
      agentId: input.agentId,
      agentName: input.agentName,
      amount: input.amount,
      status: LoanRecordStatus.PENDING,
      dueDate: dueDate.toISOString(),
      createdAt: now.toISOString(),
      interestRate: input.interestRate || 0,
    };

    data.loans.push(loan);
    storage.write(this.dataFile, data);

    return this.toLoan(loan);
  }

  /**
   * Gets a loan by ID
   * @param id - Loan ID
   * @returns Loan if found, undefined otherwise
   */
  getById(id: string): Loan | undefined {
    const data = storage.read<{ loans: LoanRecord[] }>(
      this.dataFile,
      defaultLoansData()
    );
    const record = data.loans.find((l) => l.id === id);
    return record ? this.toLoan(record) : undefined;
  }

  /**
   * Gets a loan by ID (alias for getById)
   * @param id - Loan ID
   * @returns Loan if found, undefined otherwise
   */
  get(id: string): Loan | undefined {
    return this.getById(id);
  }

  /**
   * Updates a loan
   * @param id - Loan ID
   * @param input - Update input
   * @returns Updated loan
   * @throws Error if loan not found
   */
  update(id: string, input: UpdateLoanInput): Loan {
    const data = storage.read<{ loans: LoanRecord[] }>(
      this.dataFile,
      defaultLoansData()
    );

    const index = data.loans.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Loan with ID "${id}" not found`);
    }

    const loan = data.loans[index];
    if (input.status !== undefined) {
      loan.status = this.toRecordStatus(input.status);
    }
    if (input.repaymentTxHash !== undefined) {
      loan.repaidAt = new Date().toISOString();
    }

    data.loans[index] = loan;
    storage.write(this.dataFile, data);

    return this.toLoan(loan);
  }

  /**
   * Activates a pending loan
   * @param id - Loan ID
   * @returns Updated loan
   */
  activate(id: string): Loan {
    return this.update(id, { status: LoanStatus.ACTIVE });
  }

  /**
   * Marks a loan as repaid
   * @param id - Loan ID
   * @param repaymentTxHash - Transaction hash for the repayment
   * @returns Updated loan
   */
  markRepaid(id: string, repaymentTxHash?: string): Loan {
    return this.update(id, { status: LoanStatus.REPAID, repaymentTxHash });
  }

  /**
   * Marks a loan as defaulted
   * @param id - Loan ID
   * @returns Updated loan
   */
  markDefaulted(id: string): Loan {
    return this.update(id, { status: LoanStatus.DEFAULTED });
  }

  /**
   * Marks overdue loans
   * @returns Array of marked loans
   */
  markOverdue(): Loan[] {
    const data = storage.read<{ loans: LoanRecord[] }>(
      this.dataFile,
      defaultLoansData()
    );

    const now = new Date().toISOString();
    const updatedLoans: Loan[] = [];

    data.loans.forEach((loan, index) => {
      if (
        loan.status === LoanRecordStatus.ACTIVE &&
        loan.dueDate < now
      ) {
        loan.status = LoanRecordStatus.OVERDUE;
        updatedLoans.push(this.toLoan(loan));
        data.loans[index] = loan;
      }
    });

    if (updatedLoans.length > 0) {
      storage.write(this.dataFile, data);
    }

    return updatedLoans;
  }

  /**
   * Gets active loans for an agent
   * @param agentId - Agent ID
   * @returns Array of active loans
   */
  getActiveLoans(agentId: string): Loan[] {
    const data = storage.read<{ loans: LoanRecord[] }>(
      this.dataFile,
      defaultLoansData()
    );

    return data.loans
      .filter(
        (l) =>
          l.agentId === agentId &&
          (l.status === LoanRecordStatus.ACTIVE ||
            l.status === LoanRecordStatus.OVERDUE)
      )
      .map((l) => this.toLoan(l));
  }

  /**
   * Gets all loans for an agent (history)
   * @param agentId - Agent ID
   * @returns Array of all loans for the agent
   */
  getHistory(agentId: string): Loan[] {
    const data = storage.read<{ loans: LoanRecord[] }>(
      this.dataFile,
      defaultLoansData()
    );

    return data.loans
      .filter((l) => l.agentId === agentId)
      .map((l) => this.toLoan(l));
  }

  /**
   * Gets total outstanding loan amount for an agent
   * @param agentId - Agent ID
   * @returns Total outstanding amount
   */
  getOutstandingAmount(agentId: string): number {
    const activeLoans = this.getActiveLoans(agentId);
    return activeLoans.reduce((sum, loan) => sum + loan.amount, 0);
  }

  /**
   * Gets all loans with optional filters
   * @param options - Query options
   * @returns Array of matching loans
   */
  list(options: LoanQueryOptions = {}): Loan[] {
    const data = storage.read<{ loans: LoanRecord[] }>(
      this.dataFile,
      defaultLoansData()
    );

    let loans = [...data.loans];

    // Apply filters
    if (options.agentId) {
      loans = loans.filter((l) => l.agentId === options.agentId);
    }

    if (options.status) {
      const recordStatus = this.toRecordStatus(options.status);
      loans = loans.filter((l) => l.status === recordStatus);
    }

    if (options.dueBefore) {
      const dueBefore = options.dueBefore.toISOString();
      loans = loans.filter((l) => l.dueDate < dueBefore);
    }

    if (options.dueAfter) {
      const dueAfter = options.dueAfter.toISOString();
      loans = loans.filter((l) => l.dueDate > dueAfter);
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || loans.length;
    loans = loans.slice(offset, offset + limit);

    return loans.map((l) => this.toLoan(l));
  }

  /**
   * Gets overdue loans
   * @returns Array of overdue loans
   */
  getOverdueLoans(): Loan[] {
    const data = storage.read<{ loans: LoanRecord[] }>(
      this.dataFile,
      defaultLoansData()
    );

    const now = new Date().toISOString();
    return data.loans
      .filter(
        (l) =>
          (l.status === LoanRecordStatus.ACTIVE ||
            l.status === LoanRecordStatus.OVERDUE) &&
          l.dueDate < now
      )
      .map((l) => this.toLoan(l));
  }

  /**
   * Gets default count for an agent
   * @param agentId - Agent ID
   * @returns Number of defaults
   */
  getDefaultCount(agentId: string): number {
    const data = storage.read<{ loans: LoanRecord[] }>(
      this.dataFile,
      defaultLoansData()
    );

    return data.loans.filter(
      (l) => l.agentId === agentId && l.status === LoanRecordStatus.DEFAULTED
    ).length;
  }

  /**
   * Deletes a loan by ID
   * @param id - Loan ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): boolean {
    const data = storage.read<{ loans: LoanRecord[] }>(
      this.dataFile,
      defaultLoansData()
    );

    const index = data.loans.findIndex((l) => l.id === id);
    if (index === -1) {
      return false;
    }

    data.loans.splice(index, 1);
    storage.write(this.dataFile, data);
    return true;
  }

  /**
   * Converts a storage record to a Loan
   * @param record - Storage record
   * @returns Loan instance
   */
  private toLoan(record: LoanRecord): Loan {
    return {
      id: record.id,
      agentId: record.agentId,
      agentName: record.agentName,
      amount: record.amount,
      status: this.fromRecordStatus(record.status),
      dueDate: record.dueDate,
      createdAt: record.createdAt,
      repaidAt: record.repaidAt,
      interestRate: record.interestRate,
    };
  }

  /**
   * Converts LoanStatus to LoanRecordStatus
   * @param status - Loan status
   * @returns Record status
   */
  private toRecordStatus(status: LoanStatus): LoanRecordStatus {
    switch (status) {
      case LoanStatus.PENDING:
        return LoanRecordStatus.PENDING;
      case LoanStatus.ACTIVE:
        return LoanRecordStatus.ACTIVE;
      case LoanStatus.REPAID:
        return LoanRecordStatus.REPAID;
      case LoanStatus.DEFAULTED:
        return LoanRecordStatus.DEFAULTED;
      case LoanStatus.OVERDUE:
        return LoanRecordStatus.OVERDUE;
      default:
        return LoanRecordStatus.PENDING;
    }
  }

  /**
   * Converts LoanRecordStatus to LoanStatus
   * @param status - Record status
   * @returns Loan status
   */
  private fromRecordStatus(status: LoanRecordStatus): LoanStatus {
    switch (status) {
      case LoanRecordStatus.PENDING:
        return LoanStatus.PENDING;
      case LoanRecordStatus.ACTIVE:
        return LoanStatus.ACTIVE;
      case LoanRecordStatus.REPAID:
        return LoanStatus.REPAID;
      case LoanRecordStatus.DEFAULTED:
        return LoanStatus.DEFAULTED;
      case LoanRecordStatus.OVERDUE:
        return LoanStatus.OVERDUE;
      default:
        return LoanStatus.PENDING;
    }
  }
}

/**
 * Singleton instance for convenience
 */
export const loanLedger = new LoanLedger();
