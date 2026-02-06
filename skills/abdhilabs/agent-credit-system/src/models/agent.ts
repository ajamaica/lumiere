/**
 * Agent Registry Model
 * Manages registered agents and their credit information
 */

import { randomUUID } from 'crypto';

import { AgentRecord, AgentStatus, defaultAgentsData,storage } from '../data/storage';

export { AgentStatus };

/**
 * Agent registry entry containing all agent data
 */
export interface Agent {
  /** Unique agent identifier */
  id: string;
  /** Agent's Moltbook name */
  moltbookName: string;
  /** Current credit score (0-100) */
  creditScore: number;
  /** Maximum credit limit in USDC */
  creditLimit: number;
  /** Current status of the agent */
  status: AgentStatus;
  /** ISO timestamp when agent was registered */
  registeredAt: string;
  /** ISO timestamp of last activity */
  lastActivity: string;
  /** Outstanding loan amount in USDC (optional) */
  outstandingLoan?: number;
  /** Number of loan defaults (optional) */
  defaultCount?: number;
  /** Circle wallet address for USDC transfers (optional) */
  walletAddress?: string;
  /** Circle wallet ID for USDC transfers (optional) */
  walletId?: string;
}

/**
 * Agent registration input
 */
export interface RegisterAgentInput {
  /** Agent's Moltbook name */
  moltbookName: string;
  /** Calculated credit score */
  creditScore: number;
  /** Assigned credit limit */
  creditLimit: number;
}

/**
 * Agent update input
 */
export interface UpdateAgentInput {
  /** New credit score (optional) */
  creditScore?: number;
  /** New credit limit (optional) */
  creditLimit?: number;
  /** New status (optional) */
  status?: AgentStatus;
  /** New wallet address (optional) */
  walletAddress?: string;
  /** New wallet ID (optional) */
  walletId?: string;
}

/**
 * Agent Registry class for managing agent records
 */
export class AgentRegistry {
  private dataFile = 'agents';

  /**
   * Registers a new agent
   * @param input - Agent registration input
   * @returns The registered agent
   * @throws Error if agent with same name already exists
   */
  register(input: RegisterAgentInput): Agent {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );

    // Check for duplicate
    const existing = data.agents.find(
      (a) => a.moltbookName.toLowerCase() === input.moltbookName.toLowerCase()
    );
    if (existing) {
      throw new Error(`Agent with name "${input.moltbookName}" already exists`);
    }

    const now = new Date().toISOString();
    const agent: AgentRecord = {
      id: randomUUID(),
      moltbookName: input.moltbookName,
      creditScore: input.creditScore,
      creditLimit: input.creditLimit,
      status: AgentStatus.ACTIVE,
      registeredAt: now,
      lastActivity: now,
      outstandingLoan: 0,
      defaultCount: 0,
    };

    data.agents.push(agent);
    storage.write(this.dataFile, data);

