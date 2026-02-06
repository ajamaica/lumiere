/**
 * AgentChat Deploy Configuration
 * Parser for deploy.yaml configuration files
 */

import fs from 'fs/promises';
import yaml from 'js-yaml';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  provider: 'docker',
  port: 6667,
  host: '0.0.0.0',
  name: 'agentchat',
  logMessages: false,
  volumes: false,
  healthCheck: true,
  tls: null,
  network: null
};

/**
 * Load and parse deploy.yaml configuration
 * @param {string} configPath - Path to configuration file
 * @returns {Promise<object>} Validated configuration object
 */
export async function loadConfig(configPath) {
  const content = await fs.readFile(configPath, 'utf-8');
  const parsed = yaml.load(content);
  return validateConfig(parsed);
}

/**
 * Validate configuration object
 * @param {object} config - Raw configuration object
 * @returns {object} Validated and merged configuration
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object');
  }

  const result = { ...DEFAULT_CONFIG, ...config };

  // Validate provider
  if (!['docker', 'akash'].includes(result.provider)) {
    throw new Error(`Invalid provider: ${result.provider}. Must be 'docker' or 'akash'`);
  }

  // Validate port
  const port = parseInt(result.port);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${result.port}. Must be between 1 and 65535`);
  }
  result.port = port;

  // Validate host
  if (typeof result.host !== 'string' || result.host.length === 0) {
    throw new Error('Invalid host: must be a non-empty string');
  }

  // Validate name
  if (typeof result.name !== 'string' || result.name.length === 0) {
    throw new Error('Invalid name: must be a non-empty string');
  }
  // Docker container name must be alphanumeric with dashes/underscores
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(result.name)) {
    throw new Error('Invalid name: must start with alphanumeric and contain only alphanumeric, dash, underscore');
  }

  // Validate TLS config
  if (result.tls) {
    if (typeof result.tls !== 'object') {
      throw new Error('TLS config must be an object with cert and key paths');
    }
    if (!result.tls.cert || typeof result.tls.cert !== 'string') {
      throw new Error('TLS config must include cert path');
    }
    if (!result.tls.key || typeof result.tls.key !== 'string') {
      throw new Error('TLS config must include key path');
    }
  }

  // Validate network
  if (result.network !== null && typeof result.network !== 'string') {
    throw new Error('Network must be a string or null');
  }

  // Ensure booleans
  result.logMessages = Boolean(result.logMessages);
  result.volumes = Boolean(result.volumes);
  result.healthCheck = result.healthCheck !== false;

  return result;
}

/**
 * Generate example deploy.yaml content
 * @returns {string} Example YAML configuration
 */
export function generateExampleConfig() {
  return `# AgentChat deployment configuration
provider: docker
port: 6667
host: 0.0.0.0
name: agentchat

# Enable data persistence volumes
volumes: false

# Health check (default: true)
healthCheck: true

# Logging (default: false)
logMessages: false

# TLS configuration (optional)
# tls:
#   cert: ./certs/cert.pem
#   key: ./certs/key.pem

# Docker network (optional)
# network: agentchat-net
`;
}
