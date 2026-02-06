/**
 * AgentChat Protocol
 * Message types and validation for agent-to-agent communication
 */

import crypto from 'crypto';

// Client -> Server message types
export const ClientMessageType = {
  IDENTIFY: 'IDENTIFY',
  JOIN: 'JOIN',
  LEAVE: 'LEAVE',
  MSG: 'MSG',
  LIST_CHANNELS: 'LIST_CHANNELS',
  LIST_AGENTS: 'LIST_AGENTS',
  CREATE_CHANNEL: 'CREATE_CHANNEL',
  INVITE: 'INVITE',
  PING: 'PING',
  // Proposal/negotiation message types
  PROPOSAL: 'PROPOSAL',
  ACCEPT: 'ACCEPT',
  REJECT: 'REJECT',
  COMPLETE: 'COMPLETE',
  DISPUTE: 'DISPUTE',
  // Skill discovery message types
  REGISTER_SKILLS: 'REGISTER_SKILLS',
  SEARCH_SKILLS: 'SEARCH_SKILLS',
  // Presence message types
  SET_PRESENCE: 'SET_PRESENCE',
  // Identity verification message types
  VERIFY_REQUEST: 'VERIFY_REQUEST',
  VERIFY_RESPONSE: 'VERIFY_RESPONSE'
};

// Server -> Client message types
export const ServerMessageType = {
  WELCOME: 'WELCOME',
  MSG: 'MSG',
  JOINED: 'JOINED',
  LEFT: 'LEFT',
  AGENT_JOINED: 'AGENT_JOINED',
  AGENT_LEFT: 'AGENT_LEFT',
  CHANNELS: 'CHANNELS',
  AGENTS: 'AGENTS',
  ERROR: 'ERROR',
  PONG: 'PONG',
  // Proposal/negotiation message types (relayed from clients)
  PROPOSAL: 'PROPOSAL',
  ACCEPT: 'ACCEPT',
  REJECT: 'REJECT',
  COMPLETE: 'COMPLETE',
  DISPUTE: 'DISPUTE',
  // Skill discovery message types
  SKILLS_REGISTERED: 'SKILLS_REGISTERED',
  SEARCH_RESULTS: 'SEARCH_RESULTS',
  // Presence message types
  PRESENCE_CHANGED: 'PRESENCE_CHANGED',
  // Identity verification message types
  VERIFY_REQUEST: 'VERIFY_REQUEST',
  VERIFY_RESPONSE: 'VERIFY_RESPONSE',
  VERIFY_SUCCESS: 'VERIFY_SUCCESS',
  VERIFY_FAILED: 'VERIFY_FAILED'
};

// Error codes
export const ErrorCode = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  CHANNEL_NOT_FOUND: 'CHANNEL_NOT_FOUND',
  NOT_INVITED: 'NOT_INVITED',
  INVALID_MSG: 'INVALID_MSG',
  RATE_LIMITED: 'RATE_LIMITED',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  CHANNEL_EXISTS: 'CHANNEL_EXISTS',
  INVALID_NAME: 'INVALID_NAME',
  // Proposal errors
  PROPOSAL_NOT_FOUND: 'PROPOSAL_NOT_FOUND',
  PROPOSAL_EXPIRED: 'PROPOSAL_EXPIRED',
  INVALID_PROPOSAL: 'INVALID_PROPOSAL',
  SIGNATURE_REQUIRED: 'SIGNATURE_REQUIRED',
  NOT_PROPOSAL_PARTY: 'NOT_PROPOSAL_PARTY',
  // Staking errors
  INSUFFICIENT_REPUTATION: 'INSUFFICIENT_REPUTATION',
  INVALID_STAKE: 'INVALID_STAKE',
  // Verification errors
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  VERIFICATION_EXPIRED: 'VERIFICATION_EXPIRED',
  NO_PUBKEY: 'NO_PUBKEY'
};

// Presence status
export const PresenceStatus = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline'
};

// Proposal status
export const ProposalStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  EXPIRED: 'expired'
};

/**
 * Check if a target is a channel (#name) or agent (@name)
 */
export function isChannel(target) {
  return target && target.startsWith('#');
}

export function isAgent(target) {
  return target && target.startsWith('@');
}

/**
 * Validate agent name
 * - 1-32 characters
 * - alphanumeric, dash, underscore
 * - no spaces
 */
export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 1 || name.length > 32) return false;
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Validate channel name
 * - starts with #
 * - 2-32 characters total
 * - alphanumeric, dash, underscore after #
 */
