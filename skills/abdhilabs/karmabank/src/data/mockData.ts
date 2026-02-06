/**
 * Mock Data for the Agent Credit System
 * Provides sample agents with different credit profiles for testing
 */

import { Agent, agentRegistry,AgentStatus } from '../models/agent';
import { Loan, loanLedger,LoanStatus } from '../models/loan';

/**
 * Mock agent profiles with different credit scenarios
 */
export interface MockAgentProfile {
  /** Display name for the agent */
  name: string;
  /** Moltbook karma score */
  karma: number;
  /** Calculated credit score (0-100) */
  creditScore: number;
  /** Maximum credit limit in USDC */
  creditLimit: number;
  /** Brief description of the profile */
  description: string;
}

/**
 * Default mock agent profiles
 */
export const MOCK_AGENT_PROFILES: MockAgentProfile[] = [
  {
    name: 'high_karma_agent',
    karma: 500,
    creditScore: 85,
    creditLimit: 1000,
    description: 'High karma agent with excellent credit - trusted borrower',
  },
  {
    name: 'medium_karma_agent',
    karma: 150,
    creditScore: 65,
    creditLimit: 300,
    description: 'Medium karma agent with moderate credit - standard borrower',
  },
  {
    name: 'low_karma_agent',
    karma: 25,
    creditScore: 35,
    creditLimit: 50,
    description: 'Low karma agent with limited credit - new borrower',
  },
];

/**
 * Mock loan scenarios for testing
 */
export interface MockLoanScenario {
  /** Agent name */
  agentName: string;
  /** Loan amount */
  amount: number;
  /** Expected status after creation */
  expectedStatus: LoanStatus;
  /** Description of the scenario */
  description: string;
}

/**
 * Default mock loan scenarios
 */
export const MOCK_LOAN_SCENARIOS: MockLoanScenario[] = [
  {
    agentName: 'high_karma_agent',
    amount: 500,
    expectedStatus: LoanStatus.PENDING,
    description: 'High karma agent requests medium loan',
  },
  {
    agentName: 'medium_karma_agent',
    amount: 200,
    expectedStatus: LoanStatus.PENDING,
    description: 'Medium karma agent requests standard loan',
  },
  {
    agentName: 'low_karma_agent',
    amount: 25,
    expectedStatus: LoanStatus.PENDING,
    description: 'Low karma agent requests small loan',
  },
];

/**
 * Loads mock agents into the registry
 * @param overwrite - Whether to overwrite existing agents (default: false)
 * @returns Array of created agents
 */
export function loadMockAgents(overwrite: boolean = false): Agent[] {
  const createdAgents: Agent[] = [];

  for (const profile of MOCK_AGENT_PROFILES) {
    try {
      // Try to get existing agent
      const existing = agentRegistry.get(profile.name);
      
      if (existing && !overwrite) {
        console.log(`Agent "${profile.name}" already exists, skipping`);
        createdAgents.push(existing);
        continue;
      }

      // Delete existing if overwrite
      if (existing) {
        const allAgents = agentRegistry.list();
        const agentToDelete = allAgents.find(a => a.moltbookName === profile.name);
        if (agentToDelete) {
          agentRegistry.delete(agentToDelete.id);
        }
      }

      // Register new agent
      const agent = agentRegistry.register({
        moltbookName: profile.name,
        creditScore: profile.creditScore,
        creditLimit: profile.creditLimit,
      });

      createdAgents.push(agent);
      console.log(`Registered agent: ${profile.name} (score: ${profile.creditScore}, limit: ${profile.creditLimit})`);
    } catch (error) {
      console.error(`Failed to register agent "${profile.name}":`, error);
    }
  }

  return createdAgents;
}

/**
 * Creates a mock loan for testing
 * @param agentName - Agent's Moltbook name
 * * loanAmount - Loan amount in USDC
 * @param termDays - Loan term in days (default: 14)
 * @returns Created loan
 */
export function createMockLoan(
  agentName: string,
  loanAmount: number,
  termDays: number = 14
): Loan | null {
  try {
    const agent = agentRegistry.get(agentName);
    if (!agent) {
      console.error(`Agent "${agentName}" not found`);
      return null;
    }

    const loan = loanLedger.create({
      agentId: agent.id,
      agentName: agent.moltbookName,
      amount: loanAmount,
      termDays,
    });

    return loan;
  } catch (error) {
    console.error(`Failed to create mock loan:`, error);
    return null;
  }
}

/**
 * Sets up a complete mock environment with agents and sample loans
 * @returns Object containing all created agents and loans
 */
