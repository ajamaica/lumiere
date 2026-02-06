/**
 * Unit tests for Credit Ledger Service
 */

import * as fs from 'fs';
import * as path from 'path';

import { AgentStatus } from '../src/models/agent';
import { LoanStatus } from '../src/models/loan';
import { CreditLedgerService } from '../src/services/ledger';

const TEST_DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Helper to reset test data files
 */
function resetDataFiles(): void {
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(TEST_DATA_DIR, 'agents.json'), JSON.stringify({ agents: [] }, null, 2));
  fs.writeFileSync(path.join(TEST_DATA_DIR, 'loans.json'), JSON.stringify({ loans: [] }, null, 2));
  fs.writeFileSync(
    path.join(TEST_DATA_DIR, 'config.json'),
    JSON.stringify(
      {
        version: '1.0.0',
        createdAt: new Date('2026-02-04T00:00:00.000Z').toISOString(),
        lastUpdated: new Date('2026-02-04T00:00:00.000Z').toISOString(),
        systemStatus: 'active',
      },
      null,
      2
    )
  );
}

beforeEach(() => {
  resetDataFiles();
});

describe('CreditLedgerService', () => {
  test('registerAgent should register a new agent', () => {
    const service = new CreditLedgerService();
    service.initialize();

    const result = service.registerAgent('test_agent', 75, 500);

    expect(result.success).toBe(true);
    expect(result.agent).toBeDefined();
    expect(result.agent?.moltbookName).toBe('test_agent');
    expect(result.agent?.creditScore).toBe(75);
    expect(result.agent?.creditLimit).toBe(500);
    expect(result.agent?.status).toBe(AgentStatus.ACTIVE);
  });

  test('registerAgent should reject duplicate registration', () => {
    const service = new CreditLedgerService();
    service.initialize();

    service.registerAgent('dup_agent', 70, 200);
    const result = service.registerAgent('dup_agent', 70, 200);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already registered/i);
  });

  test('registerAgent should validate empty name', () => {
    const service = new CreditLedgerService();
    const result = service.registerAgent('', 70, 200);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/cannot be empty/i);
  });

  test('registerAgent should validate credit score range', () => {
    const service = new CreditLedgerService();

    const low = service.registerAgent('agent1', -1, 200);
    const high = service.registerAgent('agent2', 101, 200);

    expect(low.success).toBe(false);
    expect(high.success).toBe(false);
  });

  test('requestLoan should create loan when within credit limit', () => {
    const service = new CreditLedgerService();
    service.initialize();
    service.registerAgent('borrower', 80, 500);

    const result = service.requestLoan('borrower', 200);

    expect(result.success).toBe(true);
    expect(result.loan).toBeDefined();
    expect(result.loan?.amount).toBe(200);
    expect(result.loan?.status).toBe(LoanStatus.PENDING);
    expect(result.availableCredit).toBe(300);
  });

  test('requestLoan should reject when exceeding credit limit', () => {
    const service = new CreditLedgerService();
    service.initialize();
    service.registerAgent('borrower', 80, 100);

    const result = service.requestLoan('borrower', 200);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/exceeds available credit/i);
    expect(result.availableCredit).toBe(100);
  });

  test('requestLoan should reject for suspended agent', () => {
    const service = new CreditLedgerService();
    service.initialize();
    service.registerAgent('suspended', 80, 100);
    service.suspendAgent('suspended');

    const result = service.requestLoan('suspended', 50);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not active/i);
  });

  test('getAgent should return agent with loans', () => {
    const service = new CreditLedgerService();
    service.initialize();
    service.registerAgent('agent_with_loans', 80, 500);

    const loanResult = service.requestLoan('agent_with_loans', 200);
    expect(loanResult.success).toBe(true);

    const agentWithLoans = service.getAgent('agent_with_loans');
    expect(agentWithLoans).toBeDefined();
    expect(agentWithLoans?.agent.moltbookName).toBe('agent_with_loans');
    expect(agentWithLoans?.activeLoans.length).toBe(0); // pending not active
  });

  test('activateLoan should activate pending loan', () => {
    const service = new CreditLedgerService();
    service.initialize();
    service.registerAgent('activator', 80, 500);

    const loanResult = service.requestLoan('activator', 200);
    const loanId = loanResult.loan!.id;

    const activated = service.activateLoan(loanId);

    expect(activated).toBeDefined();
    expect(activated?.status).toBe(LoanStatus.ACTIVE);
  });

  test('repayLoan should mark loan as repaid (full repayment only)', () => {
    const service = new CreditLedgerService();
    service.initialize();
    service.registerAgent('repayer', 80, 500);

    const loanResult = service.requestLoan('repayer', 200);
    const loanId = loanResult.loan!.id;
    service.activateLoan(loanId);

    const repay = service.repayLoan(loanId, 200, 'tx_123');

    expect(repay.success).toBe(true);
    expect(repay.loan?.status).toBe(LoanStatus.REPAID);
  });

  test('repayLoan should reject partial repayment', () => {
    const service = new CreditLedgerService();
    service.initialize();
    service.registerAgent('partial', 80, 500);

    const loanResult = service.requestLoan('partial', 200);
    const loanId = loanResult.loan!.id;
    service.activateLoan(loanId);

    const repay = service.repayLoan(loanId, 100);

    expect(repay.success).toBe(false);
    expect(repay.message).toMatch(/partial repayments not supported/i);
  });

  test('checkCredit should return correct credit status', () => {
    const service = new CreditLedgerService();
    service.initialize();
    service.registerAgent('credit_check', 60, 300);

    const loanResult = service.requestLoan('credit_check', 100);
    service.activateLoan(loanResult.loan!.id);

    const status = service.checkCredit('credit_check');

    expect(status).toBeDefined();
    expect(status?.creditLimit).toBe(300);
    expect(status?.outstandingLoan).toBe(100);
    expect(status?.availableCredit).toBe(200);
    expect(status?.activeLoans).toBe(1);
  });

  test('listAgents should list active agents only by default', () => {
    const service = new CreditLedgerService();
    service.initialize();

    service.registerAgent('active1', 70, 200);
    service.registerAgent('active2', 70, 200);
    service.registerAgent('inactive', 70, 200);
    service.suspendAgent('inactive');

    const activeOnly = service.listAgents();
    const includeInactive = service.listAgents(true);

    expect(activeOnly.length).toBe(2);
    expect(includeInactive.length).toBe(3);
  });
});