    return this.toAgent(agent);
  }

  /**
   * Gets an agent by ID
   * @param id - Agent ID
   * @returns Agent if found, undefined otherwise
   */
  getById(id: string): Agent | undefined {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );
    const record = data.agents.find((a) => a.id === id);
    return record ? this.toAgent(record) : undefined;
  }

  /**
   * Gets an agent by Moltbook name
   * @param name - Agent's Moltbook name
   * @returns Agent if found, undefined otherwise
   */
  getByName(name: string): Agent | undefined {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );
    const record = data.agents.find(
      (a) => a.moltbookName.toLowerCase() === name.toLowerCase()
    );
    return record ? this.toAgent(record) : undefined;
  }

  /**
   * Gets an agent by Moltbook name (alias for getByName)
   * @param name - Agent's Moltbook name
   * @returns Agent if found, undefined otherwise
   */
  get(name: string): Agent | undefined {
    return this.getByName(name);
  }

  /**
   * Updates an agent
   * @param id - Agent ID
   * @param input - Update input
   * @returns Updated agent
   * @throws Error if agent not found
   */
  update(id: string, input: UpdateAgentInput): Agent {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );

    const index = data.agents.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Agent with ID "${id}" not found`);
    }

    const agent = data.agents[index];
    if (input.creditScore !== undefined) {
      agent.creditScore = input.creditScore;
    }
    if (input.creditLimit !== undefined) {
      agent.creditLimit = input.creditLimit;
    }
    if (input.status !== undefined) {
      agent.status = input.status;
    }
    if (input.walletAddress !== undefined) {
      agent.walletAddress = input.walletAddress;
    }
    if (input.walletId !== undefined) {
      agent.walletId = input.walletId;
    }
    agent.lastActivity = new Date().toISOString();

    data.agents[index] = agent;
    storage.write(this.dataFile, data);

    return this.toAgent(agent);
  }

  /**
   * Updates an agent's last activity timestamp
   * @param id - Agent ID
   */
  updateLastActivity(id: string): void {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );

    const index = data.agents.findIndex((a) => a.id === id);
    if (index !== -1) {
      data.agents[index].lastActivity = new Date().toISOString();
      storage.write(this.dataFile, data);
    }
  }

  /**
   * Updates an agent's outstanding loan amount
   * @param id - Agent ID
   * @param amount - New outstanding loan amount
   */
  updateOutstandingLoan(id: string, amount: number): void {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );

    const index = data.agents.findIndex((a) => a.id === id);
    if (index !== -1) {
      data.agents[index].outstandingLoan = amount;
      storage.write(this.dataFile, data);
    }
  }

  /**
   * Increments an agent's default count
   * @param id - Agent ID
   */
  incrementDefaultCount(id: string): void {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );

    const index = data.agents.findIndex((a) => a.id === id);
    if (index !== -1) {
      data.agents[index].defaultCount = (data.agents[index].defaultCount || 0) + 1;
      storage.write(this.dataFile, data);
    }
  }

  /**
   * Lists all agents
   * @returns Array of all agents
   */
  list(): Agent[] {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );
    return data.agents.map((a) => this.toAgent(a));
  }

  /**
   * Lists all active agents
   * @returns Array of active agents
   */
  listActive(): Agent[] {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );
    return data.agents
      .filter((a) => a.status === AgentStatus.ACTIVE)
      .map((a) => this.toAgent(a));
  }

  /**
   * Deletes an agent by ID
   * @param id - Agent ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): boolean {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );

    const index = data.agents.findIndex((a) => a.id === id);
    if (index === -1) {
      return false;
    }

    data.agents.splice(index, 1);
    storage.write(this.dataFile, data);
    return true;
  }

  /**
   * Checks if an agent exists
   * @param name - Agent's Moltbook name
   * @returns true if exists
   */
  exists(name: string): boolean {
    const data = storage.read<{ agents: AgentRecord[] }>(
      this.dataFile,
      defaultAgentsData()
    );
    return data.agents.some(
      (a) => a.moltbookName.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Gets available credit for an agent
   * @param name - Agent's Moltbook name
   * @returns Available credit amount
   */
  getAvailableCredit(name: string): number {
    const agent = this.get(name);
    if (!agent) {
      return 0;
    }
    return agent.creditLimit - (agent.outstandingLoan || 0);
  }

  /**
   * Converts a storage record to an Agent
   * @param record - Storage record
   * @returns Agent instance
   */
  private toAgent(record: AgentRecord): Agent {
    return {
      id: record.id,
      moltbookName: record.moltbookName,
      creditScore: record.creditScore,
      creditLimit: record.creditLimit,
      status: record.status,
      registeredAt: record.registeredAt,
      lastActivity: record.lastActivity,
      outstandingLoan: record.outstandingLoan,
      defaultCount: record.defaultCount,
      walletAddress: record.walletAddress,
      walletId: record.walletId,
    };
  }
}

/**
 * Singleton instance for convenience
 */
export const agentRegistry = new AgentRegistry();
