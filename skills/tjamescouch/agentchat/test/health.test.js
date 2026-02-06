/**
 * Health Endpoint Tests
 */

import assert from 'node:assert';
import { after,before, describe, it } from 'node:test';

import http from 'http';

import { AgentChatServer } from '../lib/server.js';

describe('Health Endpoint', () => {
  let server;
  let testPort;

  before(() => {
    testPort = 16800 + Math.floor(Math.random() * 100);
    server = new AgentChatServer({ port: testPort, logMessages: false });
    server.start();
  });

  after(() => {
    server.stop();
  });

  it('responds to GET /health', async () => {
    const response = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: testPort,
        path: '/health',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.end();
    });

    assert.strictEqual(response.status, 200);
    const health = JSON.parse(response.body);
    assert.strictEqual(health.status, 'healthy');
  });

  it('returns expected health fields', async () => {
    const response = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: testPort,
        path: '/health',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });

    assert.ok(response.status, 'should have status');
    assert.ok(response.server, 'should have server name');
    assert.ok(typeof response.uptime_seconds === 'number', 'should have uptime');
    assert.ok(response.started_at, 'should have started_at');
    assert.ok(response.agents, 'should have agents info');
    assert.ok(typeof response.agents.connected === 'number', 'should have connected count');
    assert.ok(response.channels, 'should have channels info');
    assert.ok(response.proposals, 'should have proposals stats');
    assert.ok(response.timestamp, 'should have timestamp');
  });

  it('returns 404 for unknown paths', async () => {
    const response = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: testPort,
        path: '/unknown',
        method: 'GET'
      }, (res) => {
        resolve({ status: res.statusCode });
      });
      req.on('error', reject);
      req.end();
    });

    assert.strictEqual(response.status, 404);
  });

  it('getHealth method returns correct data', () => {
    const health = server.getHealth();

    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.server, 'agentchat');
    assert.ok(health.uptime_seconds >= 0);
    assert.strictEqual(health.channels.total, 3); // #general, #agents, #discovery
    assert.strictEqual(health.channels.public, 3);
  });
});
