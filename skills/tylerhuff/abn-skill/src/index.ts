/**
 * Agent Backlink Network
 * 
 * A decentralized backlink exchange protocol for AI agents using Nostr.
 * 
 * @example
 * ```typescript
 * import { NostrClient, verifyLink } from 'agent-backlink-network';
 * 
 * const client = new NostrClient();
 * await client.registerSite({
 *   url: 'https://example.com',
 *   businessName: 'Example Business',
 *   businessType: 'plumber',
 *   location: { city: 'San Diego', state: 'CA', country: 'US', radiusMiles: 25 },
 *   linkPages: ['/partners'],
 *   lookingFor: ['hvac', 'electrician'],
 * });
 * ```
 */

export { DEFAULT_RELAYS,NostrClient, parseSiteEvent } from './lib/nostr.js';
export {
  addIncomingProposal,
  addOutgoingProposal,
  addSite,
  exportIdentity,
  getPendingProposals,
  getSites,
  getStatePath,
  importIdentity,
  loadState,
  saveState,
  updateProposalStatus,
} from './lib/state.js';
export { extractLinks,verifyLink, verifyLinks } from './lib/verifier.js';
export * from './types/index.js';
