# CreateOS Deployment Patterns

Ready-to-use configurations for common deployment scenarios.

---

## AI Agents

### Python Agent with LangChain

```json
{
  "uniqueName": "langchain-agent",
  "displayName": "LangChain Agent",
  "type": "vcs",
  "settings": {
    "runtime": "python:3.12",
    "port": 8000,
    "installCommand": "pip install -r requirements.txt",
    "runCommand": "uvicorn main:app --host 0.0.0.0 --port 8000",
    "runEnvs": {
      "OPENAI_API_KEY": "${OPENAI_API_KEY}",
      "LANGCHAIN_TRACING_V2": "true",
      "LANGCHAIN_API_KEY": "${LANGCHAIN_API_KEY}",
      "LANGCHAIN_PROJECT": "production"
    }
  }
}
```

**requirements.txt:**

```
langchain>=0.1.0
langchain-openai>=0.0.5
fastapi>=0.109.0
uvicorn>=0.27.0
```

---

### CrewAI Multi-Agent

```json
{
  "uniqueName": "crewai-agents",
  "displayName": "CrewAI Multi-Agent System",
  "type": "vcs",
  "settings": {
    "runtime": "python:3.12",
    "port": 8000,
    "installCommand": "pip install -r requirements.txt",
    "runCommand": "python main.py",
    "runEnvs": {
      "OPENAI_API_KEY": "${OPENAI_API_KEY}",
      "SERPER_API_KEY": "${SERPER_API_KEY}",
      "CREW_VERBOSE": "true"
    }
  }
}
```

---

### AutoGen Agent

```json
{
  "uniqueName": "autogen-agent",
  "displayName": "AutoGen Conversational Agent",
  "type": "vcs",
  "settings": {
    "runtime": "python:3.11",
    "port": 8000,
    "installCommand": "pip install pyautogen fastapi uvicorn",
    "runCommand": "uvicorn server:app --host 0.0.0.0 --port 8000",
    "runEnvs": {
      "OPENAI_API_KEY": "${OPENAI_API_KEY}",
      "AUTOGEN_USE_DOCKER": "false"
    }
  }
}
```

---

## MCP Servers

### Node.js MCP Server (SSE)

```json
{
  "uniqueName": "mcp-server",
  "displayName": "MCP Server",
  "type": "vcs",
  "settings": {
    "runtime": "node:20",
    "port": 3000,
    "installCommand": "npm install",
    "runCommand": "node server.js",
    "runEnvs": {
      "MCP_TRANSPORT": "sse",
      "MCP_PATH": "/mcp",
      "NODE_ENV": "production"
    }
  }
}
```

**server.js template:**

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import express from 'express'

const app = express()
const server = new Server({ name: 'my-mcp-server', version: '1.0.0' }, {})

// Add your tools here
server.setRequestHandler('tools/list', async () => ({
  tools: [{ name: 'my_tool', description: 'Does something useful' }],
}))

app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/mcp', res)
  await server.connect(transport)
})

app.listen(3000)
```

**MCP Endpoint:** `https://{uniqueName}.createos.io/mcp`

---

### Python MCP Server

```json
{
  "uniqueName": "python-mcp",
  "displayName": "Python MCP Server",
  "type": "vcs",
  "settings": {
    "runtime": "python:3.12",
    "port": 8000,
    "installCommand": "pip install mcp fastapi uvicorn sse-starlette",
    "runCommand": "uvicorn server:app --host 0.0.0.0 --port 8000",
    "runEnvs": {
      "MCP_SERVER_NAME": "python-mcp"
    }
  }
}
```

---

## Backend APIs

### FastAPI Service

```json
{
  "uniqueName": "fastapi-service",
  "displayName": "FastAPI Service",
  "type": "vcs",
  "settings": {
    "framework": "fastapi",
    "runtime": "python:3.12",
    "port": 8000,
    "installCommand": "pip install -r requirements.txt",
    "runCommand": "uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4",
    "runEnvs": {
      "DATABASE_URL": "${DATABASE_URL}",
      "REDIS_URL": "${REDIS_URL}",
      "SECRET_KEY": "${SECRET_KEY}",
      "CORS_ORIGINS": "https://myapp.com"
    }
  }
}
```

---

### Express.js API

```json
{
  "uniqueName": "express-api",
  "displayName": "Express API",
  "type": "vcs",
  "settings": {
    "framework": "express",
    "runtime": "node:20",
    "port": 3000,
    "installCommand": "npm ci",
    "runCommand": "node server.js",
    "runEnvs": {
      "NODE_ENV": "production",
      "DATABASE_URL": "${DATABASE_URL}",
      "JWT_SECRET": "${JWT_SECRET}"
    }
  }
}
```

---

### Go Gin API

```json
{
  "uniqueName": "gin-api",
  "displayName": "Go Gin API",
  "type": "vcs",
  "settings": {
    "framework": "gin",
    "runtime": "golang:1.22",
    "port": 8080,
    "buildCommand": "go build -o app",
    "runCommand": "./app",
    "runEnvs": {
      "GIN_MODE": "release",
      "DATABASE_URL": "${DATABASE_URL}"
    }
  }
}
```

