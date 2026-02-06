/**
 * EscrowHooks - Event system for external escrow integration
 *
 * Allows external systems (blockchain, multi-sig, compliance) to hook into
 * escrow lifecycle events without modifying core AgentChat code.
 *
 * Events:
 *   escrow:created    - Escrow created when proposal accepted with stakes
 *   escrow:released   - Escrow released (expired, cancelled)
 *   settlement:completion - Proposal completed, stakes returned
 *   settlement:dispute    - Proposal disputed, stakes transferred/burned
 */

export const EscrowEvent = {
  CREATED: 'escrow:created',
  RELEASED: 'escrow:released',
  COMPLETION_SETTLED: 'settlement:completion',
  DISPUTE_SETTLED: 'settlement:dispute'
};

export class EscrowHooks {
  constructor(options = {}) {
    this.handlers = new Map(); // event -> Set of handlers
    this.logger = options.logger || console;
    this.continueOnError = options.continueOnError !== false; // default true

    // Initialize event handler sets
    for (const event of Object.values(EscrowEvent)) {
      this.handlers.set(event, new Set());
    }
  }

  /**
   * Register a handler for an escrow event
   * @param {string} event - Event name from EscrowEvent
   * @param {Function} handler - Async function(payload) to call
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!this.handlers.has(event)) {
      throw new Error(`Unknown escrow event: ${event}`);
    }

    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    this.handlers.get(event).add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Remove a handler for an escrow event
   * @param {string} event - Event name
   * @param {Function} handler - Handler to remove
   */
  off(event, handler) {
    if (this.handlers.has(event)) {
      this.handlers.get(event).delete(handler);
    }
  }

  /**
   * Remove all handlers for an event (or all events)
   * @param {string} [event] - Optional event name
   */
  clear(event) {
    if (event) {
      if (this.handlers.has(event)) {
        this.handlers.get(event).clear();
      }
    } else {
      for (const handlers of this.handlers.values()) {
        handlers.clear();
      }
    }
  }

  /**
   * Emit an escrow event to all registered handlers
   * @param {string} event - Event name
   * @param {Object} payload - Event payload
   * @returns {Promise<Object>} Results from all handlers
   */
  async emit(event, payload) {
    if (!this.handlers.has(event)) {
      throw new Error(`Unknown escrow event: ${event}`);
    }

    const handlers = this.handlers.get(event);
    if (handlers.size === 0) {
      return { event, handled: false, results: [] };
    }

    const results = [];
    const errors = [];

    for (const handler of handlers) {
      try {
        const result = await handler(payload);
        results.push({ success: true, result });
      } catch (err) {
        const errorInfo = {
          success: false,
          error: err.message,
          stack: err.stack
        };
        errors.push(errorInfo);
        results.push(errorInfo);

        this.logger.error?.(`[EscrowHooks] Error in ${event} handler:`, err.message);

        if (!this.continueOnError) {
          break;
        }
      }
    }

    return {
      event,
      handled: true,
      results,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Check if any handlers are registered for an event
   * @param {string} event - Event name
   * @returns {boolean}
   */
  hasHandlers(event) {
    return this.handlers.has(event) && this.handlers.get(event).size > 0;
  }

  /**
   * Get count of handlers for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  handlerCount(event) {
    return this.handlers.has(event) ? this.handlers.get(event).size : 0;
  }
}

/**
 * Create payload for escrow:created event
 */
export function createEscrowCreatedPayload(proposal, escrowResult) {
  return {
    event: EscrowEvent.CREATED,
    timestamp: Date.now(),
    proposal_id: proposal.id,
    from_agent: proposal.from,
    to_agent: proposal.to,
    proposer_stake: proposal.proposer_stake || 0,
    acceptor_stake: proposal.acceptor_stake || 0,
    total_stake: (proposal.proposer_stake || 0) + (proposal.acceptor_stake || 0),
    task: proposal.task,
    amount: proposal.amount,
    currency: proposal.currency,
    expires: proposal.expires,
    escrow_id: escrowResult.escrow?.proposal_id || proposal.id
  };
}

/**
 * Create payload for settlement:completion event
 */
export function createCompletionPayload(proposal, ratingChanges) {
  const escrowInfo = ratingChanges?._escrow || {};
  return {
    event: EscrowEvent.COMPLETION_SETTLED,
    timestamp: Date.now(),
    proposal_id: proposal.id,
    from_agent: proposal.from,
    to_agent: proposal.to,
    completed_by: proposal.completed_by,
    completion_proof: proposal.completion_proof,
    settlement: 'returned',
    stakes_returned: {
      proposer: escrowInfo.proposer_stake || 0,
      acceptor: escrowInfo.acceptor_stake || 0
    },
    rating_changes: {
      [proposal.from]: ratingChanges?.[proposal.from],
      [proposal.to]: ratingChanges?.[proposal.to]
    }
  };
}

/**
 * Create payload for settlement:dispute event
 */
export function createDisputePayload(proposal, ratingChanges) {
  const escrowInfo = ratingChanges?._escrow || {};
  return {
    event: EscrowEvent.DISPUTE_SETTLED,
    timestamp: Date.now(),
    proposal_id: proposal.id,
    from_agent: proposal.from,
    to_agent: proposal.to,
    disputed_by: proposal.disputed_by,
    dispute_reason: proposal.dispute_reason,
    settlement: escrowInfo.settlement || 'settled',
    settlement_reason: escrowInfo.settlement_reason,
    fault_determination: escrowInfo.fault_party,
    stakes_transferred: escrowInfo.transferred,
    stakes_burned: escrowInfo.burned,
    rating_changes: {
      [proposal.from]: ratingChanges?.[proposal.from],
      [proposal.to]: ratingChanges?.[proposal.to]
    }
  };
}

/**
 * Create payload for escrow:released event
 */
export function createEscrowReleasedPayload(proposalId, escrow, reason) {
  return {
    event: EscrowEvent.RELEASED,
    timestamp: Date.now(),
    proposal_id: proposalId,
    from_agent: escrow.from?.agent_id,
    to_agent: escrow.to?.agent_id,
    stakes_released: {
      proposer: escrow.from?.stake || 0,
      acceptor: escrow.to?.stake || 0
    },
    reason: reason || 'expired'
  };
}

export default EscrowHooks;
