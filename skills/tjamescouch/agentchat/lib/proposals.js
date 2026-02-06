/**
 * AgentChat Proposals Module
 * Handles structured negotiation between agents
 *
 * Proposals enable agents to make verifiable, signed commitments
 * for work, services, or payments.
 */

import { generateProposalId, ProposalStatus } from './protocol.js';

/**
 * In-memory proposal store
 * In production, this could be backed by persistence
 */
export class ProposalStore {
  constructor() {
    // Map of proposal_id -> proposal object
    this.proposals = new Map();

    // Index by agent for quick lookups
    this.byAgent = new Map(); // agent_id -> Set of proposal_ids

    // Cleanup expired proposals periodically
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60000);
  }

  /**
   * Create a new proposal
   */
  create(proposal) {
    const id = proposal.id || generateProposalId();
    const now = Date.now();

    const stored = {
      id,
      from: proposal.from,
      to: proposal.to,
      task: proposal.task,
      amount: proposal.amount || null,
      currency: proposal.currency || null,
      payment_code: proposal.payment_code || null,
      terms: proposal.terms || null,
      expires: proposal.expires ? now + (proposal.expires * 1000) : null,
      status: ProposalStatus.PENDING,
      created_at: now,
      updated_at: now,
      sig: proposal.sig,
      // ELO staking
      proposer_stake: proposal.elo_stake || null,
      acceptor_stake: null,
      stakes_escrowed: false,
      // Response tracking
      response_sig: null,
      response_payment_code: null,
      completed_at: null,
      completion_proof: null,
      dispute_reason: null
    };

    this.proposals.set(id, stored);

    // Index by both agents
    this._indexAgent(proposal.from, id);
    this._indexAgent(proposal.to, id);

    return stored;
  }

  /**
   * Get a proposal by ID
   */
  get(id) {
    const proposal = this.proposals.get(id);
    if (!proposal) return null;

    // Check expiration
    if (proposal.expires && Date.now() > proposal.expires) {
      if (proposal.status === ProposalStatus.PENDING) {
        proposal.status = ProposalStatus.EXPIRED;
        proposal.updated_at = Date.now();
      }
    }

    return proposal;
  }

  /**
   * Accept a proposal
   * @param {string} id - Proposal ID
   * @param {string} acceptorId - Agent accepting the proposal
   * @param {string} sig - Signature of acceptance
   * @param {string} payment_code - Optional payment code
   * @param {number} acceptor_stake - Optional ELO stake from acceptor
   */
  accept(id, acceptorId, sig, payment_code = null, acceptor_stake = null) {
    const proposal = this.get(id);
    if (!proposal) {
      return { error: 'PROPOSAL_NOT_FOUND' };
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      return { error: 'PROPOSAL_NOT_PENDING', status: proposal.status };
    }

    if (proposal.to !== acceptorId) {
      return { error: 'NOT_PROPOSAL_RECIPIENT' };
    }

    if (proposal.expires && Date.now() > proposal.expires) {
      proposal.status = ProposalStatus.EXPIRED;
      proposal.updated_at = Date.now();
      return { error: 'PROPOSAL_EXPIRED' };
    }

    proposal.status = ProposalStatus.ACCEPTED;
    proposal.response_sig = sig;
    proposal.response_payment_code = payment_code;
    proposal.acceptor_stake = acceptor_stake;
    proposal.updated_at = Date.now();

    return { proposal };
  }

  /**
   * Reject a proposal
   */
  reject(id, rejectorId, sig, reason = null) {
    const proposal = this.get(id);
    if (!proposal) {
      return { error: 'PROPOSAL_NOT_FOUND' };
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      return { error: 'PROPOSAL_NOT_PENDING', status: proposal.status };
    }

    if (proposal.to !== rejectorId) {
      return { error: 'NOT_PROPOSAL_RECIPIENT' };
    }

    proposal.status = ProposalStatus.REJECTED;
    proposal.response_sig = sig;
    proposal.reject_reason = reason;
    proposal.updated_at = Date.now();

    return { proposal };
  }

  /**
   * Mark a proposal as complete
   */
  complete(id, completerId, sig, proof = null) {
    const proposal = this.get(id);
    if (!proposal) {
      return { error: 'PROPOSAL_NOT_FOUND' };
    }

    if (proposal.status !== ProposalStatus.ACCEPTED) {
      return { error: 'PROPOSAL_NOT_ACCEPTED', status: proposal.status };
    }

    // Either party can mark as complete
    if (proposal.from !== completerId && proposal.to !== completerId) {
      return { error: 'NOT_PROPOSAL_PARTY' };
    }

    proposal.status = ProposalStatus.COMPLETED;
    proposal.completed_at = Date.now();
    proposal.completion_proof = proof;
    proposal.completion_sig = sig;
    proposal.completed_by = completerId;
    proposal.updated_at = Date.now();

    return { proposal };
  }

  /**
   * Dispute a proposal
   */
  dispute(id, disputerId, sig, reason) {
    const proposal = this.get(id);
    if (!proposal) {
      return { error: 'PROPOSAL_NOT_FOUND' };
    }

    // Can only dispute accepted proposals
    if (proposal.status !== ProposalStatus.ACCEPTED) {
      return { error: 'PROPOSAL_NOT_ACCEPTED', status: proposal.status };
    }

    // Either party can dispute
    if (proposal.from !== disputerId && proposal.to !== disputerId) {
      return { error: 'NOT_PROPOSAL_PARTY' };
    }

    proposal.status = ProposalStatus.DISPUTED;
    proposal.dispute_reason = reason;
    proposal.dispute_sig = sig;
    proposal.disputed_by = disputerId;
    proposal.disputed_at = Date.now();
    proposal.updated_at = Date.now();

    return { proposal };
  }

  /**
   * List proposals for an agent
   */
  listByAgent(agentId, options = {}) {
    const ids = this.byAgent.get(agentId) || new Set();
    let proposals = Array.from(ids).map(id => this.get(id)).filter(Boolean);

    // Filter by status
    if (options.status) {
      proposals = proposals.filter(p => p.status === options.status);
    }

    // Filter by role (from/to)
    if (options.role === 'from') {
      proposals = proposals.filter(p => p.from === agentId);
    } else if (options.role === 'to') {
      proposals = proposals.filter(p => p.to === agentId);
    }

    // Sort by created_at descending
    proposals.sort((a, b) => b.created_at - a.created_at);

    // Limit
    if (options.limit) {
      proposals = proposals.slice(0, options.limit);
    }

    return proposals;
  }

  /**
   * Index a proposal by agent
   */
  _indexAgent(agentId, proposalId) {
    if (!this.byAgent.has(agentId)) {
      this.byAgent.set(agentId, new Set());
    }
    this.byAgent.get(agentId).add(proposalId);
  }

  /**
   * Clean up expired proposals (older than 24 hours after expiration)
   */
  cleanupExpired() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);

    for (const [id, proposal] of this.proposals) {
      if (proposal.expires && proposal.expires < cutoff) {
        this.proposals.delete(id);

        // Remove from agent indices
        const fromSet = this.byAgent.get(proposal.from);
        if (fromSet) fromSet.delete(id);

        const toSet = this.byAgent.get(proposal.to);
        if (toSet) toSet.delete(id);
      }
    }
  }

  /**
   * Stop the cleanup interval
   */
  close() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get stats about the proposal store
   */
  stats() {
    const byStatus = {};
    for (const proposal of this.proposals.values()) {
      byStatus[proposal.status] = (byStatus[proposal.status] || 0) + 1;
    }

    return {
      total: this.proposals.size,
      byStatus,
      agents: this.byAgent.size
    };
  }
}

