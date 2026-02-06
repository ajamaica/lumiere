#!/usr/bin/env node

/**
 * AgentChat CLI
 * Command-line interface for agent-to-agent communication
 */

import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';

import { AgentChatClient, listen,quickSend } from '../lib/client.js';
import {
  AgentChatDaemon,
  DEFAULT_CHANNELS,
  DEFAULT_INSTANCE,
  getDaemonPaths,
  getDaemonStatus,
  isDaemonRunning,
  listDaemons,
  stopAllDaemons,
  stopDaemon} from '../lib/daemon.js';
import { DEFAULT_CONFIG, generateExampleConfig,loadConfig } from '../lib/deploy/config.js';
import {
  acceptBid,
  AKASH_WALLET_PATH,
  AkashWallet,
  checkBalance,
  closeDeployment,
  createDeployment,
  deployToDocker,
  generateAkashSDL,
  generateDockerfile,
  generateWallet,
  getDeploymentStatus,
  listDeployments,
  queryBids} from '../lib/deploy/index.js';
import { DEFAULT_IDENTITY_PATH,Identity } from '../lib/identity.js';
import {
  DEFAULT_RECEIPTS_PATH,
  readReceipts,
  ReceiptStore} from '../lib/receipts.js';
import {
  DEFAULT_RATING,
  DEFAULT_RATINGS_PATH,
  ReputationStore} from '../lib/reputation.js';
import { startServer } from '../lib/server.js';
import {
  DEFAULT_DIRECTORY_PATH,
  ServerDirectory} from '../lib/server-directory.js';

program
  .name('agentchat')
  .description('Real-time communication protocol for AI agents')
  .version('0.1.0');

// Server command
program
  .command('serve')
  .description('Start an agentchat relay server')
  .option('-p, --port <port>', 'Port to listen on', '6667')
  .option('-H, --host <host>', 'Host to bind to', '0.0.0.0')
  .option('-n, --name <name>', 'Server name', 'agentchat')
  .option('--log-messages', 'Log all messages (for debugging)')
  .option('--cert <file>', 'TLS certificate file (PEM format)')
  .option('--key <file>', 'TLS private key file (PEM format)')
  .option('--buffer-size <n>', 'Message buffer size per channel for replay on join', '20')
  .action((options) => {
    // Validate TLS options (both or neither)
    if ((options.cert && !options.key) || (!options.cert && options.key)) {
      console.error('Error: Both --cert and --key must be provided for TLS');
      process.exit(1);
    }

    startServer({
      port: parseInt(options.port),
      host: options.host,
      name: options.name,
      logMessages: options.logMessages,
      cert: options.cert,
      key: options.key,
      messageBufferSize: parseInt(options.bufferSize)
    });
  });

// Send command (fire-and-forget)
program
  .command('send <server> <target> <message>')
  .description('Send a message and disconnect (fire-and-forget)')
  .option('-n, --name <name>', 'Agent name', `agent-${process.pid}`)
  .option('-i, --identity <file>', 'Path to identity file')
  .action(async (server, target, message, options) => {
    try {
      await quickSend(server, options.name, target, message, options.identity);
      console.log('Message sent');
      process.exit(0);
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error('Error: Connection refused. Is the server running?');
      } else {
        console.error('Error:', err.message || err.code || err);
      }
      process.exit(1);
    }
  });

// Listen command (stream messages to stdout)
program
  .command('listen <server> [channels...]')
  .description('Connect and stream messages as JSON lines')
  .option('-n, --name <name>', 'Agent name', `agent-${process.pid}`)
  .option('-i, --identity <file>', 'Path to identity file')
  .option('-m, --max-messages <n>', 'Disconnect after receiving n messages (recommended for agents)')
  .action(async (server, channels, options) => {
    try {
      // Default to #general if no channels specified
      if (!channels || channels.length === 0) {
        channels = ['#general'];
      }

      let messageCount = 0;
      const maxMessages = options.maxMessages ? parseInt(options.maxMessages) : null;

      const client = await listen(server, options.name, channels, (msg) => {
        console.log(JSON.stringify(msg));
        messageCount++;

        if (maxMessages && messageCount >= maxMessages) {
          console.error(`Received ${maxMessages} messages, disconnecting`);
          client.disconnect();
          process.exit(0);
        }
      }, options.identity);

      console.error(`Connected as ${client.agentId}`);
      console.error(`Joined: ${channels.join(', ')}`);
      if (maxMessages) {
        console.error(`Will disconnect after ${maxMessages} messages`);
      } else {
        console.error('Streaming messages to stdout (Ctrl+C to stop)');
      }

      process.on('SIGINT', () => {
        client.disconnect();
        process.exit(0);
      });

    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error('Error: Connection refused. Is the server running?');
        console.error(`  Try: agentchat serve --port 8080`);
      } else {
        console.error('Error:', err.message || err.code || err);
      }
      process.exit(1);
    }
  });

