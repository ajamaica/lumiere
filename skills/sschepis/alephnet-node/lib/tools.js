/**
 * Tools Module
 *
 * Provides tool definitions and execution for the chat agent.
 * Tools enable file operations and command execution.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn, execSync } = require('child_process')
const { askChaperone: queryChaperone, configureChaperone } = require('./askChaperone')
const { editFile, configureLLMBridge } = require('./tools/file-editor')

const { scanRange, predictPrime } = require('./tools/quantum-scanner')

// ANSI colors for tool output
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bgGray: '\x1b[100m',
  white: '\x1b[37m',
}

/**
 * OpenAI-compatible tool definitions for API calls
 */
const OPENAI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_file',
      description:
        'Create a new file with the specified content. Creates parent directories if needed.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to current directory',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file and return its text content.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path to read',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'append_file',
      description: 'Append content to the end of an existing file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path to append to',
          },
          content: {
            type: 'string',
            description: 'Content to append',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'replace_text',
      description: 'Replace text in a file. Can replace first occurrence or all occurrences.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path to modify',
          },
          search: {
            type: 'string',
            description: 'Text to search for',
          },
          replace: {
            type: 'string',
            description: 'Text to replace with',
          },
          all: {
            type: 'boolean',
            description: 'If true, replace all instances. Default: false (first only)',
          },
        },
        required: ['path', 'search', 'replace'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Execute a shell command and return the output.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The command to execute',
          },
          cwd: {
            type: 'string',
            description: 'Working directory for the command (optional)',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_pdf',
      description: 'Extract text content from a PDF file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the PDF file',
          },
          pages: {
            type: 'string',
            description: "Specific pages to extract, e.g., '1-3' or '1,3,5' (optional)",
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description:
        'List files and directories in a given path. Returns file names, sizes, and types.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list',
          },
          recursive: {
            type: 'boolean',
            description: 'If true, list recursively (default: false)',
          },
          pattern: {
            type: 'string',
            description: "Optional glob pattern to filter files (e.g., '*.pdf', '*.md')",
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarize_file',
      description:
        'Read a file (text, PDF, etc.) and return a concise summary. Summaries are cached for faster repeat access. Use this instead of read_file when you only need to understand the content without full text.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to summarize',
          },
          focus: {
            type: 'string',
            description:
              "Optional focus area for the summary (e.g., 'technical details', 'main arguments', 'key findings')",
          },
          max_length: {
            type: 'number',
            description: 'Maximum summary length in words (default: 300)',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarize_text',
      description:
        'Summarize a block of text content. Useful for condensing large text before further processing.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The text content to summarize',
          },
          focus: {
            type: 'string',
            description: 'Optional focus area for the summary',
          },
          max_length: {
            type: 'number',
            description: 'Maximum summary length in words (default: 300)',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_chaperone',
      description:
        "Query an external knowledge oracle (chaperone LLM) for factual information, verification, or complex reasoning. Use this when you need to verify facts, look up information you're uncertain about, or get a second opinion on a complex topic. The chaperone is more focused on accuracy than creativity.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The question or request to send to the chaperone',
          },
          context: {
            type: 'string',
            description: 'Optional context to help the chaperone understand the query better',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'quantum_scan',
      description:
        'Scan a range of numbers for prime candidates using the Quantum Neural Network and Riemann Zeta waveforms.',
      parameters: {
        type: 'object',
        properties: {
          start: {
            type: 'number',
            description: 'Start of the range to scan',
          },
          end: {
            type: 'number',
            description: 'End of the range to scan',
          },
        },
        required: ['start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'quantum_predict',
      description: 'Predict the primality of a specific number using the Quantum Neural Network.',
      parameters: {
        type: 'object',
        properties: {
          number: {
            type: 'number',
            description: 'Number to check',
          },
        },
        required: ['number'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description:
        'Intelligently edit a file using natural language instructions. The AI will analyze the file, determine what changes are needed, and apply precise search/replace patches. Use this for code modifications, refactoring, adding features, or fixing bugs. More precise than replace_text for complex changes.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to edit',
          },
          instruction: {
            type: 'string',
            description:
              "Natural language description of the changes to make (e.g., 'Add error handling to the main function', 'Refactor to use async/await')",
          },
          backup: {
            type: 'boolean',
            description: 'If true, create a .bak backup file before editing (default: false)',
          },
        },
        required: ['path', 'instruction'],
      },
    },
  },
]

/**
 * Tool definitions for the system prompt (fallback for models without tool support)
 */
