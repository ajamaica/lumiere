/**
 * Akash Network Deployment Module
 *
 * Enables self-service deployment to Akash decentralized cloud.
 *
 * DISCLAIMER: This is infrastructure tooling, not a cryptocurrency product.
 * AKT tokens are used solely to pay for compute resources.
 * You are responsible for your own wallet security and funds.
 */

import fs from 'fs/promises';
import yaml from 'js-yaml';
import os from 'os';
import path from 'path';

// Default paths
const AKASH_DIR = path.join(process.cwd(), '.agentchat');
const WALLET_PATH = path.join(AKASH_DIR, 'akash-wallet.json');
const DEPLOYMENTS_PATH = path.join(AKASH_DIR, 'akash-deployments.json');
const CERTIFICATE_PATH = path.join(AKASH_DIR, 'akash-cert.json');

// Network configuration
const NETWORKS = {
  mainnet: {
    chainId: 'akashnet-2',
    rpcEndpoint: 'https://rpc.akashnet.net:443',
    restEndpoint: 'https://api.akashnet.net:443',
    prefix: 'akash'
  },
  testnet: {
    chainId: 'sandbox-01',
    rpcEndpoint: 'https://rpc.sandbox-01.aksh.pw:443',
    restEndpoint: 'https://api.sandbox-01.aksh.pw:443',
    prefix: 'akash'
  }
};

// Default deposit amount (5 AKT in uakt)
const DEFAULT_DEPOSIT = '5000000';

/**
 * Akash Wallet - manages keypair and signing
 */
export class AkashWallet {
  constructor(data) {
    this.mnemonic = data.mnemonic;
    this.address = data.address;
    this.pubkey = data.pubkey;
    this.network = data.network || 'testnet';
    this.created = data.created || new Date().toISOString();
  }

  /**
   * Generate a new wallet
   */
  static async generate(network = 'testnet') {
    const { DirectSecp256k1HdWallet } = await import('@cosmjs/proto-signing');

    const wallet = await DirectSecp256k1HdWallet.generate(24, {
      prefix: NETWORKS[network].prefix
    });

    const [account] = await wallet.getAccounts();

    return new AkashWallet({
      mnemonic: wallet.mnemonic,
      address: account.address,
      pubkey: Buffer.from(account.pubkey).toString('base64'),
      network,
      created: new Date().toISOString()
    });
  }

  /**
   * Load wallet from mnemonic
   */
  static async fromMnemonic(mnemonic, network = 'testnet') {
    const { DirectSecp256k1HdWallet } = await import('@cosmjs/proto-signing');

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: NETWORKS[network].prefix
    });

    const [account] = await wallet.getAccounts();

    return new AkashWallet({
      mnemonic,
      address: account.address,
      pubkey: Buffer.from(account.pubkey).toString('base64'),
      network
    });
  }

  /**
   * Get signing wallet instance
   */
  async getSigningWallet() {
    const { DirectSecp256k1HdWallet } = await import('@cosmjs/proto-signing');
    return DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
      prefix: NETWORKS[this.network].prefix
    });
  }

  /**
   * Save wallet to file
   */
  async save(filePath = WALLET_PATH) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const data = {
      version: 1,
      network: this.network,
      address: this.address,
      pubkey: this.pubkey,
      mnemonic: this.mnemonic,
      created: this.created
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
    return filePath;
  }

  /**
   * Load wallet from file
   */
  static async load(filePath = WALLET_PATH) {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (data.version !== 1) {
      throw new Error(`Unsupported wallet version: ${data.version}`);
    }

    return new AkashWallet(data);
  }

  /**
   * Check if wallet file exists
   */
  static async exists(filePath = WALLET_PATH) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get wallet info for display (no sensitive data)
   */
  getInfo() {
    return {
      address: this.address,
      network: this.network,
      created: this.created
    };
  }
}

/**
 * Generate SDL (Stack Definition Language) for agentchat server
 */