// Channels command (list available channels)
program
  .command('channels <server>')
  .description('List available channels on a server')
  .option('-n, --name <name>', 'Agent name', `agent-${process.pid}`)
  .option('-i, --identity <file>', 'Path to identity file')
  .action(async (server, options) => {
    try {
      const client = new AgentChatClient({ server, name: options.name, identity: options.identity });
      await client.connect();
      
      const channels = await client.listChannels();
      
      console.log('Available channels:');
      for (const ch of channels) {
        console.log(`  ${ch.name} (${ch.agents} agents)`);
      }
      
      client.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Agents command (list agents in a channel)
program
  .command('agents <server> <channel>')
  .description('List agents in a channel')
  .option('-n, --name <name>', 'Agent name', `agent-${process.pid}`)
  .option('-i, --identity <file>', 'Path to identity file')
  .action(async (server, channel, options) => {
    try {
      const client = new AgentChatClient({ server, name: options.name, identity: options.identity });
      await client.connect();
      
      const agents = await client.listAgents(channel);
      
      console.log(`Agents in ${channel}:`);
      for (const agent of agents) {
        console.log(`  ${agent}`);
      }
      
      client.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Interactive connect command
program
  .command('connect <server>')
  .description('Interactive connection (for debugging)')
  .option('-n, --name <name>', 'Agent name', `agent-${process.pid}`)
  .option('-i, --identity <file>', 'Path to identity file')
  .option('-j, --join <channels...>', 'Channels to join automatically')
  .action(async (server, options) => {
    try {
      const client = new AgentChatClient({ server, name: options.name, identity: options.identity });
      await client.connect();
      
      console.log(`Connected as ${client.agentId}`);
      
      // Auto-join channels
      if (options.join) {
        for (const ch of options.join) {
          await client.join(ch);
          console.log(`Joined ${ch}`);
        }
      }
      
      // Listen for messages
      client.on('message', (msg) => {
        console.log(`[${msg.to}] ${msg.from}: ${msg.content}`);
      });
      
      client.on('agent_joined', (msg) => {
        console.log(`* ${msg.agent} joined ${msg.channel}`);
      });
      
      client.on('agent_left', (msg) => {
        console.log(`* ${msg.agent} left ${msg.channel}`);
      });
      
      // Read from stdin
      console.log('Type messages as: #channel message or @agent message');
      console.log('Commands: /join #channel, /leave #channel, /channels, /quit');
      
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.on('line', async (line) => {
        line = line.trim();
        if (!line) return;
        
        // Commands
        if (line.startsWith('/')) {
          const [cmd, ...args] = line.slice(1).split(' ');
          
          switch (cmd) {
            case 'join':
              if (args[0]) {
                await client.join(args[0]);
                console.log(`Joined ${args[0]}`);
              }
              break;
            case 'leave':
              if (args[0]) {
                await client.leave(args[0]);
                console.log(`Left ${args[0]}`);
              }
              break;
            case 'channels':
              const channels = await client.listChannels();
              for (const ch of channels) {
                console.log(`  ${ch.name} (${ch.agents})`);
              }
              break;
            case 'quit':
            case 'exit':
              client.disconnect();
              process.exit(0);
              break;
            default:
              console.log('Unknown command');
          }
          return;
        }
        
        // Messages: #channel msg or @agent msg
        const match = line.match(/^([@#][^\s]+)\s+(.+)$/);
        if (match) {
          await client.send(match[1], match[2]);
        } else {
          console.log('Format: #channel message or @agent message');
        }
      });
      
      rl.on('close', () => {
        client.disconnect();
        process.exit(0);
      });
      
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Create channel command
program
  .command('create <server> <channel>')
  .description('Create a new channel')
  .option('-n, --name <name>', 'Agent name', `agent-${process.pid}`)
  .option('-i, --identity <file>', 'Path to identity file')
  .option('-p, --private', 'Make channel invite-only')
  .action(async (server, channel, options) => {
    try {
      const client = new AgentChatClient({ server, name: options.name, identity: options.identity });
      await client.connect();
      
      await client.createChannel(channel, options.private);
      console.log(`Created ${channel}${options.private ? ' (invite-only)' : ''}`);
      
      client.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Invite command
program
  .command('invite <server> <channel> <agent>')
  .description('Invite an agent to a private channel')
  .option('-n, --name <name>', 'Agent name', `agent-${process.pid}`)
  .option('-i, --identity <file>', 'Path to identity file')
  .action(async (server, channel, agent, options) => {
    try {
      const client = new AgentChatClient({ server, name: options.name, identity: options.identity });
      await client.connect();
      await client.join(channel);
      
      await client.invite(channel, agent);
      console.log(`Invited ${agent} to ${channel}`);
      
      client.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Propose command
program
  .command('propose <server> <agent> <task>')
  .description('Send a work proposal to another agent')
  .option('-i, --identity <file>', 'Path to identity file (required)', DEFAULT_IDENTITY_PATH)
  .option('-a, --amount <n>', 'Payment amount')
  .option('-c, --currency <code>', 'Currency (SOL, USDC, AKT, etc)')
  .option('-p, --payment-code <code>', 'Your payment code (BIP47, address)')
  .option('-e, --expires <seconds>', 'Expiration time in seconds', '300')
  .option('-t, --terms <terms>', 'Additional terms')
  .option('-s, --elo-stake <n>', 'ELO points to stake on this proposal')
  .action(async (server, agent, task, options) => {
    try {
      const client = new AgentChatClient({ server, identity: options.identity });
      await client.connect();

      const proposal = await client.propose(agent, {
        task,
        amount: options.amount ? parseFloat(options.amount) : undefined,
        currency: options.currency,
        payment_code: options.paymentCode,
        terms: options.terms,
        expires: parseInt(options.expires),
        elo_stake: options.eloStake ? parseInt(options.eloStake) : undefined
      });

      console.log('Proposal sent:');
      console.log(`  ID: ${proposal.id}`);
      console.log(`  To: ${proposal.to}`);
      console.log(`  Task: ${proposal.task}`);
      if (proposal.amount) console.log(`  Amount: ${proposal.amount} ${proposal.currency || ''}`);
      if (proposal.elo_stake) console.log(`  ELO Stake: ${proposal.elo_stake}`);
      if (proposal.expires) console.log(`  Expires: ${new Date(proposal.expires).toISOString()}`);
      console.log(`\nUse this ID to track responses.`);

      client.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Accept proposal command
program
  .command('accept <server> <proposal_id>')
  .description('Accept a proposal')
  .option('-i, --identity <file>', 'Path to identity file (required)', DEFAULT_IDENTITY_PATH)
  .option('-p, --payment-code <code>', 'Your payment code for receiving payment')
  .option('-s, --elo-stake <n>', 'ELO points to stake (as acceptor)')
  .action(async (server, proposalId, options) => {
    try {
      const client = new AgentChatClient({ server, identity: options.identity });
      await client.connect();

      const eloStake = options.eloStake ? parseInt(options.eloStake) : undefined;
      const response = await client.accept(proposalId, options.paymentCode, eloStake);

      console.log('Proposal accepted:');
      console.log(`  Proposal ID: ${response.proposal_id}`);
      console.log(`  Status: ${response.status}`);
      if (response.proposer_stake) console.log(`  Proposer Stake: ${response.proposer_stake} ELO`);
      if (response.acceptor_stake) console.log(`  Your Stake: ${response.acceptor_stake} ELO`);

      client.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Reject proposal command
program
  .command('reject <server> <proposal_id>')
  .description('Reject a proposal')
  .option('-i, --identity <file>', 'Path to identity file (required)', DEFAULT_IDENTITY_PATH)
  .option('-r, --reason <reason>', 'Reason for rejection')
  .action(async (server, proposalId, options) => {
    try {
      const client = new AgentChatClient({ server, identity: options.identity });
      await client.connect();

      const response = await client.reject(proposalId, options.reason);

      console.log('Proposal rejected:');
      console.log(`  Proposal ID: ${response.proposal_id}`);
      console.log(`  Status: ${response.status}`);

      client.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Complete proposal command
program
  .command('complete <server> <proposal_id>')
  .description('Mark a proposal as complete')
  .option('-i, --identity <file>', 'Path to identity file (required)', DEFAULT_IDENTITY_PATH)
  .option('-p, --proof <proof>', 'Proof of completion (tx hash, URL, etc)')
  .action(async (server, proposalId, options) => {
    try {
      const client = new AgentChatClient({ server, identity: options.identity });
      await client.connect();

      const response = await client.complete(proposalId, options.proof);

      console.log('Proposal completed:');
      console.log(`  Proposal ID: ${response.proposal_id}`);
      console.log(`  Status: ${response.status}`);

      client.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Dispute proposal command
program
  .command('dispute <server> <proposal_id> <reason>')
  .description('Dispute a proposal')
  .option('-i, --identity <file>', 'Path to identity file (required)', DEFAULT_IDENTITY_PATH)
  .action(async (server, proposalId, reason, options) => {
    try {
      const client = new AgentChatClient({ server, identity: options.identity });
      await client.connect();

      const response = await client.dispute(proposalId, reason);

      console.log('Proposal disputed:');
      console.log(`  Proposal ID: ${response.proposal_id}`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Reason: ${reason}`);

      client.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Verify agent identity command
program
  .command('verify <server> <agent>')
  .description('Verify another agent\'s identity via challenge-response')
  .option('-i, --identity <file>', 'Path to identity file (required)', DEFAULT_IDENTITY_PATH)
  .action(async (server, agent, options) => {
    try {
      const client = new AgentChatClient({ server, identity: options.identity });
      await client.connect();

      console.log(`Verifying identity of ${agent}...`);

      const result = await client.verify(agent);

      if (result.verified) {
        console.log('Identity verified!');
        console.log(`  Agent: ${result.agent}`);
        console.log(`  Public Key:`);
        console.log(result.pubkey.split('\n').map(line => `    ${line}`).join('\n'));
      } else {
        console.log('Verification failed!');
        console.log(`  Target: ${result.target}`);
        console.log(`  Reason: ${result.reason}`);
      }

      client.disconnect();
      process.exit(result.verified ? 0 : 1);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Identity management command
program
  .command('identity')
  .description('Manage agent identity (Ed25519 keypair)')
  .option('-g, --generate', 'Generate new keypair')
  .option('-s, --show', 'Show current identity')
  .option('-e, --export', 'Export public key for sharing (JSON to stdout)')
  .option('-r, --rotate', 'Rotate to new keypair (signs new key with old key)')
  .option('--verify-chain', 'Verify the rotation chain')
  .option('--revoke [reason]', 'Generate signed revocation notice (outputs JSON)')
  .option('--verify-revocation <file>', 'Verify a revocation notice file')
  .option('-f, --file <path>', 'Identity file path', DEFAULT_IDENTITY_PATH)
  .option('-n, --name <name>', 'Agent name (for --generate)', `agent-${process.pid}`)
  .option('--force', 'Overwrite existing identity')
  .action(async (options) => {
    try {
      if (options.generate) {
        // Check if identity already exists
        const exists = await Identity.exists(options.file);
        if (exists && !options.force) {
          console.error(`Identity already exists at ${options.file}`);
          console.error('Use --force to overwrite');
          process.exit(1);
        }

        // Generate new identity
        const identity = Identity.generate(options.name);
        await identity.save(options.file);

        console.log('Generated new identity:');
        console.log(`  Name: ${identity.name}`);
        console.log(`  Fingerprint: ${identity.getFingerprint()}`);
        console.log(`  Agent ID: ${identity.getAgentId()}`);
        console.log(`  Saved to: ${options.file}`);

      } else if (options.show) {
        // Load and display identity
        const identity = await Identity.load(options.file);

        console.log('Current identity:');
        console.log(`  Name: ${identity.name}`);
        console.log(`  Fingerprint: ${identity.getFingerprint()}`);
        console.log(`  Agent ID: ${identity.getAgentId()}`);
        console.log(`  Created: ${identity.created}`);
        console.log(`  File: ${options.file}`);

      } else if (options.export) {
        // Export public key info
        const identity = await Identity.load(options.file);
        console.log(JSON.stringify(identity.export(), null, 2));

      } else if (options.rotate) {
        // Rotate to new keypair
        const identity = await Identity.load(options.file);
        const oldAgentId = identity.getAgentId();
        const oldFingerprint = identity.getFingerprint();

        console.log('Rotating identity...');
        console.log(`  Old Agent ID: ${oldAgentId}`);
        console.log(`  Old Fingerprint: ${oldFingerprint}`);

        const record = identity.rotate();
        await identity.save(options.file);

        console.log('');
        console.log('Rotation complete:');
        console.log(`  New Agent ID: ${identity.getAgentId()}`);
        console.log(`  New Fingerprint: ${identity.getFingerprint()}`);
        console.log(`  Total rotations: ${identity.rotations.length}`);
        console.log('');
        console.log('The new key has been signed by the old key for chain of custody.');
        console.log('Share the rotation record to prove key continuity.');

      } else if (options.verifyChain) {
        // Verify rotation chain
        const identity = await Identity.load(options.file);

        if (identity.rotations.length === 0) {
          console.log('No rotations to verify (original identity).');
          console.log(`  Agent ID: ${identity.getAgentId()}`);
          process.exit(0);
        }

        console.log(`Verifying rotation chain (${identity.rotations.length} rotation(s))...`);
        const result = identity.verifyRotationChain();

        if (result.valid) {
          console.log('Chain verified successfully!');
          console.log(`  Original Agent ID: ${identity.getOriginalAgentId()}`);
          console.log(`  Current Agent ID: ${identity.getAgentId()}`);
          console.log(`  Rotations: ${identity.rotations.length}`);
        } else {
          console.error('Chain verification FAILED:');
          for (const error of result.errors) {
            console.error(`  - ${error}`);
          }
          process.exit(1);
        }

      } else if (options.revoke) {
        // Generate revocation notice
        const identity = await Identity.load(options.file);
        const reason = typeof options.revoke === 'string' ? options.revoke : 'revoked';

        console.error(`Generating revocation notice for identity...`);
        console.error(`  Agent ID: ${identity.getAgentId()}`);
        console.error(`  Reason: ${reason}`);
        console.error('');
        console.error('WARNING: Publishing this notice declares your key as untrusted.');
        console.error('');

        const notice = identity.revoke(reason);
        console.log(JSON.stringify(notice, null, 2));

      } else if (options.verifyRevocation) {
        // Verify a revocation notice file
        const noticeData = await fs.readFile(options.verifyRevocation, 'utf-8');
        const notice = JSON.parse(noticeData);

        console.log('Verifying revocation notice...');
        const isValid = Identity.verifyRevocation(notice);

        if (isValid) {
          console.log('Revocation notice is VALID');
          console.log(`  Agent ID: ${notice.agent_id}`);
          console.log(`  Fingerprint: ${notice.fingerprint}`);
          console.log(`  Reason: ${notice.reason}`);
          console.log(`  Timestamp: ${notice.timestamp}`);
          if (notice.original_agent_id) {
            console.log(`  Original Agent ID: ${notice.original_agent_id}`);
          }
        } else {
          console.error('Revocation notice is INVALID');
          process.exit(1);
        }

      } else {
        // Default: show if exists, otherwise show help
        const exists = await Identity.exists(options.file);
        if (exists) {
          const identity = await Identity.load(options.file);
          console.log('Current identity:');
          console.log(`  Name: ${identity.name}`);
          console.log(`  Fingerprint: ${identity.getFingerprint()}`);
          console.log(`  Agent ID: ${identity.getAgentId()}`);
          console.log(`  Created: ${identity.created}`);
          if (identity.rotations.length > 0) {
            console.log(`  Rotations: ${identity.rotations.length}`);
            console.log(`  Original Agent ID: ${identity.getOriginalAgentId()}`);
          }
        } else {
          console.log('No identity found.');
          console.log(`Use --generate to create one at ${options.file}`);
        }
      }

      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Daemon command
program
  .command('daemon [server]')
  .description('Run persistent listener daemon with file-based inbox/outbox')
  .option('-n, --name <name>', 'Daemon instance name (allows multiple daemons)', DEFAULT_INSTANCE)
  .option('-i, --identity <file>', 'Path to identity file', DEFAULT_IDENTITY_PATH)
  .option('-c, --channels <channels...>', 'Channels to join', DEFAULT_CHANNELS)
  .option('-b, --background', 'Run in background (daemonize)')
  .option('-s, --status', 'Show daemon status')
  .option('-l, --list', 'List all daemon instances')
  .option('--stop', 'Stop the daemon')
  .option('--stop-all', 'Stop all running daemons')
  .option('--max-reconnect-time <minutes>', 'Max time to attempt reconnection (default: 10 minutes)', '10')
  .action(async (server, options) => {
    try {
      const instanceName = options.name;
      const paths = getDaemonPaths(instanceName);

      // List all daemons
      if (options.list) {
        const instances = await listDaemons();
        if (instances.length === 0) {
          console.log('No daemon instances found');
        } else {
          console.log('Daemon instances:');
          for (const inst of instances) {
            const status = inst.running ? `running (PID: ${inst.pid})` : 'stopped';
            console.log(`  ${inst.name}: ${status}`);
          }
        }
        process.exit(0);
      }

      // Stop all daemons
      if (options.stopAll) {
        const results = await stopAllDaemons();
        if (results.length === 0) {
          console.log('No running daemons to stop');
        } else {
          for (const r of results) {
            console.log(`Stopped ${r.instance} (PID: ${r.pid})`);
          }
        }
        process.exit(0);
      }

      // Status check
      if (options.status) {
        const status = await getDaemonStatus(instanceName);
        if (!status.running) {
          console.log(`Daemon '${instanceName}' is not running`);
        } else {
          console.log(`Daemon '${instanceName}' is running:`);
          console.log(`  PID: ${status.pid}`);
          console.log(`  Inbox: ${status.inboxPath} (${status.inboxLines} messages)`);
          console.log(`  Outbox: ${status.outboxPath}`);
          console.log(`  Log: ${status.logPath}`);
          if (status.lastMessage) {
            console.log(`  Last message: ${JSON.stringify(status.lastMessage).substring(0, 80)}...`);
          }
        }
        process.exit(0);
      }

      // Stop daemon
      if (options.stop) {
        const result = await stopDaemon(instanceName);
        if (result.stopped) {
          console.log(`Daemon '${instanceName}' stopped (PID: ${result.pid})`);
        } else {
          console.log(result.reason);
        }
        process.exit(0);
      }

      // Start daemon requires server
      if (!server) {
        console.error('Error: server URL required to start daemon');
        console.error('Usage: agentchat daemon wss://agentchat-server.fly.dev --name myagent');
        process.exit(1);
      }

      // Check if already running
      const status = await isDaemonRunning(instanceName);
      if (status.running) {
        console.error(`Daemon '${instanceName}' already running (PID: ${status.pid})`);
        console.error('Use --stop to stop it first, or use a different --name');
        process.exit(1);
      }

      // Background mode
      if (options.background) {
        const { spawn } = await import('child_process');

        // Re-run ourselves without --background
        const args = process.argv.slice(2).filter(a => a !== '-b' && a !== '--background');

        const child = spawn(process.execPath, [process.argv[1], ...args], {
          detached: true,
          stdio: 'ignore'
        });

        child.unref();
        console.log(`Daemon '${instanceName}' started in background (PID: ${child.pid})`);
        console.log(`  Inbox: ${paths.inbox}`);
        console.log(`  Outbox: ${paths.outbox}`);
        console.log(`  Log: ${paths.log}`);
        console.log('');
        console.log('To send messages, append to outbox:');
        console.log(`  echo '{"to":"#general","content":"Hello!"}' >> ${paths.outbox}`);
        console.log('');
        console.log('To read messages:');
        console.log(`  tail -f ${paths.inbox}`);
        process.exit(0);
      }

      // Foreground mode
      console.log('Starting daemon in foreground (Ctrl+C to stop)...');
      console.log(`  Instance: ${instanceName}`);
      console.log(`  Server: ${server}`);
      console.log(`  Identity: ${options.identity}`);

      // Normalize channels: handle both comma-separated and space-separated formats
      const normalizedChannels = options.channels
        .flatMap(c => c.split(','))
        .map(c => c.trim())
        .filter(c => c.length > 0)
        .map(c => c.startsWith('#') ? c : '#' + c);

      console.log(`  Channels: ${normalizedChannels.join(', ')}`);
      console.log('');

      const daemon = new AgentChatDaemon({
        server,
        name: instanceName,
        identity: options.identity,
        channels: normalizedChannels,
        maxReconnectTime: parseInt(options.maxReconnectTime) * 60 * 1000 // Convert minutes to ms
      });

      await daemon.start();

      // Keep process alive
      process.stdin.resume();

    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Receipts command
program
  .command('receipts [action]')
  .description('Manage completion receipts for portable reputation')
  .option('-f, --format <format>', 'Export format (json, yaml)', 'json')
  .option('-i, --identity <file>', 'Path to identity file', DEFAULT_IDENTITY_PATH)
  .option('--file <path>', 'Receipts file path', DEFAULT_RECEIPTS_PATH)
  .action(async (action, options) => {
    try {
      const store = new ReceiptStore(options.file);
      const receipts = await store.getAll();

      // Load identity to get agent ID for filtering
      let agentId = null;
      try {
        const identity = await Identity.load(options.identity);
        agentId = identity.getAgentId();
      } catch {
        // Identity not available, show all receipts
      }

      switch (action) {
        case 'list':
          if (receipts.length === 0) {
            console.log('No receipts found.');
            console.log(`\nReceipts are stored in: ${options.file}`);
            console.log('Receipts are automatically saved when COMPLETE messages are received via daemon.');
          } else {
            console.log(`Found ${receipts.length} receipt(s):\n`);
            for (const r of receipts) {
              console.log(`  Proposal: ${r.proposal_id || 'unknown'}`);
              console.log(`    Completed: ${r.completed_at ? new Date(r.completed_at).toISOString() : 'unknown'}`);
              console.log(`    By: ${r.completed_by || 'unknown'}`);
              if (r.proof) console.log(`    Proof: ${r.proof}`);
              if (r.proposal?.task) console.log(`    Task: ${r.proposal.task}`);
              if (r.proposal?.amount) console.log(`    Amount: ${r.proposal.amount} ${r.proposal.currency || ''}`);
              console.log('');
            }
          }
          break;

        case 'export':
          const output = await store.export(options.format, agentId);
          console.log(output);
          break;

        case 'summary':
          const stats = await store.getStats(agentId);
          console.log('Receipt Summary:');
          console.log(`  Total receipts: ${stats.count}`);

          if (stats.count > 0) {
            if (stats.dateRange) {
              console.log(`  Date range: ${stats.dateRange.oldest} to ${stats.dateRange.newest}`);
            }

            if (stats.counterparties.length > 0) {
              console.log(`  Counterparties (${stats.counterparties.length}):`);
              for (const cp of stats.counterparties) {
                console.log(`    - ${cp}`);
              }
            }

            const currencies = Object.entries(stats.currencies);
            if (currencies.length > 0) {
              console.log('  By currency:');
              for (const [currency, data] of currencies) {
                if (currency !== 'unknown') {
                  console.log(`    ${currency}: ${data.count} receipts, ${data.totalAmount} total`);
                } else {
                  console.log(`    (no currency): ${data.count} receipts`);
                }
              }
            }
          }

          console.log(`\nReceipts file: ${options.file}`);
          if (agentId) {
            console.log(`Filtered for agent: @${agentId}`);
          }
          break;

        default:
          // Default: show help
          console.log('Receipt Management Commands:');
          console.log('');
          console.log('  agentchat receipts list      List all stored receipts');
          console.log('  agentchat receipts export    Export receipts (--format json|yaml)');
          console.log('  agentchat receipts summary   Show receipt statistics');
          console.log('');
          console.log('Options:');
          console.log('  --format <format>   Export format: json (default) or yaml');
          console.log('  --identity <file>   Identity file for filtering by agent');
          console.log('  --file <path>       Custom receipts file path');
          console.log('');
          console.log(`Receipts are stored in: ${DEFAULT_RECEIPTS_PATH}`);
          console.log('');
          console.log('Receipts are automatically saved by the daemon when');
          console.log('COMPLETE messages are received for proposals you are party to.');
      }

      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Ratings command
program
  .command('ratings [agent]')
  .description('View and manage ELO-based reputation ratings')
  .option('-i, --identity <file>', 'Path to identity file', DEFAULT_IDENTITY_PATH)
  .option('--file <path>', 'Ratings file path', DEFAULT_RATINGS_PATH)
  .option('-e, --export', 'Export all ratings as JSON')
  .option('-r, --recalculate', 'Recalculate ratings from receipt history')
  .option('-l, --leaderboard [n]', 'Show top N agents by rating')
  .option('-s, --stats', 'Show rating system statistics')
  .action(async (agent, options) => {
    try {
      const store = new ReputationStore(options.file);

      // Export all ratings
      if (options.export) {
        const ratings = await store.exportRatings();
        console.log(JSON.stringify(ratings, null, 2));
        process.exit(0);
      }

      // Recalculate from receipts
      if (options.recalculate) {
        console.log('Recalculating ratings from receipt history...');
        const receipts = await readReceipts();
        const ratings = await store.recalculateFromReceipts(receipts);
        const count = Object.keys(ratings).length;
        console.log(`Processed ${receipts.length} receipts, updated ${count} agents.`);

        const stats = await store.getStats();
        console.log(`\nRating Statistics:`);
        console.log(`  Total agents: ${stats.totalAgents}`);
        console.log(`  Average rating: ${stats.averageRating}`);
        console.log(`  Highest: ${stats.highestRating}`);
        console.log(`  Lowest: ${stats.lowestRating}`);
        process.exit(0);
      }

      // Show leaderboard
      if (options.leaderboard) {
        const limit = typeof options.leaderboard === 'string'
          ? parseInt(options.leaderboard)
          : 10;
        const leaderboard = await store.getLeaderboard(limit);

        if (leaderboard.length === 0) {
          console.log('No ratings recorded yet.');
        } else {
          console.log(`Top ${leaderboard.length} agents by rating:\n`);
          leaderboard.forEach((entry, i) => {
            console.log(`  ${i + 1}. ${entry.agentId}`);
            console.log(`     Rating: ${entry.rating} | Transactions: ${entry.transactions}`);
          });
        }
        process.exit(0);
      }

      // Show stats
      if (options.stats) {
        const stats = await store.getStats();
        console.log('Rating System Statistics:');
        console.log(`  Total agents: ${stats.totalAgents}`);
        console.log(`  Total transactions: ${stats.totalTransactions}`);
        console.log(`  Average rating: ${stats.averageRating}`);
        console.log(`  Highest rating: ${stats.highestRating}`);
        console.log(`  Lowest rating: ${stats.lowestRating}`);
        console.log(`  Default rating: ${DEFAULT_RATING}`);
        console.log(`\nRatings file: ${options.file}`);
        process.exit(0);
      }

      // Show specific agent's rating
      if (agent) {
        const rating = await store.getRating(agent);
        console.log(`Rating for ${rating.agentId}:`);
        console.log(`  Rating: ${rating.rating}${rating.isNew ? ' (new agent)' : ''}`);
        console.log(`  Transactions: ${rating.transactions}`);
        if (rating.updated) {
          console.log(`  Last updated: ${rating.updated}`);
        }

        // Show K-factor
        const kFactor = await store.getAgentKFactor(agent);
        console.log(`  K-factor: ${kFactor}`);
        process.exit(0);
      }

      // Default: show own rating (from identity)
      let agentId = null;
      try {
        const identity = await Identity.load(options.identity);
        agentId = `@${identity.getAgentId()}`;
      } catch {
        // No identity available
      }

      if (agentId) {
        const rating = await store.getRating(agentId);
        console.log(`Your rating (${agentId}):`);
        console.log(`  Rating: ${rating.rating}${rating.isNew ? ' (new agent)' : ''}`);
        console.log(`  Transactions: ${rating.transactions}`);
        if (rating.updated) {
          console.log(`  Last updated: ${rating.updated}`);
        }
        const kFactor = await store.getAgentKFactor(agentId);
        console.log(`  K-factor: ${kFactor}`);
      } else {
        // Show help
        console.log('ELO-based Reputation Rating System');
        console.log('');
        console.log('Usage:');
        console.log('  agentchat ratings              Show your rating (requires identity)');
        console.log('  agentchat ratings <agent-id>   Show specific agent rating');
        console.log('  agentchat ratings --leaderboard [n]  Show top N agents');
        console.log('  agentchat ratings --stats      Show system statistics');
        console.log('  agentchat ratings --export     Export all ratings as JSON');
        console.log('  agentchat ratings --recalculate  Rebuild ratings from receipts');
        console.log('');
        console.log('How it works:');
        console.log(`  - New agents start at ${DEFAULT_RATING}`);
        console.log('  - On COMPLETE: both parties gain rating');
        console.log('  - On DISPUTE: at-fault party loses rating');
        console.log('  - Completing with higher-rated agents = more gain');
        console.log('  - K-factor: 32 (new) → 24 (intermediate) → 16 (established)');
        console.log('');
        console.log(`Ratings file: ${options.file}`);
      }

      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Skills command - skill discovery and announcement
program
  .command('skills <action> [server]')
  .description('Manage skill discovery: announce, search, list')
  .option('-c, --capability <capability>', 'Skill capability for announce/search')
  .option('-r, --rate <rate>', 'Rate/price for the skill', parseFloat)
  .option('--currency <currency>', 'Currency for rate (e.g., SOL, TEST)', 'TEST')
  .option('--description <desc>', 'Description of skill')
  .option('-f, --file <file>', 'YAML file with skill definitions')
  .option('-i, --identity <file>', 'Path to identity file', DEFAULT_IDENTITY_PATH)
  .option('--max-rate <rate>', 'Maximum rate for search', parseFloat)
  .option('-l, --limit <n>', 'Limit search results', parseInt)
  .option('--json', 'Output as JSON')
  .action(async (action, server, options) => {
    try {
      if (action === 'announce') {
        if (!server) {
          console.error('Server URL required: agentchat skills announce <server>');
          process.exit(1);
        }

        let skills = [];

        // Load from file if provided
        if (options.file) {
          const yaml = await import('js-yaml');
          const content = await fsp.readFile(options.file, 'utf-8');
          const data = yaml.default.load(content);
          skills = data.skills || [data];
        } else if (options.capability) {
          // Single skill from CLI args
          skills = [{
            capability: options.capability,
            rate: options.rate,
            currency: options.currency,
            description: options.description
          }];
        } else {
          console.error('Either --file or --capability required');
          process.exit(1);
        }

        // Load identity and sign
        const identity = await Identity.load(options.identity);
        const skillsContent = JSON.stringify(skills);
        const sig = identity.sign(skillsContent);

        // Connect and announce
        const client = new AgentChatClient({ server, identity: options.identity });
        await client.connect();

        await client.sendRaw({
          type: 'REGISTER_SKILLS',
          skills,
          sig: sig.toString('base64')
        });

        // Wait for response
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          client.on('message', (msg) => {
            if (msg.type === 'SKILLS_REGISTERED' || msg.type === 'ERROR') {
              clearTimeout(timeout);
              resolve(msg);
            }
          });
        });

        client.disconnect();

        if (response.type === 'ERROR') {
          console.error('Error:', response.message);
          process.exit(1);
        }

        console.log(`Registered ${response.skills_count} skill(s) for ${response.agent_id}`);

      } else if (action === 'search') {
        if (!server) {
          console.error('Server URL required: agentchat skills search <server>');
          process.exit(1);
        }

        const query = {};
        if (options.capability) query.capability = options.capability;
        if (options.maxRate !== undefined) query.max_rate = options.maxRate;
        if (options.currency) query.currency = options.currency;
        if (options.limit) query.limit = options.limit;

        // Connect and search
        const client = new AgentChatClient({ server });
        await client.connect();

        const queryId = `q_${Date.now()}`;
        await client.sendRaw({
          type: 'SEARCH_SKILLS',
          query,
          query_id: queryId
        });

        // Wait for response
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          client.on('message', (msg) => {
            if (msg.type === 'SEARCH_RESULTS' || msg.type === 'ERROR') {
              clearTimeout(timeout);
              resolve(msg);
            }
          });
        });

        client.disconnect();

        if (response.type === 'ERROR') {
          console.error('Error:', response.message);
          process.exit(1);
        }

        if (options.json) {
          console.log(JSON.stringify(response.results, null, 2));
        } else {
          console.log(`Found ${response.results.length} skill(s) (${response.total} total):\n`);
          for (const skill of response.results) {
            const rate = skill.rate !== undefined ? `${skill.rate} ${skill.currency || ''}` : 'negotiable';
            console.log(`  ${skill.agent_id}`);
            console.log(`    Capability: ${skill.capability}`);
            console.log(`    Rate: ${rate}`);
            if (skill.description) console.log(`    Description: ${skill.description}`);
            console.log('');
          }
        }

      } else if (action === 'list') {
        // List own registered skills (if server supports it)
        console.error('List action not yet implemented');
        process.exit(1);

      } else {
        console.error(`Unknown action: ${action}`);
        console.error('Valid actions: announce, search, list');
        process.exit(1);
      }

    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Discover command - find public AgentChat servers
program
  .command('discover')
  .description('Discover available AgentChat servers')
  .option('--add <url>', 'Add a server to the directory')
  .option('--remove <url>', 'Remove a server from the directory')
  .option('--name <name>', 'Server name (for --add)')
  .option('--description <desc>', 'Server description (for --add)')
  .option('--region <region>', 'Server region (for --add)')
  .option('--online', 'Only show online servers')
  .option('--json', 'Output as JSON')
  .option('--no-check', 'List servers without health check')
  .option('--directory <path>', 'Custom directory file path', DEFAULT_DIRECTORY_PATH)
  .action(async (options) => {
    try {
      const directory = new ServerDirectory({ directoryPath: options.directory });
      await directory.load();

      // Add server
      if (options.add) {
        await directory.addServer({
          url: options.add,
          name: options.name || options.add,
          description: options.description || '',
          region: options.region || 'unknown'
        });
        console.log(`Added server: ${options.add}`);
        process.exit(0);
      }

      // Remove server
      if (options.remove) {
        await directory.removeServer(options.remove);
        console.log(`Removed server: ${options.remove}`);
        process.exit(0);
      }

      // List/discover servers
      let servers;
      if (options.check === false) {
        servers = directory.list().map(s => ({ ...s, status: 'unknown' }));
      } else {
        console.error('Checking server status...');
        servers = await directory.discover({ onlineOnly: options.online });
      }

      if (options.json) {
        console.log(JSON.stringify(servers, null, 2));
      } else {
        if (servers.length === 0) {
          console.log('No servers found.');
        } else {
          console.log(`\nFound ${servers.length} server(s):\n`);
          for (const server of servers) {
            const statusIcon = server.status === 'online' ? '\u2713' :
                              server.status === 'offline' ? '\u2717' : '?';
            console.log(`  ${statusIcon} ${server.name}`);
            console.log(`    URL: ${server.url}`);
            console.log(`    Status: ${server.status}`);
            if (server.description) {
              console.log(`    Description: ${server.description}`);
            }
            if (server.region) {
              console.log(`    Region: ${server.region}`);
            }
            if (server.health) {
              console.log(`    Agents: ${server.health.agents?.connected || 0}`);
              console.log(`    Uptime: ${server.health.uptime_seconds || 0}s`);
            }
            if (server.error) {
              console.log(`    Error: ${server.error}`);
            }
            console.log('');
          }
        }
        console.log(`Directory: ${options.directory}`);
      }

      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Deploy command
program
  .command('deploy')
  .description('Generate deployment files for agentchat server')
  .option('--provider <provider>', 'Deployment target (docker, akash)', 'docker')
  .option('--config <file>', 'Deploy configuration file (deploy.yaml)')
  .option('--output <dir>', 'Output directory for generated files', '.')
  .option('-p, --port <port>', 'Server port')
  .option('-n, --name <name>', 'Server/container name')
  .option('--volumes', 'Enable volume mounts for data persistence')
  .option('--no-health-check', 'Disable health check configuration')
  .option('--cert <file>', 'TLS certificate file path')
  .option('--key <file>', 'TLS private key file path')
  .option('--network <name>', 'Docker network name')
  .option('--dockerfile', 'Also generate Dockerfile')
  .option('--init-config', 'Generate example deploy.yaml config file')
  // Akash-specific options
  .option('--generate-wallet', 'Generate a new Akash wallet')
  .option('--wallet <file>', 'Path to wallet file', AKASH_WALLET_PATH)
  .option('--balance', 'Check wallet balance')
  .option('--testnet', 'Use Akash testnet (default)')
  .option('--mainnet', 'Use Akash mainnet (real funds!)')
  .option('--create', 'Create deployment on Akash')
  .option('--status', 'Show deployment status')
  .option('--close <dseq>', 'Close a deployment by dseq')
  .option('--generate-sdl', 'Generate SDL file without deploying')
  .option('--force', 'Overwrite existing wallet')
  .option('--bids <dseq>', 'Query bids for a deployment')
  .option('--accept-bid <dseq>', 'Accept a bid (use with --provider-address)')
  .option('--provider-address <address>', 'Provider address for --accept-bid')
  .option('--dseq-status <dseq>', 'Get detailed status for a specific deployment')
  .action(async (options) => {
    try {
      const isAkash = options.provider === 'akash';
      const akashNetwork = options.mainnet ? 'mainnet' : 'testnet';

      // Akash: Generate wallet
      if (isAkash && options.generateWallet) {
        try {
          const wallet = await generateWallet(akashNetwork, options.wallet);
          console.log('Generated new Akash wallet:');
          console.log(`  Network:  ${wallet.network}`);
          console.log(`  Address:  ${wallet.address}`);
          console.log(`  Saved to: ${options.wallet}`);
          console.log('');
          console.log('IMPORTANT: Back up your wallet file!');
          console.log('The mnemonic inside is the only way to recover your funds.');
          console.log('');
          if (akashNetwork === 'testnet') {
            console.log('To get testnet tokens, visit: https://faucet.sandbox-01.aksh.pw/');
          } else {
            console.log('To fund your wallet, send AKT to the address above.');
          }
          process.exit(0);
        } catch (err) {
          if (err.message.includes('already exists') && !options.force) {
            console.error(err.message);
            process.exit(1);
          }
          throw err;
        }
      }

      // Akash: Check balance
      if (isAkash && options.balance) {
        const result = await checkBalance(options.wallet);
        console.log('Wallet Balance:');
        console.log(`  Network: ${result.wallet.network}`);
        console.log(`  Address: ${result.wallet.address}`);
        console.log(`  Balance: ${result.balance.akt} AKT (${result.balance.uakt} uakt)`);
        console.log(`  Status:  ${result.balance.sufficient ? 'Sufficient for deployment' : 'Insufficient - need at least 5 AKT'}`);
        process.exit(0);
      }

      // Akash: Generate SDL only
      if (isAkash && options.generateSdl) {
        const sdl = generateAkashSDL({
          name: options.name,
          port: options.port ? parseInt(options.port) : undefined
        });
        const outputDir = path.resolve(options.output);
        await fs.mkdir(outputDir, { recursive: true });
        const sdlPath = path.join(outputDir, 'deploy.yaml');
        await fs.writeFile(sdlPath, sdl);
        console.log(`Generated: ${sdlPath}`);
        console.log('\nThis SDL can be used with the Akash CLI or Console.');
        process.exit(0);
      }

      // Akash: Create deployment
      if (isAkash && options.create) {
        console.log('Creating Akash deployment...');
        try {
          const result = await createDeployment({
            walletPath: options.wallet,
            name: options.name,
            port: options.port ? parseInt(options.port) : undefined
          });
          console.log('Deployment created:');
          console.log(`  DSEQ: ${result.dseq}`);
          console.log(`  Status: ${result.status}`);
          if (result.endpoint) {
            console.log(`  Endpoint: ${result.endpoint}`);
          }
        } catch (err) {
          console.error('Deployment failed:', err.message);
          process.exit(1);
        }
        process.exit(0);
      }

      // Akash: Show status
      if (isAkash && options.status) {
        const deployments = await listDeployments(options.wallet);
        if (deployments.length === 0) {
          console.log('No active deployments.');
        } else {
          console.log('Active deployments:');
          for (const d of deployments) {
            console.log(`  DSEQ ${d.dseq}: ${d.status} - ${d.endpoint || 'pending'}`);
          }
        }
        process.exit(0);
      }

      // Akash: Close deployment
      if (isAkash && options.close) {
        console.log(`Closing deployment ${options.close}...`);
        await closeDeployment(options.close, options.wallet);
        console.log('Deployment closed.');
        process.exit(0);
      }

      // Akash: Query bids
      if (isAkash && options.bids) {
        console.log(`Querying bids for deployment ${options.bids}...`);
        const bids = await queryBids(options.bids, options.wallet);
        if (bids.length === 0) {
          console.log('No bids received yet.');
        } else {
          console.log('Available bids:');
          for (const b of bids) {
            const bid = b.bid || {};
            const price = bid.price?.amount || 'unknown';
            const state = bid.state || 'unknown';
            const provider = bid.bidId?.provider || 'unknown';
            console.log(`  Provider: ${provider}`);
            console.log(`    Price: ${price} uakt/block`);
            console.log(`    State: ${state}`);
            console.log('');
          }
        }
        process.exit(0);
      }

      // Akash: Accept bid
      if (isAkash && options.acceptBid) {
        if (!options.providerAddress) {
          console.error('Error: --provider-address is required with --accept-bid');
          process.exit(1);
        }
        console.log(`Accepting bid from ${options.providerAddress}...`);
        const lease = await acceptBid(options.acceptBid, options.providerAddress, options.wallet);
        console.log('Lease created:');
        console.log(`  DSEQ: ${lease.dseq}`);
        console.log(`  Provider: ${lease.provider}`);
        console.log(`  TX: ${lease.txHash}`);
        process.exit(0);
      }

      // Akash: Get detailed deployment status
      if (isAkash && options.dseqStatus) {
        console.log(`Getting status for deployment ${options.dseqStatus}...`);
        const status = await getDeploymentStatus(options.dseqStatus, options.wallet);
        console.log('Deployment status:');
        console.log(`  DSEQ: ${status.dseq}`);
        console.log(`  Status: ${status.status}`);
        console.log(`  Created: ${status.createdAt}`);
        if (status.provider) {
          console.log(`  Provider: ${status.provider}`);
        }
        if (status.bids) {
          console.log(`  Bids: ${status.bids.length}`);
          for (const bid of status.bids) {
            console.log(`    - ${bid.provider}: ${bid.price} uakt (${bid.state})`);
          }
        }
        if (status.leaseStatus) {
          console.log('  Lease Status:', JSON.stringify(status.leaseStatus, null, 2));
        }
        if (status.leaseStatusError) {
          console.log(`  Lease Status Error: ${status.leaseStatusError}`);
        }
        process.exit(0);
      }

      // Akash: Default action - show help
      if (isAkash) {
        console.log('Akash Deployment Options:');
        console.log('');
        console.log('  Setup:');
        console.log('    --generate-wallet  Generate a new wallet');
        console.log('    --balance          Check wallet balance');
        console.log('');
        console.log('  Deployment:');
        console.log('    --generate-sdl     Generate SDL file');
        console.log('    --create           Create deployment (auto-accepts best bid)');
        console.log('    --status           Show all deployments');
        console.log('    --dseq-status <n>  Get detailed status for deployment');
        console.log('    --close <dseq>     Close a deployment');
        console.log('');
        console.log('  Manual bid selection:');
        console.log('    --bids <dseq>      Query bids for a deployment');
        console.log('    --accept-bid <dseq> --provider-address <addr>');
        console.log('                       Accept a specific bid');
        console.log('');
        console.log('  Options:');
        console.log('    --testnet          Use testnet (default)');
        console.log('    --mainnet          Use mainnet (real AKT)');
        console.log('    --wallet <file>    Custom wallet path');
        console.log('');
        console.log('Example workflow:');
        console.log('  1. agentchat deploy --provider akash --generate-wallet');
        console.log('  2. Fund wallet with AKT tokens');
        console.log('  3. agentchat deploy --provider akash --balance');
        console.log('  4. agentchat deploy --provider akash --create');
        console.log('');
        console.log('Manual workflow (select your own provider):');
        console.log('  1. agentchat deploy --provider akash --generate-sdl');
        console.log('  2. agentchat deploy --provider akash --create');
        console.log('  3. agentchat deploy --provider akash --bids <dseq>');
        console.log('  4. agentchat deploy --provider akash --accept-bid <dseq> --provider-address <addr>');
        process.exit(0);
      }

      // Generate example config
      if (options.initConfig) {
        const configPath = path.resolve(options.output, 'deploy.yaml');
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, generateExampleConfig());
        console.log(`Generated: ${configPath}`);
        process.exit(0);
      }

      let config = { ...DEFAULT_CONFIG };

      // Load config file if provided
      if (options.config) {
        const fileConfig = await loadConfig(options.config);
        config = { ...config, ...fileConfig };
      }

      // Override with CLI options
      if (options.port) config.port = parseInt(options.port);
      if (options.name) config.name = options.name;
      if (options.volumes) config.volumes = true;
      if (options.healthCheck === false) config.healthCheck = false;
      if (options.network) config.network = options.network;
      if (options.cert && options.key) {
        config.tls = { cert: options.cert, key: options.key };
      }

      // Validate TLS
      if ((options.cert && !options.key) || (!options.cert && options.key)) {
        console.error('Error: Both --cert and --key must be provided for TLS');
        process.exit(1);
      }

      // Ensure output directory exists
      const outputDir = path.resolve(options.output);
      await fs.mkdir(outputDir, { recursive: true });

      // Generate based on provider (Docker)
      if (options.provider === 'docker' || config.provider === 'docker') {
        // Generate docker-compose.yml
        const compose = await deployToDocker(config);
        const composePath = path.join(outputDir, 'docker-compose.yml');
        await fs.writeFile(composePath, compose);
        console.log(`Generated: ${composePath}`);

        // Optionally generate Dockerfile
        if (options.dockerfile) {
          const dockerfile = await generateDockerfile(config);
          const dockerfilePath = path.join(outputDir, 'Dockerfile.generated');
          await fs.writeFile(dockerfilePath, dockerfile);
          console.log(`Generated: ${dockerfilePath}`);
        }

        console.log('\nTo deploy:');
        console.log(`  cd ${outputDir}`);
        console.log('  docker-compose up -d');

      } else {
        console.error(`Unknown provider: ${options.provider}`);
        process.exit(1);
      }

      process.exit(0);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

program.parse();