const TOOL_DEFINITIONS = `
## Available Tools

You have access to the following tools. To use a tool, wrap your tool call in XML tags like this:

<tool_call>
<tool>tool_name</tool>
<param_name>value</param_name>
</tool_call>

**IMPORTANT PATH RULES:**
- Always use FULL ABSOLUTE PATHS for all file operations
- Use ~ for home directory (e.g., ~/Documents/file.pdf, ~/Desktop/image.png)
- If user mentions a file without path, ASK for the full path or use the list_directory tool to find it
- Never use just a filename like "file.pdf" - always include the directory path

### Tools:

1. **create_file** - Create a new file with content
   Parameters:
   - path: File path (relative to current directory)
   - content: Content to write to the file
   
   Example:
   <tool_call>
   <tool>create_file</tool>
   <path>src/hello.js</path>
   <content>console.log('Hello World');</content>
   </tool_call>

2. **read_file** - Read the contents of a file
   Parameters:
   - path: File path to read
   
   Example:
   <tool_call>
   <tool>read_file</tool>
   <path>package.json</path>
   </tool_call>

3. **append_file** - Append content to the end of a file
   Parameters:
   - path: File path to append to
   - content: Content to append
   
   Example:
   <tool_call>
   <tool>append_file</tool>
   <path>log.txt</path>
   <content>New log entry</content>
   </tool_call>

4. **replace_text** - Replace text in a file
   Parameters:
   - path: File path to modify
   - search: Text to search for
   - replace: Text to replace with
   - all: (optional) "true" to replace all instances, default replaces first only
   
   Example:
   <tool_call>
   <tool>replace_text</tool>
   <path>config.json</path>
   <search>"debug": false</search>
   <replace>"debug": true</replace>
   </tool_call>

5. **run_command** - Execute a shell command
   Parameters:
   - command: The command to execute
   - cwd: (optional) Working directory for the command
   
   Example:
   <tool_call>
   <tool>run_command</tool>
   <command>npm test</command>
   </tool_call>

6. **read_pdf** - Extract text content from a PDF file
   Parameters:
   - path: Path to the PDF file
   - pages: (optional) Specific pages to extract, e.g., "1-3" or "1,3,5"
   
   Example:
   <tool_call>
   <tool>read_pdf</tool>
   <path>document.pdf</path>
   </tool_call>

7. **list_directory** - List files and directories in a path
   Parameters:
   - path: Directory path to list
   - recursive: (optional) "true" to list recursively
   - pattern: (optional) Glob pattern to filter files (e.g., "*.pdf")
   
   Example:
   <tool_call>
   <tool>list_directory</tool>
   <path>/Users/username/Documents</path>
   </tool_call>

8. **summarize_file** - Read and summarize a file (faster than reading full content)
   Parameters:
   - path: Path to the file to summarize
   - focus: (optional) Focus area for summary (e.g., "technical details", "main arguments")
   - max_length: (optional) Maximum summary length in words (default: 300)
   
   Example:
   <tool_call>
   <tool>summarize_file</tool>
   <path>/path/to/large-document.pdf</path>
   <focus>key findings</focus>
   </tool_call>

9. **summarize_text** - Summarize provided text content
   Parameters:
   - content: The text to summarize
   - focus: (optional) Focus area for summary
   - max_length: (optional) Maximum summary length in words (default: 300)
   
   Example:
   <tool_call>
   <tool>summarize_text</tool>
   <content>Long text content here...</content>
   <focus>main arguments</focus>
   </tool_call>

10. **ask_chaperone** - Query an external knowledge oracle for facts or verification
   Parameters:
   - query: The question to ask the chaperone
   - context: (optional) Additional context to help with the query
   
   Example:
   <tool_call>
   <tool>ask_chaperone</tool>
   <query>What is the current stable version of Node.js?</query>
   </tool_call>

11. **edit_file** - Intelligently edit a file using natural language instructions
   Parameters:
   - path: Path to the file to edit
   - instruction: Natural language description of the changes (e.g., "Add error handling", "Refactor to async/await")
   - backup: (optional) "true" to create a .bak backup file before editing
   
   Example:
   <tool_call>
   <tool>edit_file</tool>
   <path>src/utils.js</path>
   <instruction>Add input validation to the parseConfig function</instruction>
   </tool_call>

**IMPORTANT**: Only use tools when the user EXPLICITLY asks you to perform file operations, read files, list directories, or run commands. Do NOT use tools for general greetings or questions. If the user just says "hello" or asks a question, respond conversationally without using any tools.

**Tip**: Use summarize_file for large documents instead of read_file. Summaries are cached, so repeated access is instant.
**Tip**: Use ask_chaperone when you need to verify facts or get information you're uncertain about.
**Tip**: Use edit_file for complex code changes - it's smarter than replace_text for multi-line edits.
`

/**
 * Summary Cache - Persists file summaries to avoid re-summarization
 */
class SummaryCache {
  constructor(cachePath = './data/summary-cache.json') {
    this.cachePath = cachePath
    this.cache = {}
    this.load()
  }

  load() {
    try {
      if (fs.existsSync(this.cachePath)) {
        this.cache = JSON.parse(fs.readFileSync(this.cachePath, 'utf-8'))
      }
    } catch (e) {
      this.cache = {}
    }
  }

