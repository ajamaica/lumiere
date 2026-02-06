/**
 * AgentChat Deploy Configuration and Docker Tests
 * Run with: node --test test/deploy.test.js
 */

import assert from 'node:assert';
import { describe,test } from 'node:test';

import { DEFAULT_CONFIG,validateConfig } from '../lib/deploy/config.js';
import { deployToDocker, generateDockerfile } from '../lib/deploy/docker.js';

describe('Deploy Configuration', () => {
  test('validates correct config', () => {
    const config = validateConfig({
      provider: 'docker',
      port: 8080,
      name: 'test-server'
    });

    assert.equal(config.provider, 'docker');
    assert.equal(config.port, 8080);
    assert.equal(config.name, 'test-server');
    assert.equal(config.host, DEFAULT_CONFIG.host);
  });

  test('rejects invalid provider', () => {
    assert.throws(() => {
      validateConfig({ provider: 'invalid' });
    }, /Invalid provider/);
  });

  test('rejects invalid port', () => {
    assert.throws(() => {
      validateConfig({ port: 99999 });
    }, /Invalid port/);
  });

  test('rejects invalid name', () => {
    assert.throws(() => {
      validateConfig({ name: 'invalid name with spaces' });
    }, /Invalid name/);
  });

  test('validates TLS config requires both cert and key', () => {
    assert.throws(() => {
      validateConfig({ tls: { cert: './cert.pem' } });
    }, /TLS config must include key path/);
  });

  test('accepts valid TLS config', () => {
    const config = validateConfig({
      tls: { cert: './cert.pem', key: './key.pem' }
    });

    assert.deepEqual(config.tls, { cert: './cert.pem', key: './key.pem' });
  });
});

describe('Docker Compose Generation', () => {
  test('generates basic docker-compose', async () => {
    const compose = await deployToDocker({
      port: 6667,
      name: 'agentchat'
    });

    assert.ok(compose.includes('version:'));
    assert.ok(compose.includes('agentchat:'));
    assert.ok(compose.includes('6667:6667'));
    assert.ok(compose.includes('restart: unless-stopped'));
  });

  test('generates docker-compose with health check', async () => {
    const compose = await deployToDocker({
      healthCheck: true
    });

    assert.ok(compose.includes('healthcheck:'));
    assert.ok(compose.includes('interval:'));
  });

  test('generates docker-compose without health check', async () => {
    const compose = await deployToDocker({
      healthCheck: false
    });

    assert.ok(!compose.includes('healthcheck:'));
  });

  test('generates docker-compose with volumes', async () => {
    const compose = await deployToDocker({
      volumes: true
    });

    assert.ok(compose.includes('agentchat-data:/app/data'));
    assert.ok(compose.includes('volumes:'));
  });

  test('generates docker-compose with TLS mounts', async () => {
    const compose = await deployToDocker({
      tls: { cert: './cert.pem', key: './key.pem' }
    });

    assert.ok(compose.includes('./cert.pem:/app/certs/cert.pem'));
    assert.ok(compose.includes('./key.pem:/app/certs/key.pem'));
    assert.ok(compose.includes('TLS_CERT=/app/certs/cert.pem'));
  });

  test('generates docker-compose with network', async () => {
    const compose = await deployToDocker({
      network: 'my-network'
    });

    assert.ok(compose.includes('my-network'));
    assert.ok(compose.includes('driver: bridge'));
  });

  test('generates Dockerfile', async () => {
    const dockerfile = await generateDockerfile();

    assert.ok(dockerfile.includes('FROM node:18-alpine'));
    assert.ok(dockerfile.includes('npm ci --production'));
    assert.ok(dockerfile.includes('HEALTHCHECK'));
    assert.ok(dockerfile.includes('ENV PORT=6667'));
  });
});