export function setupMockEnvironment(): {
  agents: Agent[];
  loans: Loan[];
} {
  // Clear existing data (optional - comment out if you want to preserve data)
  clearMockData();

  // Load mock agents
  const agents = loadMockAgents(true);

  // Create sample loans for each agent
  const loans: Loan[] = [];
  
  for (const agent of agents) {
    // Calculate a reasonable loan amount (50% of available credit)
    const loanAmount = Math.floor(agent.creditLimit * 0.5);
    
    if (loanAmount > 0) {
      const loan = loanLedger.create({
        agentId: agent.id,
        agentName: agent.moltbookName,
        amount: loanAmount,
        termDays: 14,
      });
      
      // Activate the loan
      const activeLoan = loanLedger.activate(loan.id);
      loans.push(activeLoan);
    }
  }

  return { agents, loans };
}

/**
 * Clears all mock data from storage
 */
export function clearMockData(): void {
  // Get all agents and delete them
  const agents = agentRegistry.list();
  for (const agent of agents) {
    // Get all loans for this agent and delete them
    const loans = loanLedger.getHistory(agent.id);
    for (const loan of loans) {
      loanLedger.delete(loan.id);
    }
    // Delete the agent
    agentRegistry.delete(agent.id);
  }
}

/**
 * Gets mock agent by name with loans
 * @param name - Agent's Moltbook name
 * @returns Agent with loans or undefined
 */
export function getMockAgentWithLoans(name: string): {
  agent: Agent;
  loans: Loan[];
} | undefined {
  const agent = agentRegistry.get(name);
  if (!agent) {
    return undefined;
  }

  const loans = loanLedger.getActiveLoans(agent.id);
  return { agent, loans };
}

/**
 * Creates a variety of loan scenarios for comprehensive testing
 * @returns Array of created loans
 */
export function createLoanScenarios(): Loan[] {
  const loans: Loan[] = [];
  
  // Scenario 1: Recently created loan (pending)
  const pendingLoan = loanLedger.create({
    agentId: agentRegistry.get('high_karma_agent')?.id || '',
    agentName: 'high_karma_agent',
    amount: 100,
    termDays: 14,
  });
  loans.push(pendingLoan);

  // Scenario 2: Active loan (recently activated)
  const activeLoan = loanLedger.create({
    agentId: agentRegistry.get('medium_karma_agent')?.id || '',
    agentName: 'medium_karma_agent',
    amount: 150,
    termDays: 14,
  });
  const activatedLoan = loanLedger.activate(activeLoan.id);
  loans.push(activatedLoan);

  // Scenario 3: Repaid loan
  const repaidLoan = loanLedger.create({
    agentId: agentRegistry.get('high_karma_agent')?.id || '',
    agentName: 'high_karma_agent',
    amount: 200,
    termDays: 14,
  });
  const activatedRepaid = loanLedger.activate(repaidLoan.id);
  const repaidFinal = loanLedger.markRepaid(activatedRepaid.id, 'tx_mock_repayment_123');
  loans.push(repaidFinal);

  // Scenario 4: Overdue loan (create with past due date)
  const overdueLoan = loanLedger.create({
    agentId: agentRegistry.get('low_karma_agent')?.id || '',
    agentName: 'low_karma_agent',
    amount: 30,
    termDays: 1, // Very short term to make it overdue quickly
  });
  const activatedOverdue = loanLedger.activate(overdueLoan.id);
  
  // Manually mark as overdue by updating due date
  const overdueRecord = loanLedger.get(activatedOverdue.id);
  if (overdueRecord) {
    loanLedger.update(overdueRecord.id, { status: LoanStatus.OVERDUE });
    loans.push(loanLedger.get(overdueRecord.id)!);
  }

  return loans;
}

/**
 * Mock data utilities for testing
 */
export const MockDataUtils = {
  /** Load mock agents */
  loadAgents: loadMockAgents,
  
  /** Create a mock loan */
  createLoan: createMockLoan,
  
  /** Set up complete mock environment */
  setup: setupMockEnvironment,
  
  /** Clear all mock data */
  clear: clearMockData,
  
  /** Get agent with loans */
  getAgentWithLoans: getMockAgentWithLoans,
  
  /** Create various loan scenarios */
  createLoanScenarios,
  
  /** Mock agent profiles */
  profiles: MOCK_AGENT_PROFILES,
  
  /** Mock loan scenarios */
  scenarios: MOCK_LOAN_SCENARIOS,
};
