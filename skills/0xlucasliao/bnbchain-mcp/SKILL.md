---
name: bnbchain-mcp
version: 1.0.0
description: Interact with the BNB Chain Model Context Protocol (MCP) server. Use to query DeFi data, get token prices, search documentation, fetch git diffs, and retrieve smart contract source code on BNB Chain.
---

# BNB Chain MCP Skill

This skill allows you to interact with the BNB Chain MCP server to retrieve data about BNB Chain.

## How to Use

The BNB Chain MCP server runs locally. You interact with it using the `mcp-client` script bundled with this skill.

### Commands

Run the client script to execute tools:

```bash
python3 skills/bnbchain-mcp/scripts/mcp-client.py <tool_name> [arguments]
```

To list available tools:

```bash
python3 skills/bnbchain-mcp/scripts/mcp-client.py list_tools
```

### Available Tools

Currently supported tools in `bnbchain-mcp`:

- **get_token_price**: Get token price in USD. `args: {"symbol": "BNB"}`
- **get_defi_rates**: Get lending/borrowing rates for protocol. `args: {"protocol": "venus"}`
- **search_documentation**: Search official docs. `args: {"query": "validators"}`
- **get_recent_git_diffs**: Get recent git diffs for a repo. `args: {"repo_name": "bnb-chain/bsc"}`
- **get_smart_contract_source**: Get source code for a contract. `args: {"contract_address": "0x..."}`

## Setup

The MCP server must be running for this skill to work.

If the server is not running, start it (this is usually handled by the MCP/OpenClaw infrastructure, but good to know):
`uv run bnbchain-mcp` (requires `uv` and `bnbchain-mcp` package installed).

## Examples

**Get the price of BNB:**

```bash
python3 skills/bnbchain-mcp/scripts/mcp-client.py get_token_price --args '{"symbol": "BNB"}'
```

**Search documentation:**

```bash
python3 skills/bnbchain-mcp/scripts/mcp-client.py search_documentation --args '{"query": "staking"}'
```
