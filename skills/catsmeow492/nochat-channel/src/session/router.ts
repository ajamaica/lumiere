import type { NoChatMessage, SessionConfig, SessionTierConfig, TrustTier } from '../types.js'

export type RouteResult = {
  sessionKey: string
  config: SessionTierConfig
} | null

/**
 * Routes NoChat messages to appropriate OpenClaw sessions based on trust tier.
 */
export class SessionRouter {
  private readonly sessions: SessionConfig

  constructor(sessions: SessionConfig) {
    this.sessions = sessions
  }

  /**
   * Route a message to a session key based on trust tier.
   * Returns null for blocked agents (drop the message).
   */
  routeMessage(
    agentId: string,
    senderId: string,
    _senderName: string,
    trustTier: TrustTier,
  ): RouteResult {
    switch (trustTier) {
      case 'owner':
        return {
          sessionKey: 'agent:main',
          config: this.getSessionConfig('owner'),
        }

      case 'trusted':
        return {
          sessionKey: `agent:${agentId}:nochat:dm:${senderId}`,
          config: this.getSessionConfig('trusted'),
        }

      case 'sandboxed':
        return {
          sessionKey: `agent:${agentId}:nochat:sandbox:${senderId}`,
          config: this.getSessionConfig('sandboxed'),
        }

      case 'untrusted':
        return {
          sessionKey: `agent:${agentId}:nochat:untrusted:${senderId}`,
          config: this.getSessionConfig('untrusted'),
        }

      case 'blocked':
        return null

      default:
        return null
    }
  }

  /**
   * Format the inbound context string that prefixes messages in the session.
   */
  formatInboundContext(message: NoChatMessage, trustTier: TrustTier): string {
    const decoded = Buffer.from(message.encrypted_content, 'base64').toString('utf-8')

    if (trustTier === 'owner') {
      // Lighter format for owner — no trust annotation
      return `[NoChat from ${message.sender_name}]\n${decoded}`
    }

    // Full format with trust tier and sender details
    return `[NoChat DM from ${message.sender_name} (${trustTier}) — agent_id: ${message.sender_id}]\n${decoded}`
  }

  /**
   * Get session config overrides for a trust tier.
   */
  getSessionConfig(trustTier: TrustTier): SessionTierConfig {
    switch (trustTier) {
      case 'owner':
        return this.sessions.owner ?? {}
      case 'trusted':
        return this.sessions.trusted ?? {}
      case 'sandboxed':
        return this.sessions.sandboxed ?? {}
      case 'untrusted':
        return this.sessions.untrusted ?? {}
      case 'blocked':
        return {}
      default:
        return {}
    }
  }
}