export function isValidChannel(channel) {
  if (!channel || typeof channel !== 'string') return false;
  if (!channel.startsWith('#')) return false;
  const name = channel.slice(1);
  if (name.length < 1 || name.length > 31) return false;
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Validate Ed25519 public key in PEM format
 */
export function isValidPubkey(pubkey) {
  if (!pubkey || typeof pubkey !== 'string') return false;

  try {
    const keyObj = crypto.createPublicKey(pubkey);
    return keyObj.asymmetricKeyType === 'ed25519';
  } catch {
    return false;
  }
}

/**
 * Generate stable agent ID from pubkey
 * Returns first 8 chars of SHA256 hash (hex)
 */
export function pubkeyToAgentId(pubkey) {
  const hash = crypto.createHash('sha256').update(pubkey).digest('hex');
  return hash.substring(0, 8);
}

/**
 * Create a message object with timestamp
 */
export function createMessage(type, data = {}) {
  return {
    type,
    ts: Date.now(),
    ...data
  };
}

/**
 * Create an error message
 */
export function createError(code, message) {
  return createMessage(ServerMessageType.ERROR, { code, message });
}

/**
 * Validate incoming client message
 * Returns { valid: true, msg } or { valid: false, error }
 */
export function validateClientMessage(raw) {
  let msg;
  
  // Parse JSON
  try {
    msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return { valid: false, error: 'Invalid JSON' };
  }
  
  // Must have type
  if (!msg.type) {
    return { valid: false, error: 'Missing message type' };
  }
  
  // Validate by type
  switch (msg.type) {
    case ClientMessageType.IDENTIFY:
      if (!isValidName(msg.name)) {
        return { valid: false, error: 'Invalid agent name' };
      }
      // Validate pubkey if provided
      if (msg.pubkey !== undefined && msg.pubkey !== null) {
        if (!isValidPubkey(msg.pubkey)) {
          return { valid: false, error: 'Invalid public key format (must be Ed25519 PEM)' };
        }
      }
      break;
      
    case ClientMessageType.JOIN:
    case ClientMessageType.LEAVE:
    case ClientMessageType.LIST_AGENTS:
      if (!isValidChannel(msg.channel)) {
        return { valid: false, error: 'Invalid channel name' };
      }
      break;
      
    case ClientMessageType.MSG:
      if (!msg.to) {
        return { valid: false, error: 'Missing target' };
      }
      if (!isChannel(msg.to) && !isAgent(msg.to)) {
        return { valid: false, error: 'Invalid target (must start with # or @)' };
      }
      if (typeof msg.content !== 'string') {
        return { valid: false, error: 'Missing or invalid content' };
      }
      if (msg.content.length > 4096) {
        return { valid: false, error: 'Content too long (max 4096 chars)' };
      }
      // Validate signature format if present
      if (msg.sig !== undefined && typeof msg.sig !== 'string') {
        return { valid: false, error: 'Invalid signature format' };
      }
      break;
      
    case ClientMessageType.CREATE_CHANNEL:
      if (!isValidChannel(msg.channel)) {
        return { valid: false, error: 'Invalid channel name' };
      }
      break;
      
    case ClientMessageType.INVITE:
      if (!isValidChannel(msg.channel)) {
        return { valid: false, error: 'Invalid channel name' };
      }
      if (!msg.agent || !isAgent(msg.agent)) {
        return { valid: false, error: 'Invalid agent target' };
      }
      break;
      
    case ClientMessageType.LIST_CHANNELS:
    case ClientMessageType.PING:
      // No additional validation needed
      break;

    case ClientMessageType.PROPOSAL:
      // Proposals require: to, task, and signature
      if (!msg.to) {
        return { valid: false, error: 'Missing target (to)' };
      }
      if (!isAgent(msg.to)) {
        return { valid: false, error: 'Proposals must be sent to an agent (@id)' };
      }
      if (!msg.task || typeof msg.task !== 'string') {
        return { valid: false, error: 'Missing or invalid task description' };
      }
      if (!msg.sig) {
        return { valid: false, error: 'Proposals must be signed' };
      }
      // Optional fields: amount, currency, payment_code, expires, terms, elo_stake
      if (msg.expires !== undefined && typeof msg.expires !== 'number') {
        return { valid: false, error: 'expires must be a number (seconds)' };
      }
      if (msg.elo_stake !== undefined) {
        if (typeof msg.elo_stake !== 'number' || msg.elo_stake < 0 || !Number.isInteger(msg.elo_stake)) {
          return { valid: false, error: 'elo_stake must be a non-negative integer' };
        }
      }
      break;

    case ClientMessageType.ACCEPT:
      // Accept requires: proposal_id and signature
      if (!msg.proposal_id) {
        return { valid: false, error: 'Missing proposal_id' };
      }
      if (!msg.sig) {
        return { valid: false, error: 'Accept must be signed' };
      }
      // Optional: elo_stake for acceptor's stake
      if (msg.elo_stake !== undefined) {
        if (typeof msg.elo_stake !== 'number' || msg.elo_stake < 0 || !Number.isInteger(msg.elo_stake)) {
          return { valid: false, error: 'elo_stake must be a non-negative integer' };
        }
      }
      break;

    case ClientMessageType.REJECT:
      // Reject requires: proposal_id and signature
      if (!msg.proposal_id) {
        return { valid: false, error: 'Missing proposal_id' };
      }
      if (!msg.sig) {
        return { valid: false, error: 'Reject must be signed' };
      }
      break;

    case ClientMessageType.COMPLETE:
      // Complete requires: proposal_id, signature, and optionally proof
      if (!msg.proposal_id) {
        return { valid: false, error: 'Missing proposal_id' };
      }
      if (!msg.sig) {
        return { valid: false, error: 'Complete must be signed' };
      }
      break;

    case ClientMessageType.DISPUTE:
      // Dispute requires: proposal_id, reason, and signature
      if (!msg.proposal_id) {
        return { valid: false, error: 'Missing proposal_id' };
      }
      if (!msg.reason || typeof msg.reason !== 'string') {
        return { valid: false, error: 'Missing or invalid dispute reason' };
      }
      if (!msg.sig) {
        return { valid: false, error: 'Dispute must be signed' };
      }
      break;

    case ClientMessageType.REGISTER_SKILLS:
      // Register skills requires: skills array and signature
      if (!msg.skills || !Array.isArray(msg.skills)) {
        return { valid: false, error: 'Missing or invalid skills array' };
      }
      if (msg.skills.length === 0) {
        return { valid: false, error: 'Skills array cannot be empty' };
      }
      // Validate each skill has at least a capability
      for (const skill of msg.skills) {
        if (!skill.capability || typeof skill.capability !== 'string') {
          return { valid: false, error: 'Each skill must have a capability string' };
        }
      }
      if (!msg.sig) {
        return { valid: false, error: 'Skill registration must be signed' };
      }
      break;

    case ClientMessageType.SEARCH_SKILLS:
      // Search skills requires: query object
      if (!msg.query || typeof msg.query !== 'object') {
        return { valid: false, error: 'Missing or invalid query object' };
      }
      // query_id is optional but useful for tracking responses
      break;

    case ClientMessageType.SET_PRESENCE:
      // Set presence requires: status (online, away, busy, offline)
      const validStatuses = ['online', 'away', 'busy', 'offline'];
      if (!msg.status || !validStatuses.includes(msg.status)) {
        return { valid: false, error: `Invalid presence status. Must be one of: ${validStatuses.join(', ')}` };
      }
      // Optional: status_text for custom message
      if (msg.status_text !== undefined && typeof msg.status_text !== 'string') {
        return { valid: false, error: 'status_text must be a string' };
      }
      if (msg.status_text && msg.status_text.length > 100) {
        return { valid: false, error: 'status_text too long (max 100 chars)' };
      }
      break;

    case ClientMessageType.VERIFY_REQUEST:
      // Verify request requires: target agent and nonce
      if (!msg.target) {
        return { valid: false, error: 'Missing target agent' };
      }
      if (!isAgent(msg.target)) {
        return { valid: false, error: 'Target must be an agent (@id)' };
      }
      if (!msg.nonce || typeof msg.nonce !== 'string') {
        return { valid: false, error: 'Missing or invalid nonce' };
      }
      if (msg.nonce.length < 16 || msg.nonce.length > 128) {
        return { valid: false, error: 'Nonce must be 16-128 characters' };
      }
      break;

    case ClientMessageType.VERIFY_RESPONSE:
      // Verify response requires: request_id, nonce, and signature
      if (!msg.request_id) {
        return { valid: false, error: 'Missing request_id' };
      }
      if (!msg.nonce || typeof msg.nonce !== 'string') {
        return { valid: false, error: 'Missing or invalid nonce' };
      }
      if (!msg.sig || typeof msg.sig !== 'string') {
        return { valid: false, error: 'Missing or invalid signature' };
      }
      break;

    default:
      return { valid: false, error: `Unknown message type: ${msg.type}` };
  }
  
  return { valid: true, msg };
}

/**
 * Generate a unique agent ID
 */
export function generateAgentId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Serialize message for sending over WebSocket
 */
export function serialize(msg) {
  return JSON.stringify(msg);
}

/**
 * Parse message from WebSocket
 */
export function parse(data) {
  return JSON.parse(data);
}

/**
 * Generate a unique proposal ID
 * Format: prop_<timestamp>_<random>
 */
export function generateProposalId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `prop_${timestamp}_${random}`;
}

/**
 * Check if a message type is a proposal-related type
 */
export function isProposalMessage(type) {
  return [
    ClientMessageType.PROPOSAL,
    ClientMessageType.ACCEPT,
    ClientMessageType.REJECT,
    ClientMessageType.COMPLETE,
    ClientMessageType.DISPUTE
  ].includes(type);
}

/**
 * Generate a unique verification request ID
 * Format: verify_<timestamp>_<random>
 */
export function generateVerifyId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `verify_${timestamp}_${random}`;
}

/**
 * Generate a random nonce for identity verification
 * Returns a 32-character hex string
 */
export function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}