  save() {
    try {
      const dir = path.dirname(this.cachePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2))
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Generate a hash for cache key
   */
  hash(filePath, modifiedTime, focus = '') {
    const input = `${filePath}:${modifiedTime}:${focus}`
    return crypto.createHash('md5').update(input).digest('hex')
  }

  /**
   * Get cached summary if still valid
   */
  get(filePath, modifiedTime, focus = '') {
    const key = this.hash(filePath, modifiedTime, focus)
    const entry = this.cache[key]

    if (entry && entry.modifiedTime === modifiedTime) {
      return entry
    }

    return null
  }

  /**
   * Store a summary
   */
  set(filePath, modifiedTime, focus, summary, keyPoints, metadata = {}) {
    const key = this.hash(filePath, modifiedTime, focus)

    this.cache[key] = {
      filePath,
      modifiedTime,
      focus: focus || '',
      summary,
      keyPoints,
      createdAt: Date.now(),
      ...metadata,
    }

    this.save()
    return this.cache[key]
  }

  /**
   * Clear old entries (older than 7 days)
   */
  cleanup() {
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
    const now = Date.now()
    let removed = 0

    for (const key in this.cache) {
      if (now - this.cache[key].createdAt > maxAge) {
        delete this.cache[key]
        removed++
      }
    }

    if (removed > 0) {
      this.save()
    }

    return removed
  }

  /**
   * Get cache stats
   */
  stats() {
    return {
      entries: Object.keys(this.cache).length,
      files: [...new Set(Object.values(this.cache).map((e) => e.filePath))].length,
    }
  }
}

// Global summary cache instance
let _summaryCache = null
function getSummaryCache(dataPath = './data') {
  if (!_summaryCache) {
    _summaryCache = new SummaryCache(path.join(dataPath, 'summary-cache.json'))
  }
  return _summaryCache
}

/**
 * Parse tool calls from LLM response
 * Supports multiple formats:
 * 1. Standard: <tool_call><tool>name</tool><param>value</param></tool_call>
 * 2. Qwen/LLaMA: <_call><>name</><param>value</param></_call>
 * 3. Function: <function_call><name>tool</name><arguments>...</arguments></function_call>
 *
 * @param {string} text - LLM response text
 * @returns {Array} Array of parsed tool calls
 */
function parseToolCalls(text) {
  const toolCalls = []

  // Pattern 1: Standard format <tool_call><tool>name</tool>...</tool_call>
  const standardRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g
  let match

  while ((match = standardRegex.exec(text)) !== null) {
    const callContent = match[1]
    const toolCall = { raw: match[0] }

    // Extract tool name
    const toolMatch = callContent.match(/<tool>([^<]+)<\/tool>/)
    if (toolMatch) {
      toolCall.tool = toolMatch[1].trim()
    }

    // Extract all parameters
    const paramRegex = /<(\w+)>([^<]*(?:<(?!\/\1>)[^<]*)*)<\/\1>/g
    let paramMatch
    while ((paramMatch = paramRegex.exec(callContent)) !== null) {
      const paramName = paramMatch[1]
      const paramValue = paramMatch[2]
      if (paramName !== 'tool') {
        toolCall[paramName] = paramValue.trim()
      }
    }

    if (toolCall.tool) {
      toolCalls.push(toolCall)
    }
  }

  // Pattern 2: Qwen/LLaMA format <_call><>name</>...</_call> or <_call><>name</><param>value</param></_call>
  const qwenRegex = /<_call>([\s\S]*?)<\/_call>/g

  while ((match = qwenRegex.exec(text)) !== null) {
    const callContent = match[1]
    const toolCall = { raw: match[0] }

    // Extract tool name from <> or <>name</>
    const toolMatch = callContent.match(/<>([^<]*)<\/>/)
    if (toolMatch) {
      toolCall.tool = toolMatch[1].trim()
    }

    // Extract all parameters
    const paramRegex = /<(\w+)>([^<]*(?:<(?!\/\1>)[^<]*)*)<\/\1>/g
    let paramMatch
    while ((paramMatch = paramRegex.exec(callContent)) !== null) {
      const paramName = paramMatch[1]
      const paramValue = paramMatch[2]
      toolCall[paramName] = paramValue.trim()
    }

    if (toolCall.tool) {
      toolCalls.push(toolCall)
    }
  }

  // Pattern 3: Function call format <function_call><name>tool</name><arguments>JSON</arguments></function_call>
  const funcRegex = /<function_call>([\s\S]*?)<\/function_call>/g

  while ((match = funcRegex.exec(text)) !== null) {
    const callContent = match[1]
    const toolCall = { raw: match[0] }

    // Extract tool name
    const nameMatch = callContent.match(/<name>([^<]+)<\/name>/)
    if (nameMatch) {
      toolCall.tool = nameMatch[1].trim()
    }

    // Extract arguments (usually JSON)
    const argsMatch = callContent.match(/<arguments>([\s\S]*?)<\/arguments>/)
    if (argsMatch) {
      try {
        const args = JSON.parse(argsMatch[1].trim())
        Object.assign(toolCall, args)
      } catch (e) {
        // Not valid JSON, try to extract as key-value pairs
        const argContent = argsMatch[1]
        const kvRegex = /<(\w+)>([^<]*)<\/\1>/g
        let kvMatch
        while ((kvMatch = kvRegex.exec(argContent)) !== null) {
          toolCall[kvMatch[1]] = kvMatch[2].trim()
        }
      }
    }

    if (toolCall.tool) {
      toolCalls.push(toolCall)
    }
  }

  // Pattern 4: Inline format like commentaryto=functions/tool_namejson{...}
  // This is a malformed pattern but we try to extract from it
  const inlineRegex = /functions\/(\w+)json(\{[^}]+\})/g

  while ((match = inlineRegex.exec(text)) !== null) {
    const toolName = match[1]
    const argsJson = match[2]
    const toolCall = { raw: match[0], tool: toolName }

    try {
      const args = JSON.parse(argsJson)
      Object.assign(toolCall, args)
      toolCalls.push(toolCall)
    } catch (e) {
      // Skip malformed JSON
    }
  }

  return toolCalls
}

/**
 * Tool executor class
 */
class ToolExecutor {
  constructor(options = {}) {
    this.workingDir = options.workingDir || process.cwd()
    this.homeDir = require('os').homedir()
    this.useColor = options.useColor !== false
    this.onOutput = options.onOutput || console.log
    this.maxFileSize = options.maxFileSize || 1024 * 1024 // 1MB limit
    this.commandTimeout = options.commandTimeout || 30000 // 30s timeout
    // Allow access to home directory files (for reading user's files)
    this.allowHomeDir = options.allowHomeDir !== false
    // LLM client for AI-powered tools (edit_file, etc.)
    this.llmClient = options.llmClient || null

    // Configure chaperone if provider options are given
    if (options.chaperoneConfig) {
      configureChaperone(options.chaperoneConfig)
    }

    // Configure file-editor LLM bridge if llmClient provided
    if (this.llmClient) {
      configureLLMBridge(this.llmClient)
    }
  }

  /**
   * Set the LLM client for AI-powered tools
   */
  setLLMClient(llmClient) {
    this.llmClient = llmClient
    if (llmClient) {
      configureLLMBridge(llmClient)
    }
  }

  /**
   * Color helper
   */
  color(code, text) {
    if (!this.useColor) return text
    return `${code}${text}${ANSI.reset}`
  }

