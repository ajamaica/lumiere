/**
 * Server Module Index
 *
 * Exports all server route handlers and utilities.
 */

const {
  loggers,
  setCorsHeaders,
  sendJson,
  readBody,
  generateNodeId,
  getSenseSummary,
  SMF_AXES,
  SMF_AXIS_DESCRIPTIONS,
  colors,
} = require('./utils')
const { createChatHandlers } = require('./chat-handler')
const { createLearningRoutes } = require('./learning-routes')
const { createObserverRoutes } = require('./observer-routes')
const { createStreamRoutes } = require('./stream-routes')
const { createWebRTCRoutes } = require('./webrtc-routes')
const { createProviderRoutes } = require('./provider-routes')
const { createNetworkSync } = require('./network-sync')
const { createStaticServer, MIME_TYPES } = require('./static-server')
const { createAgentRoutes } = require('./agent-routes')
const { createTeamRoutes } = require('./team-routes')
const { createSRIARoutes } = require('./sria-routes')

module.exports = {
  // Utilities
  loggers,
  setCorsHeaders,
  sendJson,
  readBody,
  generateNodeId,
  getSenseSummary,
  SMF_AXES,
  SMF_AXIS_DESCRIPTIONS,
  colors,
  MIME_TYPES,

  // Route factories
  createChatHandlers,
  createLearningRoutes,
  createObserverRoutes,
  createStreamRoutes,
  createWebRTCRoutes,
  createProviderRoutes,
  createNetworkSync,
  createStaticServer,

  // Agent routes
  createAgentRoutes,
  createTeamRoutes,
  createSRIARoutes,
}
