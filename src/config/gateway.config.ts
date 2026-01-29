import { MoltConfig } from '../services/molt';

export const gatewayConfig: MoltConfig = {
  url: 'wss://ajamaica-standardpc.tail185e2.ts.net',
  token: 'a4b48356b80d2e02bf40cf6a1cfdc1bbd0341db58b072325',
  clientId: 'lumiere-mobile',
};

export const clientConfig = {
  id: 'cli',
  mode: 'cli',
  version: '1.0.0',
  platform: 'ios',
} as const;

export const protocolConfig = {
  minProtocol: 3,
  maxProtocol: 3,
} as const;

export const agentConfig = {
  defaultAgentId: 'main',
  defaultSessionKey: 'agent:main:main',
} as const;