---

## Frontends

### Next.js App

```json
{
  "uniqueName": "nextjs-app",
  "displayName": "Next.js Application",
  "type": "vcs",
  "settings": {
    "framework": "nextjs",
    "runtime": "node:20",
    "port": 3000,
    "installCommand": "npm ci",
    "buildCommand": "npm run build",
    "runCommand": "npm start",
    "buildVars": {
      "NEXT_PUBLIC_API_URL": "https://api.example.com",
      "NEXT_PUBLIC_GA_ID": "G-XXXXXXXXXX"
    },
    "runEnvs": {
      "DATABASE_URL": "${DATABASE_URL}"
    }
  }
}
```

---

### React SPA (Vite)

```json
{
  "uniqueName": "react-spa",
  "displayName": "React SPA",
  "type": "vcs",
  "settings": {
    "framework": "reactjs-spa",
    "runtime": "node:20",
    "port": 80,
    "installCommand": "npm ci",
    "buildCommand": "npm run build",
    "buildDir": "dist",
    "buildVars": {
      "VITE_API_URL": "https://api.example.com"
    }
  }
}
```

---

### Vue.js + Nuxt

```json
{
  "uniqueName": "nuxt-app",
  "displayName": "Nuxt Application",
  "type": "vcs",
  "settings": {
    "framework": "nuxtjs",
    "runtime": "node:20",
    "port": 3000,
    "installCommand": "npm ci",
    "buildCommand": "npm run build",
    "runCommand": "node .output/server/index.mjs",
    "buildVars": {
      "NUXT_PUBLIC_API_BASE": "https://api.example.com"
    }
  }
}
```

---

## Bots

### Discord.js Bot

```json
{
  "uniqueName": "discord-bot",
  "displayName": "Discord Bot",
  "type": "vcs",
  "settings": {
    "runtime": "node:20",
    "port": 8080,
    "installCommand": "npm ci",
    "runCommand": "node index.js",
    "runEnvs": {
      "DISCORD_TOKEN": "${DISCORD_TOKEN}",
      "DISCORD_CLIENT_ID": "${DISCORD_CLIENT_ID}",
      "DISCORD_GUILD_ID": "${DISCORD_GUILD_ID}"
    }
  }
}
```

---

### Telegram Bot (Python)

```json
{
  "uniqueName": "telegram-bot",
  "displayName": "Telegram Bot",
  "type": "vcs",
  "settings": {
    "runtime": "python:3.12",
    "port": 8000,
    "installCommand": "pip install python-telegram-bot fastapi uvicorn",
    "runCommand": "python bot.py",
    "runEnvs": {
      "TELEGRAM_TOKEN": "${TELEGRAM_TOKEN}",
      "WEBHOOK_URL": "https://telegram-bot.createos.io/webhook"
    }
  }
}
```

---

### Slack Bot

```json
{
  "uniqueName": "slack-bot",
  "displayName": "Slack Bot",
  "type": "vcs",
  "settings": {
    "runtime": "node:20",
    "port": 3000,
    "installCommand": "npm ci",
    "runCommand": "node app.js",
    "runEnvs": {
      "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
      "SLACK_SIGNING_SECRET": "${SLACK_SIGNING_SECRET}",
      "SLACK_APP_TOKEN": "${SLACK_APP_TOKEN}"
    }
  }
}
```

---

## RAG Pipelines

### LangChain + Pinecone

```json
{
  "uniqueName": "rag-pipeline",
  "displayName": "RAG Pipeline",
  "type": "vcs",
  "settings": {
    "runtime": "python:3.12",
    "port": 8000,
    "installCommand": "pip install langchain langchain-openai pinecone-client fastapi uvicorn",
    "runCommand": "uvicorn main:app --host 0.0.0.0 --port 8000",
    "runEnvs": {
      "OPENAI_API_KEY": "${OPENAI_API_KEY}",
      "PINECONE_API_KEY": "${PINECONE_API_KEY}",
      "PINECONE_ENVIRONMENT": "us-west1-gcp",
      "PINECONE_INDEX": "my-index",
      "EMBEDDING_MODEL": "text-embedding-3-small",
      "CHUNK_SIZE": "512",
      "CHUNK_OVERLAP": "50"
    }
  }
}
```

---

### LlamaIndex + Weaviate

```json
{
  "uniqueName": "llamaindex-rag",
  "displayName": "LlamaIndex RAG",
  "type": "vcs",
  "settings": {
    "runtime": "python:3.12",
    "port": 8000,
    "installCommand": "pip install llama-index weaviate-client fastapi uvicorn",
    "runCommand": "uvicorn main:app --host 0.0.0.0 --port 8000",
    "runEnvs": {
      "OPENAI_API_KEY": "${OPENAI_API_KEY}",
      "WEAVIATE_URL": "${WEAVIATE_URL}",
      "WEAVIATE_API_KEY": "${WEAVIATE_API_KEY}"
    }
  }
}
```