  /**
   * Resolve path - allows working directory, home directory, and absolute paths
   * But prevents dangerous traversal attacks
   */
  resolvePath(filePath, forWrite = false) {
    // Expand ~ to home directory
    let expandedPath = filePath
    if (filePath.startsWith('~/') || filePath === '~') {
      expandedPath = path.join(this.homeDir, filePath.slice(1))
    }

    // Handle common path confusion - if path starts with ./sentient and we're in sentient dir
    const workDirName = path.basename(this.workingDir)
    if (
      expandedPath.startsWith(`./${workDirName}/`) ||
      expandedPath.startsWith(`./${workDirName}`)
    ) {
      // Strip the redundant directory reference
      const stripped = expandedPath.slice(`./${workDirName}`.length)
      expandedPath = stripped.startsWith('/') ? '.' + stripped : './' + stripped || '.'
    }

    // Also handle /workspace/* paths (common in some environments)
    if (expandedPath.startsWith('/workspace/')) {
      expandedPath = expandedPath.slice('/workspace/'.length)
      if (!expandedPath) expandedPath = '.'
    } else if (expandedPath === '/workspace') {
      expandedPath = '.'
    }

    // Resolve to absolute path
    const resolved = path.resolve(this.workingDir, expandedPath)

    // Check if in working directory (always allowed)
    if (resolved.startsWith(this.workingDir)) {
      return resolved
    }

    // Check if in home directory (allowed for reads if enabled)
    if (this.allowHomeDir && resolved.startsWith(this.homeDir)) {
      // For writes outside workdir, require explicit absolute path
      if (forWrite && !path.isAbsolute(filePath) && !filePath.startsWith('~')) {
        throw new Error(
          `Write operations outside working directory require absolute paths.\n` +
            `  Working directory: ${this.workingDir}\n` +
            `  Use absolute path or ~ prefix to write to: ${resolved}`,
        )
      }
      return resolved
    }

    // Reject other paths (security)
    throw new Error(
      `Path not allowed: ${filePath}\n` +
        `  Resolved to: ${resolved}\n` +
        `  Allowed: ${this.workingDir} or ${this.homeDir}`,
    )
  }

  /**
   * Execute a tool call
   * @param {Object} toolCall - Parsed tool call object
   * @returns {Promise<Object>} Result object
   */
  async execute(toolCall) {
    const startTime = Date.now()

    try {
      let result

      switch (toolCall.tool) {
        case 'create_file':
          result = await this.createFile(toolCall.path, toolCall.content)
          break
        case 'read_file':
          result = await this.readFile(toolCall.path)
          break
        case 'append_file':
          result = await this.appendFile(toolCall.path, toolCall.content)
          break
        case 'replace_text':
          result = await this.replaceText(
            toolCall.path,
            toolCall.search,
            toolCall.replace,
            toolCall.all === 'true',
          )
          break
        case 'run_command':
          result = await this.runCommand(toolCall.command, toolCall.cwd)
          break
        case 'read_pdf':
          result = await this.readPdf(toolCall.path, toolCall.pages)
          break
        case 'list_directory':
          result = await this.listDirectory(
            toolCall.path,
            toolCall.recursive === 'true' || toolCall.recursive === true,
            toolCall.pattern,
          )
          break
        case 'summarize_file':
          result = await this.summarizeFile(
            toolCall.path,
            toolCall.focus,
            parseInt(toolCall.max_length) || 300,
          )
          break
        case 'summarize_text':
          result = await this.summarizeText(
            toolCall.content,
            toolCall.focus,
            parseInt(toolCall.max_length) || 300,
          )
          break
        case 'ask_chaperone':
          result = await this.askChaperone(toolCall.query, toolCall.context)
          break
        case 'edit_file':
          result = await this.editFile(
            toolCall.path,
            toolCall.instruction,
            toolCall.backup === 'true' || toolCall.backup === true,
          )
          break
        case 'quantum_scan':
          result = await this.executeQuantumScan(toolCall.start, toolCall.end)
          break
        case 'quantum_predict':
          result = await this.executeQuantumPredict(toolCall.number)
          break
        default:
          result = { success: false, error: `Unknown tool: ${toolCall.tool}` }
      }

      result.duration = Date.now() - startTime
      return result
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Create a new file
   */
  async createFile(filePath, content) {
    if (!filePath) throw new Error('Path is required')
    if (content === undefined) throw new Error('Content is required')

    const resolved = this.resolvePath(filePath, true) // forWrite = true
    const dir = path.dirname(resolved)

    // Create directory if needed
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Check if file exists
    const exists = fs.existsSync(resolved)

    fs.writeFileSync(resolved, content, 'utf-8')

    return {
      success: true,
      action: exists ? 'overwritten' : 'created',
      path: filePath,
      size: content.length,
      message: `${exists ? 'Overwrote' : 'Created'} file: ${filePath} (${content.length} bytes)`,
    }
  }

  /**
   * Read file contents
   */
  async readFile(filePath) {
    if (!filePath) throw new Error('Path is required')

    const resolved = this.resolvePath(filePath)

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const stats = fs.statSync(resolved)
    if (stats.size > this.maxFileSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${this.maxFileSize})`)
    }

    const content = fs.readFileSync(resolved, 'utf-8')

    return {
      success: true,
      path: filePath,
      content,
      size: stats.size,
      lines: content.split('\n').length,
      message: `Read file: ${filePath} (${stats.size} bytes, ${content.split('\n').length} lines)`,
    }
  }

  /**
   * Append to file
   */
  async appendFile(filePath, content) {
    if (!filePath) throw new Error('Path is required')
    if (content === undefined) throw new Error('Content is required')

    const resolved = this.resolvePath(filePath, true) // forWrite = true
    const exists = fs.existsSync(resolved)

    fs.appendFileSync(resolved, content, 'utf-8')

    return {
      success: true,
      path: filePath,
      appended: content.length,
      fileExisted: exists,
      message: `Appended ${content.length} bytes to: ${filePath}`,
    }
  }

  /**
   * Replace text in file
   */
  async replaceText(filePath, search, replace, replaceAll = false) {
    if (!filePath) throw new Error('Path is required')
    if (!search) throw new Error('Search text is required')
    if (replace === undefined) throw new Error('Replace text is required')

    const resolved = this.resolvePath(filePath, true) // forWrite = true

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`)
    }

    let content = fs.readFileSync(resolved, 'utf-8')
    const originalContent = content

    let count = 0
    if (replaceAll) {
      // Count occurrences
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const matches = content.match(regex)
      count = matches ? matches.length : 0
      content = content.split(search).join(replace)
    } else {
      if (content.includes(search)) {
        content = content.replace(search, replace)
        count = 1
      }
    }

    if (count > 0) {
      fs.writeFileSync(resolved, content, 'utf-8')
    }

    return {
      success: true,
      path: filePath,
      replacements: count,
      mode: replaceAll ? 'all' : 'first',
      message:
        count > 0
          ? `Replaced ${count} occurrence(s) in: ${filePath}`
          : `No matches found for search text in: ${filePath}`,
    }
  }