/**
 * Format a proposal for display/transmission
 */
export function formatProposal(proposal) {
  return {
    id: proposal.id,
    from: proposal.from,
    to: proposal.to,
    task: proposal.task,
    amount: proposal.amount,
    currency: proposal.currency,
    payment_code: proposal.payment_code,
    terms: proposal.terms,
    expires: proposal.expires,
    status: proposal.status,
    created_at: proposal.created_at,
    sig: proposal.sig,
    elo_stake: proposal.proposer_stake
  };
}

/**
 * Format a proposal response (accept/reject/complete/dispute)
 */
export function formatProposalResponse(proposal, responseType) {
  const base = {
    proposal_id: proposal.id,
    status: proposal.status,
    updated_at: proposal.updated_at
  };

  switch (responseType) {
    case 'accept':
      return {
        ...base,
        from: proposal.from,
        to: proposal.to,
        payment_code: proposal.response_payment_code,
        sig: proposal.response_sig,
        proposer_stake: proposal.proposer_stake,
        acceptor_stake: proposal.acceptor_stake
      };

    case 'reject':
      return {
        ...base,
        from: proposal.from,
        to: proposal.to,
        reason: proposal.reject_reason,
        sig: proposal.response_sig
      };

    case 'complete':
      return {
        ...base,
        from: proposal.from,
        to: proposal.to,
        completed_by: proposal.completed_by,
        completed_at: proposal.completed_at,
        proof: proposal.completion_proof,
        sig: proposal.completion_sig,
        elo_stakes: {
          proposer: proposal.proposer_stake || 0,
          acceptor: proposal.acceptor_stake || 0
        }
      };

    case 'dispute':
      return {
        ...base,
        from: proposal.from,
        to: proposal.to,
        disputed_by: proposal.disputed_by,
        disputed_at: proposal.disputed_at,
        reason: proposal.dispute_reason,
        sig: proposal.dispute_sig,
        elo_stakes: {
          proposer: proposal.proposer_stake || 0,
          acceptor: proposal.acceptor_stake || 0
        }
      };

    default:
      return base;
  }
}

/**
 * Create proposal content string for signing
 * This ensures both parties sign the same canonical data
 */
export function getProposalSigningContent(proposal) {
  const fields = [
    proposal.to,
    proposal.task,
    proposal.amount || '',
    proposal.currency || '',
    proposal.payment_code || '',
    proposal.expires || '',
    proposal.elo_stake || ''
  ];
  return fields.join('|');
}

/**
 * Create accept content string for signing
 * @param {string} proposalId - The proposal being accepted
 * @param {string} payment_code - Optional payment code
 * @param {number} elo_stake - Optional ELO stake from acceptor
 */
export function getAcceptSigningContent(proposalId, payment_code = '', elo_stake = '') {
  return `ACCEPT|${proposalId}|${payment_code}|${elo_stake}`;
}

/**
 * Create reject content string for signing
 */
export function getRejectSigningContent(proposalId, reason = '') {
  return `REJECT|${proposalId}|${reason}`;
}

/**
 * Create complete content string for signing
 */
export function getCompleteSigningContent(proposalId, proof = '') {
  return `COMPLETE|${proposalId}|${proof}`;
}

/**
 * Create dispute content string for signing
 */
export function getDisputeSigningContent(proposalId, reason) {
  return `DISPUTE|${proposalId}|${reason}`;
}