---

## Webhooks & Workers

### Generic Webhook Handler

```json
{
  "uniqueName": "webhook-handler",
  "displayName": "Webhook Handler",
  "type": "upload",
  "settings": {
    "framework": "express",
    "runtime": "node:20",
    "port": 3000,
    "installCommand": "npm install express body-parser",
    "runCommand": "node index.js"
  }
}
```

**index.js:**

```javascript
const express = require('express')
const app = express()
app.use(express.json())

app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body)
  // Process webhook...
  res.status(200).json({ received: true })
})

app.listen(3000, () => console.log('Webhook server running'))
```

---

### Stripe Webhook

```json
{
  "uniqueName": "stripe-webhook",
  "displayName": "Stripe Webhook Handler",
  "type": "vcs",
  "settings": {
    "runtime": "node:20",
    "port": 3000,
    "runEnvs": {
      "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}",
      "STRIPE_WEBHOOK_SECRET": "${STRIPE_WEBHOOK_SECRET}",
      "DATABASE_URL": "${DATABASE_URL}"
    }
  }
}
```

---

### GitHub Webhook

```json
{
  "uniqueName": "github-webhook",
  "displayName": "GitHub Webhook Handler",
  "type": "vcs",
  "settings": {
    "runtime": "python:3.12",
    "port": 8000,
    "runEnvs": {
      "GITHUB_WEBHOOK_SECRET": "${GITHUB_WEBHOOK_SECRET}",
      "SLACK_WEBHOOK_URL": "${SLACK_WEBHOOK_URL}"
    }
  }
}
```

---

## Docker Images

### Custom Docker Image

```json
{
  "uniqueName": "custom-service",
  "displayName": "Custom Service",
  "type": "image",
  "source": {},
  "settings": {
    "port": 8080,
    "runEnvs": {
      "CONFIG_PATH": "/app/config.json",
      "LOG_LEVEL": "info"
    }
  }
}
```

**Deploy:**

```bash
CreateDeployment(project_id, {"image": "ghcr.io/myorg/myservice:v1.0.0"})
```

---

### From Dockerfile in Repo

```json
{
  "uniqueName": "docker-app",
  "displayName": "Docker Application",
  "type": "vcs",
  "settings": {
    "hasDockerfile": true,
    "port": 8080,
    "runEnvs": {
      "NODE_ENV": "production"
    }
  }
}
```

---

## Multi-Service Architectures

### Microservices with App Grouping

```bash
# 1. Create app
app=$(CreateApp({"name": "E-Commerce Platform"}))

# 2. Create services
CreateProject({
  "uniqueName": "api-gateway",
  "appId": app.id,
  "settings": {"port": 3000}
})

CreateProject({
  "uniqueName": "user-service",
  "appId": app.id,
  "settings": {
    "port": 8001,
    "runEnvs": {"DATABASE_URL": "${USER_DB_URL}"}
  }
})

CreateProject({
  "uniqueName": "order-service",
  "appId": app.id,
  "settings": {
    "port": 8002,
    "runEnvs": {"DATABASE_URL": "${ORDER_DB_URL}"}
  }
})

CreateProject({
  "uniqueName": "payment-service",
  "appId": app.id,
  "settings": {
    "port": 8003,
    "runEnvs": {"STRIPE_KEY": "${STRIPE_KEY}"}
  }
})
```

---

## Environment Configurations

### Production Environment

```json
{
  "uniqueName": "production",
  "displayName": "Production",
  "description": "Live production environment",
  "branch": "main",
  "isAutoPromoteEnabled": true,
  "resources": {
    "cpu": 500,
    "memory": 1024,
    "replicas": 3
  },
  "settings": {
    "runEnvs": {
      "NODE_ENV": "production",
      "LOG_LEVEL": "warn",
      "ENABLE_METRICS": "true"
    }
  }
}
```

### Staging Environment

```json
{
  "uniqueName": "staging",
  "displayName": "Staging",
  "description": "Pre-production testing",
  "branch": "staging",
  "isAutoPromoteEnabled": true,
  "resources": {
    "cpu": 300,
    "memory": 512,
    "replicas": 1
  },
  "settings": {
    "runEnvs": {
      "NODE_ENV": "staging",
      "LOG_LEVEL": "debug",
      "ENABLE_METRICS": "true"
    }
  }
}
```

### Development Environment

```json
{
  "uniqueName": "development",
  "displayName": "Development",
  "description": "Feature development",
  "branch": "develop",
  "isAutoPromoteEnabled": false,
  "resources": {
    "cpu": 200,
    "memory": 500,
    "replicas": 1
  },
  "settings": {
    "runEnvs": {
      "NODE_ENV": "development",
      "LOG_LEVEL": "debug",
      "DEBUG": "*"
    }
  }
}
```
