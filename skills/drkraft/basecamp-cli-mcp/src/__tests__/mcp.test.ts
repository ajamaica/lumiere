import { describe, expect, it } from 'vitest'

import { executeTool, getTools } from '../mcp/tools/index.js'

describe('MCP Tools', () => {
  it('should list available tools', async () => {
    const tools = await getTools()
    expect(Array.isArray(tools)).toBe(true)
    expect(tools.some((tool) => tool.name === 'basecamp_list_projects')).toBe(true)
  })

  it('should execute a tool call', async () => {
    const result = await executeTool('basecamp_list_projects', {})
    expect(Array.isArray(result)).toBe(true)
  })

  it('should reject unknown tools', async () => {
    await expect(executeTool('basecamp_unknown_tool', {})).rejects.toThrow('Unknown tool')
  })
})