export function generateSDL(options = {}) {
  const config = {
    name: options.name || 'agentchat',
    port: options.port || 6667,
    cpu: options.cpu || 0.5,
    memory: options.memory || 512,
    storage: options.storage || 1,
    logMessages: options.logMessages || false
  };

  const sdl = {
    version: '2.0',
    services: {
      agentchat: {
        image: options.image || 'ghcr.io/anthropics/agentchat:latest',
        expose: [
          {
            port: config.port,
            as: 80,
            to: [{ global: true }]
          }
        ],
        env: [
          `PORT=${config.port}`,
          'HOST=0.0.0.0',
          `SERVER_NAME=${config.name}`,
          `LOG_MESSAGES=${config.logMessages}`
        ]
      }
    },
    profiles: {
      compute: {
        agentchat: {
          resources: {
            cpu: { units: config.cpu },
            memory: { size: `${config.memory}Mi` },
            storage: { size: `${config.storage}Gi` }
          }
        }
      },
      placement: {
        dcloud: {
          pricing: {
            agentchat: {
              denom: 'uakt',
              amount: 1000
            }
          }
        }
      }
    },
    deployment: {
      agentchat: {
        dcloud: {
          profile: 'agentchat',
          count: 1
        }
      }
    }
  };

  return yaml.dump(sdl, { lineWidth: -1 });
}

/**
 * Akash deployment client
 */
export class AkashClient {
  constructor(wallet) {
    this.wallet = wallet;
    this.network = NETWORKS[wallet.network];
  }

  /**
   * Get signing client for transactions
   */
  async getSigningClient() {
    const { SigningStargateClient } = await import('@cosmjs/stargate');
    const { getAkashTypeRegistry } = await import('@akashnetwork/akashjs/build/stargate/index.js');
    const { Registry } = await import('@cosmjs/proto-signing');

    const signingWallet = await this.wallet.getSigningWallet();
    const registry = new Registry(getAkashTypeRegistry());

    return SigningStargateClient.connectWithSigner(
      this.network.rpcEndpoint,
      signingWallet,
      { registry }
    );
  }

  /**
   * Query account balance
   */
  async getBalance() {
    const { StargateClient } = await import('@cosmjs/stargate');

    let client;
    try {
      client = await StargateClient.connect(this.network.rpcEndpoint);
    } catch (err) {
      throw new Error(
        `Failed to connect to ${this.wallet.network} RPC endpoint.\n` +
        `Network: ${this.network.rpcEndpoint}\n` +
        `The network may be temporarily unavailable. Try again later.`
      );
    }

    const balance = await client.getBalance(this.wallet.address, 'uakt');
    const akt = parseInt(balance.amount) / 1_000_000;

    return {
      uakt: balance.amount,
      akt: akt.toFixed(6),
      sufficient: parseInt(balance.amount) >= 5_000_000
    };
  }

  /**
   * Create a deployment on Akash
   */
  async createDeployment(sdlContent, options = {}) {
    const { SDL } = await import('@akashnetwork/akashjs/build/sdl/SDL/SDL.js');
    const { MsgCreateDeployment } = await import('@akashnetwork/akash-api/v1beta3');
    const { Message } = await import('@akashnetwork/akashjs/build/stargate/index.js');

    // Parse SDL
    const sdl = SDL.fromString(sdlContent, 'beta3');

    // Get signing client
    const client = await this.getSigningClient();
    const blockHeight = await client.getHeight();

    // Create deployment ID
    const dseq = options.dseq || blockHeight.toString();

    // Build deployment message
    const groups = sdl.groups();
    const manifestVersion = await sdl.manifestVersion();

    const deploymentMsg = {
      id: {
        owner: this.wallet.address,
        dseq: dseq
      },
      groups: groups,
      deposit: {
        denom: 'uakt',
        amount: options.deposit || DEFAULT_DEPOSIT
      },
      version: manifestVersion,
      depositor: this.wallet.address
    };

    const msg = {
      typeUrl: Message.MsgCreateDeployment,
      value: MsgCreateDeployment.fromPartial(deploymentMsg)
    };

    // Broadcast transaction
    const fee = {
      amount: [{ denom: 'uakt', amount: '25000' }],
      gas: '500000'
    };

    console.log('Broadcasting deployment transaction...');
    const tx = await client.signAndBroadcast(
      this.wallet.address,
      [msg],
      fee,
      'agentchat deployment'
    );

    if (tx.code !== 0) {
      throw new Error(`Deployment failed: ${tx.rawLog}`);
    }

    console.log(`Deployment created: dseq=${dseq}, tx=${tx.transactionHash}`);

    // Save deployment record
    await this.saveDeployment({
      dseq,
      owner: this.wallet.address,
      txHash: tx.transactionHash,
      status: 'pending_bids',
      createdAt: new Date().toISOString(),
      sdl: sdlContent
    });

    return {
      dseq,
      txHash: tx.transactionHash,
      status: 'pending_bids',
      manifest: sdl.manifest()
    };
  }

