# MCP Prerequisites Setup Skill

Verifies and configures the required MCP servers for the Product Guide Writer workflow.

## Quick Start

Run this skill to check your MCP configuration:

```
"Check my MCP configuration for the Product Guide Writer"
"Verify Atlassian MCP is configured"
```

## Required MCPs

| MCP | Required | Purpose |
|-----|----------|---------|
| user-atlassian | Yes | Confluence search/publish |
| user-github | Yes | Repository discovery |
| user-Figma | No | Design mockups |
| user-elasticsearch-mcp | No | Log verification |

## Key Configurations

**Atlassian Cloud ID:** `trading212.atlassian.net`

**Confluence Space:** `GT` (Product Documentation)

## Validation Steps

1. Check MCP server availability
2. Test Atlassian authentication
3. Verify GT space access
4. Run test search

## See Also

- [SKILL.md](SKILL.md) - Full configuration guide
- [product-guide-writer/SKILL.md](../product-guide-writer/SKILL.md) - Documentation workflow
