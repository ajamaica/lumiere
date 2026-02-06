# Build Artifacts

This directory contains the final packaged skill files ready for distribution.

## Contents

- `*.skill` - Packaged skill files (tarball format)
- `build-info.json` - Build metadata including version, size, and build time

## Usage

### Install a skill

```bash
# Extract the skill package
tar -xzf aiusd-skill-agent.skill

# Install dependencies (required)
cd aiusd-skill-agent/
npm install

# Setup authentication and test
npm run setup
```

**Note**: Starting from v1.1, skill packages exclude `node_modules` to stay under the 5MB size limit. Dependencies are installed automatically during setup.

## 🔐 Authentication Setup

After extracting and installing dependencies, you need to set up authentication to use AIUSD services.

### Quick Setup (Recommended)

```bash
# Automatic setup with guided authentication
npm run setup
```

### Method 1: Environment Variable (Simplest)

```bash
# Get your token from: https://mcp.alpha.dev/oauth/login
export MCP_HUB_TOKEN="Bearer your_jwt_token_here"

# Test the connection
npm test
```

### Method 2: mcporter OAuth (Recommended)

```bash
# Install mcporter if needed
npm install -g mcporter

# OAuth login with browser
npx mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd

# This will open a browser for OAuth login
# Credentials will be saved to ~/.mcporter/credentials.json
```

### Method 3: Manual Token File

```bash
# Create token directory
mkdir -p ~/.mcp-hub

# Create token file (get token from OAuth login page)
cat > ~/.mcp-hub/token.json << 'EOF'
{
  "token": "Bearer your_token_here",
  "timestamp": 1738123456,
  "expires_in": 86400
}
EOF
```

### 🔄 Re-authentication (Clear Cache)

If you encounter authentication issues or need to switch accounts:

```bash
# Clear all cached authentication and re-login
npm run reauth

# This will:
# 1. Clear ~/.mcporter/ cache
# 2. Clear ~/.mcp-hub/ tokens
# 3. Start fresh OAuth login
# 4. Verify new authentication works
```

### Authentication Priority

The skill checks authentication in this order:

1. Environment variables (`MCP_HUB_TOKEN`, `AIUSD_TOKEN`)
2. mcporter credentials (`~/.mcporter/credentials.json`)
3. Local token files (`~/.mcp-hub/token.json`)

### Troubleshooting

- **401 Unauthorized**: Run `npm run reauth` to clear cache and re-login
- **Token expired**: Re-run any of the authentication methods above
- **Connection failed**: Check if MCP server is accessible

### Distribution

```bash
# Copy skill file to deployment location
cp aiusd-skill-agent.skill /path/to/skills/directory/

# Or upload to CDN, share via GitHub releases, etc.
```

## Build Process

Skills are built using:

```bash
npm run build-skill
```

This creates:

1. A temporary build directory with all necessary files
2. A compressed `.skill` tarball in this directory
3. Build metadata for tracking versions and sizes

## Version Control

This directory is tracked in git to:

- Provide ready-to-use skill packages
- Track build history and versions
- Enable easy distribution via GitHub releases
- Allow users to download skills without building

## File Naming

Skill files follow the pattern: `{package-name}-{type}.skill`

- `aiusd-skill-agent.skill` - Main AIUSD trading skill for Claude Code

## Automation

Future improvements could include:

- Automated builds on CI/CD
- GitHub releases with attached skill files
- Version-based file naming
- Multi-format packaging (zip, tar.gz, etc.)