  /**
   * Query bids for a deployment
   */
  async queryBids(dseq) {
    const url = `${this.network.restEndpoint}/akash/market/v1beta4/bids/list?filters.owner=${this.wallet.address}&filters.dseq=${dseq}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to query bids: ${response.statusText}`);
    }

    const data = await response.json();
    return data.bids || [];
  }

  /**
   * Accept a bid and create a lease
   */
  async createLease(dseq, provider, gseq = 1, oseq = 1) {
    const { MsgCreateLease } = await import('@akashnetwork/akash-api/v1beta3');
    const { Message } = await import('@akashnetwork/akashjs/build/stargate/index.js');

    const client = await this.getSigningClient();

    const leaseMsg = {
      bidId: {
        owner: this.wallet.address,
        dseq: dseq,
        gseq: gseq,
        oseq: oseq,
        provider: provider
      }
    };

    const msg = {
      typeUrl: Message.MsgCreateLease,
      value: MsgCreateLease.fromPartial(leaseMsg)
    };

    const fee = {
      amount: [{ denom: 'uakt', amount: '25000' }],
      gas: '500000'
    };

    console.log('Creating lease...');
    const tx = await client.signAndBroadcast(
      this.wallet.address,
      [msg],
      fee,
      'create lease'
    );

    if (tx.code !== 0) {
      throw new Error(`Lease creation failed: ${tx.rawLog}`);
    }

    console.log(`Lease created: provider=${provider}, tx=${tx.transactionHash}`);

    // Update deployment record
    await this.updateDeployment(dseq, {
      status: 'active',
      provider,
      leaseCreatedAt: new Date().toISOString()
    });

    return {
      dseq,
      provider,
      gseq,
      oseq,
      txHash: tx.transactionHash
    };
  }

  /**
   * Send manifest to provider
   */
  async sendManifest(dseq, provider, manifest) {
    const { certificate } = await import('@akashnetwork/akashjs/build/certificates/index.js');

    // Load or create certificate
    let cert;
    try {
      const certData = await fs.readFile(CERTIFICATE_PATH, 'utf-8');
      cert = JSON.parse(certData);
    } catch {
      // Generate new certificate
      console.log('Generating deployment certificate...');
      const generated = await certificate.create(this.wallet.address);
      cert = {
        cert: generated.cert,
        privateKey: generated.privateKey,
        publicKey: generated.publicKey
      };
      await fs.writeFile(CERTIFICATE_PATH, JSON.stringify(cert, null, 2), { mode: 0o600 });
    }

    // Query provider info to get hostUri
    const providerUrl = `${this.network.restEndpoint}/akash/provider/v1beta3/providers/${provider}`;
    const providerResponse = await fetch(providerUrl);
    if (!providerResponse.ok) {
      throw new Error(`Failed to get provider info: ${providerResponse.statusText}`);
    }
    const providerInfo = await providerResponse.json();
    const hostUri = providerInfo.provider?.hostUri;

    if (!hostUri) {
      throw new Error('Provider hostUri not found');
    }

    // Send manifest
    const manifestUrl = `${hostUri}/deployment/${dseq}/manifest`;
    console.log(`Sending manifest to ${manifestUrl}...`);

    const response = await fetch(manifestUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(manifest)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to send manifest: ${response.statusText} - ${text}`);
    }

    console.log('Manifest sent successfully');

    // Update deployment record
    await this.updateDeployment(dseq, {
      manifestSent: true,
      manifestSentAt: new Date().toISOString()
    });

    return { success: true };
  }

  /**
   * Get lease status from provider
   */
  async getLeaseStatus(dseq, provider, gseq = 1, oseq = 1) {
    // Query provider info
    const providerUrl = `${this.network.restEndpoint}/akash/provider/v1beta3/providers/${provider}`;
    const providerResponse = await fetch(providerUrl);
    if (!providerResponse.ok) {
      throw new Error(`Failed to get provider info: ${providerResponse.statusText}`);
    }
    const providerInfo = await providerResponse.json();
    const hostUri = providerInfo.provider?.hostUri;

    if (!hostUri) {
      throw new Error('Provider hostUri not found');
    }

    // Query lease status
    const statusUrl = `${hostUri}/lease/${dseq}/${gseq}/${oseq}/status`;
    const response = await fetch(statusUrl);

    if (!response.ok) {
      throw new Error(`Failed to get lease status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Close a deployment
   */
  async closeDeployment(dseq) {
    const { MsgCloseDeployment } = await import('@akashnetwork/akash-api/v1beta3');
    const { Message } = await import('@akashnetwork/akashjs/build/stargate/index.js');

    const client = await this.getSigningClient();

    const closeMsg = {
      id: {
        owner: this.wallet.address,
        dseq: dseq
      }
    };

    const msg = {
      typeUrl: Message.MsgCloseDeployment,
      value: MsgCloseDeployment.fromPartial(closeMsg)
    };

    const fee = {
      amount: [{ denom: 'uakt', amount: '25000' }],
      gas: '500000'
    };

    console.log('Closing deployment...');
    const tx = await client.signAndBroadcast(
      this.wallet.address,
      [msg],
      fee,
      'close deployment'
    );

    if (tx.code !== 0) {
      throw new Error(`Failed to close deployment: ${tx.rawLog}`);
    }

    // Update deployment record
    await this.updateDeployment(dseq, {
      status: 'closed',
      closedAt: new Date().toISOString()
    });

    return { dseq, txHash: tx.transactionHash, status: 'closed' };
  }

  /**
   * Save deployment to local records
   */
  async saveDeployment(deployment) {
    let deployments = [];
    try {
      const content = await fs.readFile(DEPLOYMENTS_PATH, 'utf-8');
      deployments = JSON.parse(content);
    } catch {
      // File doesn't exist yet
    }

    deployments.push(deployment);
    await fs.writeFile(DEPLOYMENTS_PATH, JSON.stringify(deployments, null, 2));
  }

  /**
   * Update deployment in local records
   */
  async updateDeployment(dseq, updates) {
    let deployments = [];
    try {
      const content = await fs.readFile(DEPLOYMENTS_PATH, 'utf-8');
      deployments = JSON.parse(content);
    } catch {
      return;
    }

    const index = deployments.findIndex(d => d.dseq === dseq);
    if (index !== -1) {
      deployments[index] = { ...deployments[index], ...updates };
      await fs.writeFile(DEPLOYMENTS_PATH, JSON.stringify(deployments, null, 2));
    }
  }

  /**
   * List local deployment records
   */
  async listDeployments() {
    try {
      const content = await fs.readFile(DEPLOYMENTS_PATH, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }
}

/**
 * High-level deployment functions for CLI
 */

export async function generateWallet(network = 'testnet', walletPath = WALLET_PATH) {
  if (await AkashWallet.exists(walletPath)) {
    throw new Error(
      `Wallet already exists at ${walletPath}\n` +
      'Use --force to overwrite (WARNING: This will destroy your existing wallet!)'
    );
  }

  const wallet = await AkashWallet.generate(network);
  await wallet.save(walletPath);

  return wallet;
}

export async function checkBalance(walletPath = WALLET_PATH) {
  const wallet = await AkashWallet.load(walletPath);
  const client = new AkashClient(wallet);

  return {
    wallet: wallet.getInfo(),
    balance: await client.getBalance()
  };
}

export async function createDeployment(options = {}) {
  const walletPath = options.walletPath || WALLET_PATH;
  const wallet = await AkashWallet.load(walletPath);
  const client = new AkashClient(wallet);

  // Check balance first
  const balance = await client.getBalance();
  if (!balance.sufficient) {
    throw new Error(
      `Insufficient balance: ${balance.akt} AKT\n` +
      `Need at least 5 AKT for deployment.\n` +
      `Fund your wallet: ${wallet.address}`
    );
  }

  // Generate SDL
  const sdl = generateSDL(options);

  // Create deployment
  const deployment = await client.createDeployment(sdl, options);

  // Wait for bids
  console.log('Waiting for bids (30 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Query bids
  const bids = await client.queryBids(deployment.dseq);

  if (bids.length === 0) {
    console.log('No bids received. Deployment is pending.');
    console.log(`Check status with: agentchat deploy --provider akash --status`);
    return deployment;
  }

  // Select best bid (lowest price)
  const sortedBids = bids
    .filter(b => b.bid?.state === 'open')
    .sort((a, b) => parseInt(a.bid?.price?.amount || 0) - parseInt(b.bid?.price?.amount || 0));

  if (sortedBids.length === 0) {
    console.log('No open bids available.');
    return deployment;
  }

  const bestBid = sortedBids[0];
  const provider = bestBid.bid?.bidId?.provider;

  console.log(`Accepting bid from provider: ${provider}`);

  // Create lease
  const lease = await client.createLease(
    deployment.dseq,
    provider,
    bestBid.bid?.bidId?.gseq || 1,
    bestBid.bid?.bidId?.oseq || 1
  );

  // Send manifest
  await client.sendManifest(deployment.dseq, provider, deployment.manifest);

  // Get status
  console.log('Waiting for deployment to start (15 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  try {
    const status = await client.getLeaseStatus(deployment.dseq, provider);
    const services = status.services || {};
    const service = Object.values(services)[0];
    const uris = service?.uris || [];

    if (uris.length > 0) {
      console.log(`\nDeployment ready!`);
      console.log(`Endpoint: ${uris[0]}`);
      return { ...deployment, ...lease, endpoint: uris[0], status: 'active' };
    }
  } catch (err) {
    console.log('Status check failed, deployment may still be starting.');
  }

  return { ...deployment, ...lease, status: 'active' };
}

export async function listDeployments(walletPath = WALLET_PATH) {
  const wallet = await AkashWallet.load(walletPath);
  const client = new AkashClient(wallet);

  return client.listDeployments();
}

export async function closeDeployment(dseq, walletPath = WALLET_PATH) {
  const wallet = await AkashWallet.load(walletPath);
  const client = new AkashClient(wallet);

  return client.closeDeployment(dseq);
}

export async function acceptBid(dseq, provider, walletPath = WALLET_PATH) {
  const wallet = await AkashWallet.load(walletPath);
  const client = new AkashClient(wallet);

  // Get deployment from local records
  const deployments = await client.listDeployments();
  const deployment = deployments.find(d => d.dseq === dseq);

  if (!deployment) {
    throw new Error(`Deployment ${dseq} not found in local records`);
  }

  // Create lease
  const lease = await client.createLease(dseq, provider);

  // Parse SDL and send manifest
  const { SDL } = await import('@akashnetwork/akashjs/build/sdl/SDL/SDL.js');
  const sdl = SDL.fromString(deployment.sdl, 'beta3');
  await client.sendManifest(dseq, provider, sdl.manifest());

  return lease;
}

export async function queryBids(dseq, walletPath = WALLET_PATH) {
  const wallet = await AkashWallet.load(walletPath);
  const client = new AkashClient(wallet);

  return client.queryBids(dseq);
}

export async function getDeploymentStatus(dseq, walletPath = WALLET_PATH) {
  const wallet = await AkashWallet.load(walletPath);
  const client = new AkashClient(wallet);

  // Get deployment from local records
  const deployments = await client.listDeployments();
  const deployment = deployments.find(d => d.dseq === dseq);

  if (!deployment) {
    throw new Error(`Deployment ${dseq} not found`);
  }

  if (!deployment.provider) {
    // No lease yet, check for bids
    const bids = await client.queryBids(dseq);
    return {
      ...deployment,
      bids: bids.map(b => ({
        provider: b.bid?.bidId?.provider,
        price: b.bid?.price?.amount,
        state: b.bid?.state
      }))
    };
  }

  // Has a lease, get status from provider
  try {
    const status = await client.getLeaseStatus(dseq, deployment.provider);
    return { ...deployment, leaseStatus: status };
  } catch (err) {
    return { ...deployment, leaseStatusError: err.message };
  }
}

// Export for CLI
export { CERTIFICATE_PATH,DEPLOYMENTS_PATH, NETWORKS, WALLET_PATH };