  /**
   * Run a shell command
   */
  async runCommand(command, cwd = null) {
    if (!command) throw new Error('Command is required')

    const workDir = cwd ? this.resolvePath(cwd) : this.workingDir

    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32'
      const shell = isWindows ? 'cmd.exe' : '/bin/sh'
      const shellArg = isWindows ? '/c' : '-c'

      const child = spawn(shell, [shellArg, command], {
        cwd: workDir,
        env: process.env,
        timeout: this.commandTimeout,
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      const timeout = setTimeout(() => {
        child.kill('SIGTERM')
        resolve({
          success: false,
          error: 'Command timed out',
          command,
          cwd: workDir,
          stdout,
          stderr,
        })
      }, this.commandTimeout)

      child.on('close', (code) => {
        clearTimeout(timeout)
        resolve({
          success: code === 0,
          exitCode: code,
          command,
          cwd: workDir,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          message:
            code === 0 ? `Command completed successfully` : `Command exited with code ${code}`,
        })
      })

      child.on('error', (err) => {
        clearTimeout(timeout)
        resolve({
          success: false,
          error: err.message,
          command,
          cwd: workDir,
        })
      })
    })
  }

  /**
   * Read PDF file and extract text
   */
  async readPdf(filePath, pages = null) {
    if (!filePath) throw new Error('Path is required')

    const resolved = this.resolvePath(filePath)

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`)
    }

    if (!filePath.toLowerCase().endsWith('.pdf')) {
      throw new Error('File must be a PDF')
    }

    const stats = fs.statSync(resolved)
    if (stats.size > 50 * 1024 * 1024) {
      // 50MB limit for PDFs
      throw new Error(`PDF too large: ${Math.round(stats.size / 1024 / 1024)}MB (max: 50MB)`)
    }

    // Try different PDF extraction methods
    let content = null
    let method = null

    // Method 1: Try pdftotext (poppler-utils) - best quality
    try {
      let pdfArgs = ['-layout', `"${resolved}"`, '-']
      if (pages) {
        // Parse pages like "1-3" or "1,3,5"
        if (pages.includes('-')) {
          const [first, last] = pages.split('-')
          pdfArgs = ['-f', first, '-l', last, '-layout', `"${resolved}"`, '-']
        } else {
          const firstPage = pages.split(',')[0]
          pdfArgs = ['-f', firstPage, '-l', firstPage, '-layout', `"${resolved}"`, '-']
        }
      }

      content = execSync(`pdftotext ${pdfArgs.join(' ')}`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      })
      method = 'pdftotext'
    } catch (e) {
      // pdftotext not available, try alternative
    }

    // Method 2: Try using strings command as fallback (basic text extraction)
    if (!content) {
      try {
        content = execSync(`strings "${resolved}"`, {
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30000,
        })
        // Filter out binary garbage
        content = content
          .split('\n')
          .filter((line) => line.length > 3 && /[a-zA-Z]{3,}/.test(line))
          .join('\n')
        method = 'strings (fallback)'
      } catch (e) {
        throw new Error(
          'Could not read PDF. Install poppler-utils (pdftotext) for full PDF support: brew install poppler',
        )
      }
    }

    if (!content || content.trim().length === 0) {
      return {
        success: true,
        path: filePath,
        content: '',
        pages: pages || 'all',
        method,
        message: `PDF appears to be empty or contains only images: ${filePath}`,
      }
    }

    // Clean up extracted text
    content = content
      .replace(/\f/g, '\n--- Page Break ---\n') // Form feed to page break
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive newlines
      .trim()

    const wordCount = content.split(/\s+/).length
    const pageCount = (content.match(/--- Page Break ---/g) || []).length + 1

    return {
      success: true,
      path: filePath,
      content,
      size: stats.size,
      wordCount,
      estimatedPages: pageCount,
      pagesRequested: pages || 'all',
      method,
      message: `Read PDF: ${filePath} (~${wordCount} words, ~${pageCount} pages, via ${method})`,
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath, recursive = false, pattern = null) {
    if (!dirPath) throw new Error('Path is required')

    const resolved = this.resolvePath(dirPath)

    if (!fs.existsSync(resolved)) {
      throw new Error(`Directory not found: ${dirPath}`)
    }

    const stats = fs.statSync(resolved)
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${dirPath}`)
    }

    const entries = []

    const listDir = (dir, prefix = '') => {
      const items = fs.readdirSync(dir)

      for (const item of items) {
        // Skip hidden files and common ignore patterns
        if (item.startsWith('.') || item === 'node_modules') continue

        const fullPath = path.join(dir, item)
        const relativePath = path.join(prefix, item)

        try {
          const itemStats = fs.statSync(fullPath)
          const isDir = itemStats.isDirectory()

          // Apply pattern filter
          if (pattern && !isDir) {
            const regex = new RegExp(
              pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.'),
            )
            if (!regex.test(item)) continue
          }

          entries.push({
            name: item,
            path: relativePath,
            type: isDir ? 'directory' : 'file',
            size: isDir ? null : itemStats.size,
            modified: itemStats.mtime.toISOString(),
          })

          if (recursive && isDir && entries.length < 500) {
            listDir(fullPath, relativePath)
          }
        } catch (e) {
          // Skip files we can't access
        }
      }
    }

    listDir(resolved)

    // Sort: directories first, then alphabetically
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    // Format for display
    const formatted = entries
      .map((e) => {
        if (e.type === 'directory') {
          return `📁 ${e.path}/`
        } else {
          const size =
            e.size < 1024
              ? `${e.size}B`
              : e.size < 1024 * 1024
                ? `${Math.round(e.size / 1024)}KB`
                : `${Math.round(e.size / (1024 * 1024))}MB`
          return `📄 ${e.path} (${size})`
        }
      })
      .join('\n')

    return {
      success: true,
      path: dirPath,
      count: entries.length,
      files: entries.filter((e) => e.type === 'file').length,
      directories: entries.filter((e) => e.type === 'directory').length,
      entries,
      content: formatted,
      message: `Listed ${entries.length} items in: ${dirPath}`,
    }
  }

  /**
   * Summarize a file using LLM
   * Checks cache first, generates summary if not cached
   */
  async summarizeFile(filePath, focus = '', maxLength = 300) {
    if (!filePath) throw new Error('Path is required')

    const resolved = this.resolvePath(filePath)

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const stats = fs.statSync(resolved)
    const modifiedTime = stats.mtime.getTime()

    // Check cache
    const cache = getSummaryCache()
    const cached = cache.get(resolved, modifiedTime, focus)

    if (cached) {
      return {
        success: true,
        path: filePath,
        summary: cached.summary,
        keyPoints: cached.keyPoints,
        cached: true,
        cachedAt: cached.createdAt,
        message: `Summary (cached): ${filePath}`,
      }
    }

    // Read file content based on type
    let content
    const ext = path.extname(filePath).toLowerCase()

    if (ext === '.pdf') {
      const pdfResult = await this.readPdf(filePath)
      content = pdfResult.content
    } else {
      const fileResult = await this.readFile(filePath)
      content = fileResult.content
    }

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        path: filePath,
        error: 'File appears to be empty',
      }
    }

    // Generate summary using LLM (if available)
    // For now, use extractive summary as fallback
    const result = await this.generateSummary(content, focus, maxLength)

    // Cache the result
    cache.set(resolved, modifiedTime, focus, result.summary, result.keyPoints, {
      wordCount: content.split(/\s+/).length,
      originalPath: filePath,
    })

    return {
      success: true,
      path: filePath,
      summary: result.summary,
      keyPoints: result.keyPoints,
      cached: false,
      wordCount: content.split(/\s+/).length,
      message: `Summary: ${filePath} (${content.split(/\s+/).length} words → ~${result.summary.split(/\s+/).length} words)`,
    }
  }

  /**
   * Summarize text content directly
   */
  async summarizeText(content, focus = '', maxLength = 300) {
    if (!content) throw new Error('Content is required')

    const result = await this.generateSummary(content, focus, maxLength)

    return {
      success: true,
      summary: result.summary,
      keyPoints: result.keyPoints,
      originalWords: content.split(/\s+/).length,
      summaryWords: result.summary.split(/\s+/).length,
      message: `Summarized ${content.split(/\s+/).length} words → ~${result.summary.split(/\s+/).length} words`,
    }
  }

  /**
   * Edit a file using AI-powered search/replace patches
   */
  async editFile(filePath, instruction, backup = false) {
    if (!filePath) throw new Error('Path is required')
    if (!instruction) throw new Error('Instruction is required')

    const resolved = this.resolvePath(filePath, true) // forWrite = true

    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`)
    }

    if (!this.llmClient) {
      throw new Error('No LLM client configured. edit_file requires an active LLM connection.')
    }

    // Use the file-editor module
    const result = await editFile(resolved, instruction, {
      llmClient: this.llmClient,
      backup: backup,
      maxRetries: 2,
    })

    if (result.success) {
      return {
        success: true,
        path: filePath,
        editsApplied: result.editsApplied || 0,
        editsFailed: result.editsFailed || 0,
        noChanges: result.noChanges || false,
        thoughtProcess: result.thoughtProcess,
        message: result.message || `Edited file: ${filePath}`,
      }
    } else {
      return {
        success: false,
        path: filePath,
        error: result.error,
        thoughtProcess: result.thoughtProcess,
        message: `Failed to edit file: ${result.error}`,
      }
    }
  }

  /**
   * Execute quantum scan
   */
  async executeQuantumScan(start, end) {
    try {
      const result = await scanRange({ start, end })
      return {
        success: true,
        message: result,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Quantum scan failed: ${error.message}`,
      }
    }
  }

  /**
   * Execute quantum prediction
   */
  async executeQuantumPredict(number) {
    try {
      const result = await predictPrime({ number })
      return {
        success: true,
        message: result,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Quantum prediction failed: ${error.message}`,
      }
    }
  }

  /**
   * Ask the chaperone (external knowledge oracle) a question
   * Uses caching to avoid redundant queries
   */
  async askChaperone(query, context = '') {
    if (!query) throw new Error('Query is required')

    // Build the full prompt
    const prompt = context ? `Context: ${context}\n\nQuestion: ${query}` : query

    try {
      const result = await queryChaperone(prompt)

      return {
        success: true,
        query,
        context: context || null,
        response: result.response,
        cached: result.cached || false,
        provider: result.provider || 'unknown',
        message: `Chaperone response${result.cached ? ' (cached)' : ''}: ${result.response.substring(0, 100)}...`,
      }
    } catch (error) {
      return {
        success: false,
        query,
        error: error.message,
        message: `Chaperone error: ${error.message}`,
      }
    }
  }

  /**
   * Generate summary from content
   * Uses extractive summarization (first/last + key sentences)
   * Can be enhanced to use LLM if llmClient is provided
   */
  async generateSummary(content, focus = '', maxLength = 300) {
    // Clean content
    const cleaned = content.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim()

    const sentences = cleaned.split(/(?<=[.!?])\s+/)
    const wordLimit = maxLength

    // Extractive summary strategy:
    // 1. Always include first 2-3 sentences (introduction)
    // 2. Look for sentences with focus keywords if provided
    // 3. Include sentences with key indicators (numbers, "important", "conclusion", etc.)
    // 4. Include last 1-2 sentences (conclusion)

    const selectedSentences = []
    const keyPoints = []
    let wordCount = 0

    // Score sentences
    const scoredSentences = sentences.map((sent, idx) => {
      let score = 0
      const lowerSent = sent.toLowerCase()

      // Position bias
      if (idx < 3) score += 5 // First sentences
      if (idx >= sentences.length - 2) score += 3 // Last sentences

      // Focus keywords
      if (focus) {
        const focusWords = focus.toLowerCase().split(/\s+/)
        for (const word of focusWords) {
          if (lowerSent.includes(word)) score += 3
        }
      }

      // Key indicators
      if (/\d+(\.\d+)?%|\d{4}/.test(sent)) score += 2 // Numbers, years
      if (/important|key|main|significant|notable|conclusion|result|finding/i.test(sent)) score += 2
      if (/propose|introduce|present|demonstrate|show/i.test(sent)) score += 1

      // Length penalty for very short sentences
      if (sent.split(/\s+/).length < 5) score -= 2

      return { sent, idx, score, words: sent.split(/\s+/).length }
    })

    // Sort by score and select
    scoredSentences.sort((a, b) => b.score - a.score)

    for (const item of scoredSentences) {
      if (wordCount + item.words > wordLimit) continue
      if (selectedSentences.length >= 10) break

      selectedSentences.push(item)
      wordCount += item.words

      // Extract key points from high-scoring sentences
      if (item.score >= 4 && keyPoints.length < 5) {
        // Truncate long sentences for key points
        const kp = item.sent.length > 100 ? item.sent.slice(0, 100) + '...' : item.sent
        keyPoints.push(kp)
      }
    }

    // Re-sort by original position for coherent summary
    selectedSentences.sort((a, b) => a.idx - b.idx)

    const summary = selectedSentences.map((s) => s.sent).join(' ')

    return {
      summary: summary || 'Unable to generate summary.',
      keyPoints: keyPoints.length > 0 ? keyPoints : ['No key points extracted.'],
    }
  }

  /**
   * Format tool result for display
   */
  formatResult(toolCall, result) {
    const lines = []

    lines.push(this.color(ANSI.dim, '┌─ Tool: ') + this.color(ANSI.cyan + ANSI.bold, toolCall.tool))

    if (result.success) {
      lines.push(this.color(ANSI.green, '│ ✓ ') + result.message)

      // Show file content for read_file
      if (toolCall.tool === 'read_file' && result.content) {
        lines.push(this.color(ANSI.dim, '│'))
        const contentLines = result.content.split('\n').slice(0, 20)
        for (const line of contentLines) {
          lines.push(this.color(ANSI.dim, '│ ') + line)
        }
        if (result.content.split('\n').length > 20) {
          lines.push(
            this.color(
              ANSI.dim,
              '│ ... (' + (result.content.split('\n').length - 20) + ' more lines)',
            ),
          )
        }
      }

      // Show command output
      if (toolCall.tool === 'run_command') {
        if (result.stdout) {
          lines.push(this.color(ANSI.dim, '│'))
          const outputLines = result.stdout.split('\n').slice(0, 30)
          for (const line of outputLines) {
            lines.push(this.color(ANSI.dim, '│ ') + line)
          }
          if (result.stdout.split('\n').length > 30) {
            lines.push(this.color(ANSI.dim, '│ ... (output truncated)'))
          }
        }
        if (result.stderr) {
          lines.push(
            this.color(ANSI.dim, '│ ') + this.color(ANSI.yellow, 'stderr: ') + result.stderr,
          )
        }
      }

      // Show PDF content preview
      if (toolCall.tool === 'read_pdf' && result.content) {
        lines.push(this.color(ANSI.dim, '│'))
        lines.push(this.color(ANSI.dim, '│ ') + this.color(ANSI.cyan, `Method: ${result.method}`))
        lines.push(
          this.color(ANSI.dim, '│ ') +
            this.color(ANSI.cyan, `Words: ~${result.wordCount}, Pages: ~${result.estimatedPages}`),
        )
        lines.push(this.color(ANSI.dim, '│'))
        const contentLines = result.content.split('\n').slice(0, 15)
        for (const line of contentLines) {
          lines.push(this.color(ANSI.dim, '│ ') + line.substring(0, 80))
        }
        if (result.content.split('\n').length > 15) {
          lines.push(
            this.color(
              ANSI.dim,
              '│ ... (' + (result.content.split('\n').length - 15) + ' more lines)',
            ),
          )
        }
      }

      // Show directory listing
      if (toolCall.tool === 'list_directory' && result.content) {
        lines.push(this.color(ANSI.dim, '│'))
        const contentLines = result.content.split('\n').slice(0, 30)
        for (const line of contentLines) {
          lines.push(this.color(ANSI.dim, '│ ') + line)
        }
        if (result.content.split('\n').length > 30) {
          lines.push(
            this.color(
              ANSI.dim,
              '│ ... (' + (result.content.split('\n').length - 30) + ' more items)',
            ),
          )
        }
      }

      // Show summary result
      if (
        (toolCall.tool === 'summarize_file' || toolCall.tool === 'summarize_text') &&
        result.summary
      ) {
        lines.push(this.color(ANSI.dim, '│'))
        if (result.cached) {
          lines.push(this.color(ANSI.dim, '│ ') + this.color(ANSI.magenta, '📦 Cached summary'))
        }
        lines.push(this.color(ANSI.dim, '│'))
        lines.push(this.color(ANSI.dim, '│ ') + this.color(ANSI.bold, 'Summary:'))

        // Word-wrap summary for display
        const summaryLines = result.summary.match(/.{1,70}(\s|$)/g) || [result.summary]
        for (const line of summaryLines.slice(0, 8)) {
          lines.push(this.color(ANSI.dim, '│ ') + line.trim())
        }
        if (summaryLines.length > 8) {
          lines.push(this.color(ANSI.dim, '│ ... (summary truncated for display)'))
        }

        if (result.keyPoints && result.keyPoints.length > 0) {
          lines.push(this.color(ANSI.dim, '│'))
          lines.push(this.color(ANSI.dim, '│ ') + this.color(ANSI.bold, 'Key Points:'))
          for (const kp of result.keyPoints.slice(0, 5)) {
            lines.push(
              this.color(ANSI.dim, '│ ') + this.color(ANSI.cyan, '• ') + kp.substring(0, 70),
            )
          }
        }
      }

      // Show chaperone response
      if (toolCall.tool === 'ask_chaperone' && result.response) {
        lines.push(this.color(ANSI.dim, '│'))
        if (result.cached) {
          lines.push(this.color(ANSI.dim, '│ ') + this.color(ANSI.magenta, '📦 Cached response'))
        }
        lines.push(
          this.color(ANSI.dim, '│ ') + this.color(ANSI.cyan, `Provider: ${result.provider}`),
        )
        lines.push(this.color(ANSI.dim, '│'))
        lines.push(this.color(ANSI.dim, '│ ') + this.color(ANSI.bold, 'Response:'))

        // Word-wrap response for display
        const responseLines = result.response.match(/.{1,70}(\s|$)/g) || [result.response]
        for (const line of responseLines.slice(0, 10)) {
          lines.push(this.color(ANSI.dim, '│ ') + line.trim())
        }
        if (responseLines.length > 10) {
          lines.push(this.color(ANSI.dim, '│ ... (response truncated for display)'))
        }
      }

      // Show edit_file result
      if (toolCall.tool === 'edit_file') {
        lines.push(this.color(ANSI.dim, '│'))
        if (result.noChanges) {
          lines.push(this.color(ANSI.dim, '│ ') + this.color(ANSI.yellow, '⚡ No changes needed'))
        } else if (result.editsApplied > 0) {
          lines.push(
            this.color(ANSI.dim, '│ ') +
              this.color(ANSI.green, `✏️  Applied ${result.editsApplied} edit(s)`),
          )
          if (result.editsFailed > 0) {
            lines.push(
              this.color(ANSI.dim, '│ ') +
                this.color(ANSI.yellow, `⚠️  ${result.editsFailed} edit(s) failed`),
            )
          }
        }
        if (result.thoughtProcess) {
          lines.push(this.color(ANSI.dim, '│'))
          lines.push(
            this.color(ANSI.dim, '│ ') +
              this.color(ANSI.cyan, 'AI reasoning: ') +
              result.thoughtProcess.substring(0, 60) +
              '...',
          )
        }
      }
    } else {
      lines.push(this.color(ANSI.red, '│ ✗ Error: ') + result.error)
    }

    lines.push(this.color(ANSI.dim, '└─ ') + this.color(ANSI.dim, `(${result.duration}ms)`))

    return lines.join('\n')
  }
}

/**
 * Process LLM response for tool calls and execute them
 * @param {string} response - LLM response text
 * @param {ToolExecutor} executor - Tool executor instance
 * @returns {Promise<Object>} Processing result
 */
async function processToolCalls(response, executor) {
  const toolCalls = parseToolCalls(response)

  if (toolCalls.length === 0) {
    return { hasTools: false, results: [], cleanedResponse: response }
  }

  const results = []
  let cleanedResponse = response

  for (const toolCall of toolCalls) {
    const result = await executor.execute(toolCall)
    results.push({ toolCall, result })

    // Remove the tool call from response for cleaner display
    cleanedResponse = cleanedResponse.replace(toolCall.raw, '').trim()
  }

  return {
    hasTools: true,
    results,
    cleanedResponse,
  }
}

/**
 * Execute a tool call from OpenAI format
 * @param {Object} toolCall - OpenAI format tool call
 * @param {ToolExecutor} executor - Tool executor instance
 * @returns {Promise<Object>} Result
 */
async function executeOpenAIToolCall(toolCall, executor) {
  const name = toolCall.function?.name || toolCall.name
  let args = {}

  try {
    // Handle various argument formats
    const rawArgs = toolCall.function?.arguments || toolCall.arguments

    if (!rawArgs) {
      args = {}
    } else if (typeof rawArgs === 'string') {
      // Try to parse as JSON
      try {
        args = JSON.parse(rawArgs)
      } catch (jsonErr) {
        // Not valid JSON - might be a simple path string
        // Try to infer the parameter based on tool type
        if (
          name === 'read_file' ||
          name === 'read_pdf' ||
          name === 'list_directory' ||
          name === 'summarize_file'
        ) {
          args = { path: rawArgs.trim() }
        } else if (name === 'summarize_text') {
          args = { content: rawArgs.trim() }
        } else {
          return {
            success: false,
            error: `Failed to parse tool arguments: ${rawArgs.substring(0, 100)}`,
            rawArgs: rawArgs,
          }
        }
      }
    } else if (typeof rawArgs === 'object') {
      args = rawArgs
    }
  } catch (e) {
    return {
      success: false,
      error: `Failed to parse tool arguments: ${e.message}`,
      rawToolCall: JSON.stringify(toolCall).substring(0, 200),
    }
  }

  return executor.execute({
    tool: name,
    ...args,
  })
}

module.exports = {
  TOOL_DEFINITIONS,
  OPENAI_TOOLS,
  parseToolCalls,
  processToolCalls,
  executeOpenAIToolCall,
  ToolExecutor,
  SummaryCache,
  getSummaryCache,
  ANSI,
}
