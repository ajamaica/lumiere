/**
 * Command Line Argument Parsing for Sentient Observer
 *
 * Handles parsing CLI arguments and displaying help.
 */

import { colors as c } from './constants.js'

/**
 * Parse command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    // Common options
    url: 'http://192.168.4.79:1234/v1',
    dataPath: './data',
    tickRate: 30,
    help: false,
    debug: null, // Debug namespaces (controls logging output)

    // LLM Provider options
    provider: 'lmstudio', // 'lmstudio', 'vertex', 'google', 'gemini'
    model: null, // Model name (provider-specific)
    googleCreds: null, // Path to Google service account JSON
    googleProject: null, // Google Cloud project ID
    googleLocation: 'us-central1', // Google Cloud region

    // Network/Seed options
    seeds: [], // Seed node URLs for joining a network (can specify multiple)
    nodeId: null, // Optional node ID (auto-generated if not provided)

    // Mode selection
    server: false,

    // CLI-specific
    noColor: false,
    noClear: false,

    // Server-specific
    port: 3000,
    host: '0.0.0.0',
    staticPath: './public',
    cors: true,

    // WebRTC options (server mode)
    webrtc: true, // Enable WebRTC coordinator
    stunServers: null, // STUN server URLs (uses Google's by default)
    turnServers: null, // TURN servers with credentials
    maxPeersPerRoom: 50,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    // Mode selection
    if (arg === '--server' || arg === '-s') {
      options.server = true
    }
    // Common options
    else if (arg === '--url' || arg === '-u') {
      options.url = args[++i]
    } else if (arg === '--data' || arg === '-d') {
      options.dataPath = args[++i]
    } else if (arg === '--tick-rate') {
      options.tickRate = parseInt(args[++i]) || 30
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--debug') {
      options.debug = args[++i] || '*'
    }
    // LLM Provider options
    else if (arg === '--provider') {
      options.provider = args[++i] || 'lmstudio'
    } else if (arg === '--model' || arg === '-m') {
      options.model = args[++i]
    } else if (arg === '--google-creds') {
      options.googleCreds = args[++i]
      // Auto-set provider to vertex if google creds provided
      if (!args.includes('--provider')) {
        options.provider = 'vertex'
      }
    } else if (arg === '--google-project') {
      options.googleProject = args[++i]
    } else if (arg === '--google-location') {
      options.googleLocation = args[++i]
    }
    // Network/Seed options
    else if (arg === '--seed' || arg === '--seeds') {
      const seedValue = args[++i]
      if (seedValue) {
        // Parse comma-delimited seed URLs
        const seedUrls = seedValue
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s)
        options.seeds.push(...seedUrls)
      }
    } else if (arg === '--node-id') {
      options.nodeId = args[++i]
    }
    // CLI options
    else if (arg === '--no-color') {
      options.noColor = true
    } else if (arg === '--no-clear') {
      options.noClear = true
    }
    // Server options
    else if (arg === '--port' || arg === '-p') {
      options.port = parseInt(args[++i]) || 3000
    } else if (arg === '--host') {
      options.host = args[++i]
    } else if (arg === '--static') {
      options.staticPath = args[++i]
    } else if (arg === '--no-cors') {
      options.cors = false
    }
    // WebRTC options
    else if (arg === '--no-webrtc') {
      options.webrtc = false
    } else if (arg === '--stun') {
      const stunValue = args[++i]
      if (stunValue) {
        options.stunServers = stunValue
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s)
      }
    } else if (arg === '--turn') {
      // Format: urls:username:credential or just urls
      const turnValue = args[++i]
      if (turnValue) {
        options.turnServers = options.turnServers || []
        const parts = turnValue.split(':')
        if (parts.length >= 3) {
          // Has credentials: stun:host:port:username:credential
          const urls = parts.slice(0, -2).join(':')
          const username = parts[parts.length - 2]
          const credential = parts[parts.length - 1]
          options.turnServers.push({ urls, username, credential })
        } else {
          options.turnServers.push(turnValue)
        }
      }
    } else if (arg === '--max-peers') {
      options.maxPeersPerRoom = parseInt(args[++i]) || 50
    }
  }

  // Set DEBUG environment variable if --debug provided
  if (options.debug) {
    process.env.DEBUG = options.debug
    console.log(`${c.cyan}🐛 Debug enabled: ${options.debug}${c.reset}`)
  }

  // Warn if no seed nodes specified
  if (options.seeds.length === 0) {
    console.warn(`\n${c.yellow}⚠ WARNING: No seed nodes specified${c.reset}`)
    console.warn(`${c.dim}  This node will act as a root node.${c.reset}`)
    console.warn(`${c.dim}  To join an existing network, use: --seed <node-url>${c.reset}`)
    console.warn(`${c.dim}  Multiple seeds: --seed http://node1:8888,http://node2:8888${c.reset}\n`)
  } else {
    console.log(`${c.cyan}🌐 Seed nodes: ${options.seeds.join(', ')}${c.reset}`)
  }

  return options
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
${c.bold}Sentient Observer${c.reset}
Emergent Time • Holographic Memory • Prime Resonance

${c.bold}Usage:${c.reset}
  node index.js [options]              # Run in CLI mode (default)
  node index.js --server [options]     # Run as HTTP server

${c.bold}Common Options:${c.reset}
  -u, --url <url>       LMStudio API URL (default: http://192.168.4.79:1234/v1)
  -d, --data <path>     Data directory (default: ./data)
  --tick-rate <hz>      Observer tick rate (default: 30)
  --debug <namespaces>  Enable debug logging (see below)
  -h, --help            Show this help

${c.bold}LLM Provider Options:${c.reset}
  --provider <name>     LLM provider: lmstudio, vertex, google, gemini (default: lmstudio)
  -m, --model <name>    Model name (provider-specific)
  --google-creds <path> Path to Google service account JSON (enables Vertex AI)
  --google-project <id> Google Cloud project ID (auto-detected from creds)
  --google-location <r> Google Cloud region (default: us-central1)

${c.bold}Network Options:${c.reset}
  --seed <urls>         Seed node URL(s) to join existing network
                        Multiple seeds: --seed http://n1:8888,http://n2:8888
                        Without this, node creates its own network of one
  --node-id <id>        Optional node identifier (auto-generated if not set)

${c.bold}CLI Options:${c.reset}
  --no-color            Disable colored output
  --no-clear            Don't clear screen on startup

${c.bold}Server Options:${c.reset}
  -s, --server          Run as HTTP server instead of CLI
  -p, --port <port>     Server port (default: 3000)
  --host <host>         Server host (default: 0.0.0.0)
  --static <path>       Static files directory (default: ./public)
  --no-cors             Disable CORS headers

${c.bold}WebRTC Options (Server Mode):${c.reset}
  --no-webrtc           Disable WebRTC coordinator
  --stun <urls>         STUN server URLs (comma-separated)
                        Default: stun:stun.l.google.com:19302
  --turn <url:user:cred>  TURN server with credentials
                        Example: turn:turn.example.com:3478:user:pass
  --max-peers <n>       Max peers per room (default: 50)

${c.bold}CLI Commands:${c.reset}
  /status               Show observer status
  /senses               Show current sense readings
  /focus <sense> <path> Direct sense attention (filesystem, git)
  /aperture <sense> <level>  Set aperture (narrow/medium/wide)
  /introspect           Deep introspection report
  /moments              Recent experiential moments
  /goals                Current goals and attention
  /memory               Memory statistics
  /safety               Safety report
  /smf                  SMF orientation display
  /oscillators          PRSC oscillator status
  /assay [A|B|C|D|all]  Run evaluation assays (Section 15)
  /run [id|all]         Run JavaScript code block from last response
  /blocks               Show available code blocks
  /history              Show conversation history
  /clear                Clear conversation history
  /pause                Pause observer processing
  /resume               Resume observer processing
  /save                 Save observer state
  /reset                Reset observer
  /nodes                Show connected nodes (inbound & outbound)
  /peers                Alias for /nodes
  /help                 Show this help
  /quit                 Exit

${c.bold}Server API Endpoints:${c.reset}
  GET  /                Web UI (static files)
  POST /chat            Send message, get response
  GET  /status          Observer status
  GET  /introspect      Full introspection
  GET  /stream/moments  SSE for real-time moments

${c.bold}Examples:${c.reset}
  node index.js                        # Start CLI (standalone network)
  node index.js --url http://localhost:1234/v1
  node index.js --server               # Start server on port 3000
  node index.js --server -p 8080       # Start server on port 8080
  
  ${c.dim}# Use Google Vertex AI with Gemini:${c.reset}
  node index.js --google-creds ./google.json
  node index.js --provider vertex --google-creds ./google.json --model gemini-2.0-flash-001
  node index.js --server -p 8888 --google-creds ./google.json
  
  ${c.dim}# Join an existing network:${c.reset}
  node index.js --seed http://192.168.1.100:8888
  node index.js --server -p 8889 --seed http://192.168.1.100:8888

  ${c.dim}# WebRTC coordination:${c.reset}
  node index.js --server -p 8888                      # WebRTC enabled by default
  node index.js --server -p 8888 --no-webrtc          # Disable WebRTC
  node index.js --server --stun stun:stun.example.com:19302
  node index.js --server --turn turn:turn.example.com:3478:user:pass

  ${c.dim}# Enable debug logging:${c.reset}
  node index.js --debug '*'            # All logs
  node index.js --debug 'server:*'     # All server logs
  node index.js --debug 'server:http,server:tool'  # Specific namespaces
  DEBUG=server:node node index.js      # Via environment variable

${c.bold}Debug Namespaces:${c.reset}
  server:http    HTTP requests/responses
  server:node    Node connections (inbound/outbound)
  server:stream  Streaming chat operations
  server:tool    Tool executions
  server:sse     Server-sent events
  webrtc:server  WebRTC coordinator operations
  webrtc:peer    WebRTC peer connections
`)
}

export { parseArgs, printHelp }
