/**
 * Terminal Markdown Renderer
 *
 * Converts markdown to ANSI-styled terminal output for nice CLI display.
 * Handles streaming by buffering partial lines and rendering complete ones.
 * Supports runnable JavaScript code blocks with output display.
 */

const { VM } = require('vm')

// ANSI escape codes
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Backgrounds
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgGray: '\x1b[100m',
}

/**
 * Unicode math symbol mappings for common LaTeX expressions
 */
const MATH_SYMBOLS = {
  // Greek letters
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\delta': 'δ',
  '\\epsilon': 'ε',
  '\\zeta': 'ζ',
  '\\eta': 'η',
  '\\theta': 'θ',
  '\\iota': 'ι',
  '\\kappa': 'κ',
  '\\lambda': 'λ',
  '\\mu': 'μ',
  '\\nu': 'ν',
  '\\xi': 'ξ',
  '\\pi': 'π',
  '\\rho': 'ρ',
  '\\sigma': 'σ',
  '\\tau': 'τ',
  '\\upsilon': 'υ',
  '\\phi': 'φ',
  '\\chi': 'χ',
  '\\psi': 'ψ',
  '\\omega': 'ω',
  '\\Gamma': 'Γ',
  '\\Delta': 'Δ',
  '\\Theta': 'Θ',
  '\\Lambda': 'Λ',
  '\\Xi': 'Ξ',
  '\\Pi': 'Π',
  '\\Sigma': 'Σ',
  '\\Phi': 'Φ',
  '\\Psi': 'Ψ',
  '\\Omega': 'Ω',

  // Operators and relations
  '\\times': '×',
  '\\div': '÷',
  '\\cdot': '·',
  '\\pm': '±',
  '\\mp': '∓',
  '\\ast': '∗',
  '\\star': '⋆',
  '\\circ': '∘',
  '\\bullet': '•',
  '\\oplus': '⊕',
  '\\otimes': '⊗',
  '\\leq': '≤',
  '\\geq': '≥',
  '\\neq': '≠',
  '\\approx': '≈',
  '\\equiv': '≡',
  '\\sim': '∼',
  '\\simeq': '≃',
  '\\cong': '≅',
  '\\propto': '∝',
  '\\ll': '≪',
  '\\gg': '≫',
  '\\subset': '⊂',
  '\\supset': '⊃',
  '\\subseteq': '⊆',
  '\\supseteq': '⊇',
  '\\in': '∈',
  '\\notin': '∉',
  '\\ni': '∋',
  '\\cap': '∩',
  '\\cup': '∪',
  '\\setminus': '∖',
  '\\land': '∧',
  '\\lor': '∨',
  '\\lnot': '¬',
  '\\neg': '¬',
  '\\forall': '∀',
  '\\exists': '∃',
  '\\nexists': '∄',
  '\\Rightarrow': '⇒',
  '\\Leftarrow': '⇐',
  '\\Leftrightarrow': '⇔',
  '\\rightarrow': '→',
  '\\leftarrow': '←',
  '\\leftrightarrow': '↔',
  '\\to': '→',
  '\\gets': '←',
  '\\mapsto': '↦',
  '\\uparrow': '↑',
  '\\downarrow': '↓',
  '\\updownarrow': '↕',

  // Misc symbols
  '\\infty': '∞',
  '\\partial': '∂',
  '\\nabla': '∇',
  '\\sum': 'Σ',
  '\\prod': 'Π',
  '\\int': '∫',
  '\\sqrt': '√',
  '\\surd': '√',
  '\\angle': '∠',
  '\\triangle': '△',
  '\\square': '□',
  '\\diamond': '◇',
  '\\clubsuit': '♣',
  '\\diamondsuit': '♦',
  '\\heartsuit': '♥',
  '\\spadesuit': '♠',
  '\\emptyset': '∅',
  '\\varnothing': '∅',
  '\\aleph': 'ℵ',
  '\\wp': '℘',
  '\\Re': 'ℜ',
  '\\Im': 'ℑ',
  '\\hbar': 'ℏ',
  '\\ell': 'ℓ',
  '\\ldots': '…',
  '\\cdots': '⋯',
  '\\vdots': '⋮',
  '\\ddots': '⋱',
  '\\prime': '′',
  '\\degree': '°',

  // Brackets
  '\\langle': '⟨',
  '\\rangle': '⟩',
  '\\lfloor': '⌊',
  '\\rfloor': '⌋',
  '\\lceil': '⌈',
  '\\rceil': '⌉',
  '\\{': '{',
  '\\}': '}',

  // Spacing
  '\\quad': '  ',
  '\\qquad': '    ',
  '\\,': ' ',
  '\\;': ' ',
  '\\:': ' ',
  '\\ ': ' ',
}

// Superscript and subscript mappings
const SUPERSCRIPTS = {
  0: '⁰',
  1: '¹',
  2: '²',
  3: '³',
  4: '⁴',
  5: '⁵',
  6: '⁶',
  7: '⁷',
  8: '⁸',
  9: '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
  i: 'ⁱ',
  a: 'ᵃ',
  b: 'ᵇ',
  c: 'ᶜ',
  d: 'ᵈ',
  e: 'ᵉ',
  f: 'ᶠ',
  g: 'ᵍ',
  h: 'ʰ',
  j: 'ʲ',
  k: 'ᵏ',
  l: 'ˡ',
  m: 'ᵐ',
  o: 'ᵒ',
  p: 'ᵖ',
  r: 'ʳ',
  s: 'ˢ',
  t: 'ᵗ',
  u: 'ᵘ',
  v: 'ᵛ',
  w: 'ʷ',
  x: 'ˣ',
  y: 'ʸ',
  z: 'ᶻ',
}

const SUBSCRIPTS = {
  0: '₀',
  1: '₁',
  2: '₂',
  3: '₃',
  4: '₄',
  5: '₅',
  6: '₆',
  7: '₇',
  8: '₈',
  9: '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  a: 'ₐ',
  e: 'ₑ',
  h: 'ₕ',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  l: 'ₗ',
  m: 'ₘ',
  n: 'ₙ',
  o: 'ₒ',
  p: 'ₚ',
  r: 'ᵣ',
  s: 'ₛ',
  t: 'ₜ',
  u: 'ᵤ',
  v: 'ᵥ',
  x: 'ₓ',
}

/**
 * Convert LaTeX math to Unicode text representation
 * @param {string} latex - LaTeX expression
 * @returns {string} Unicode formatted math
 */
function formatMath(latex) {
  let result = latex

  // Handle fractions: \frac{a}{b} -> a/b
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')

  // Handle superscripts: ^{...} or ^x
  result = result.replace(/\^{([^}]+)}/g, (match, content) => {
    return content
      .split('')
      .map((c) => SUPERSCRIPTS[c] || c)
      .join('')
  })
  result = result.replace(/\^([a-zA-Z0-9])/g, (match, char) => {
    return SUPERSCRIPTS[char] || `^${char}`
  })

  // Handle subscripts: _{...} or _x
  result = result.replace(/_{([^}]+)}/g, (match, content) => {
    return content
      .split('')
      .map((c) => SUBSCRIPTS[c] || c)
      .join('')
  })
  result = result.replace(/_([a-zA-Z0-9])/g, (match, char) => {
    return SUBSCRIPTS[char] || `_${char}`
  })

  // Handle sqrt
  result = result.replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
  result = result.replace(/\\sqrt\s+([a-zA-Z0-9])/g, '√$1')

  // Replace LaTeX symbols with Unicode
  for (const [latex, unicode] of Object.entries(MATH_SYMBOLS)) {
    // Escape special regex characters in latex
    const escaped = latex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'g'), unicode)
  }

  // Clean up extra braces
  result = result.replace(/\{([^{}]+)\}/g, '$1')

  // Clean up whitespace
  result = result.replace(/\s+/g, ' ').trim()

  return result
}

/**
 * Format inline markdown elements (bold, italic, code, links, math)
 * @param {string} text - Line of text
 * @param {boolean} useColor - Whether to use colors
 * @returns {string} Formatted text
 */
function formatInline(text, useColor = true) {
  // First, handle LaTeX math: \(...\) or $...$
  text = text.replace(/\\\((.+?)\\\)/g, (match, latex) => {
    const formatted = formatMath(latex)
    if (useColor) {
      return `${ANSI.brightMagenta}${formatted}${ANSI.reset}`
    }
    return formatted
  })

  text = text.replace(/\$([^$]+)\$/g, (match, latex) => {
    const formatted = formatMath(latex)
    if (useColor) {
      return `${ANSI.brightMagenta}${formatted}${ANSI.reset}`
    }
    return formatted
  })

  if (!useColor) {
    // Strip markdown but keep text
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
  }

  // Bold: **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, `${ANSI.bold}$1${ANSI.reset}`)
  text = text.replace(/__(.+?)__/g, `${ANSI.bold}$1${ANSI.reset}`)

  // Italic: *text* or _text_ (but not inside words)
  text = text.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, `${ANSI.italic}$1${ANSI.reset}`)
  text = text.replace(/(?<!\w)_([^_]+)_(?!\w)/g, `${ANSI.italic}$1${ANSI.reset}`)

  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, `${ANSI.bgGray}${ANSI.white} $1 ${ANSI.reset}`)

  // Links: [text](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    `${ANSI.underline}${ANSI.cyan}$1${ANSI.reset} ${ANSI.dim}($2)${ANSI.reset}`,
  )

  // Strikethrough: ~~text~~
  text = text.replace(/~~(.+?)~~/g, `${ANSI.dim}$1${ANSI.reset}`)

  return text
}

/**
 * Streaming Markdown Renderer
 *
 * Buffers input and renders complete lines with proper formatting.
 * Tracks JavaScript code blocks for execution.
 */
class MarkdownRenderer {
  constructor(options = {}) {
    this.useColor = options.useColor !== false
    this.buffer = ''
    this.inCodeBlock = false
    this.codeBlockLang = ''
    this.codeBlockContent = ''
    this.inTable = false
    this.tableRows = []
    this.lineHandler = options.onLine || ((line) => process.stdout.write(line))

    // Track runnable code blocks
    this.codeBlocks = []
    this.currentBlockId = 0
    this.enableCodeExecution = options.enableCodeExecution !== false
  }

  /**
   * Process a chunk of streaming text
   * @param {string} chunk - Text chunk from stream
   */
  write(chunk) {
    this.buffer += chunk

    // Process complete lines
    let newlineIndex
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex)
      this.buffer = this.buffer.slice(newlineIndex + 1)

      // Track consecutive empty lines
      if (line.trim() === '') {
        this.emptyLineCount = (this.emptyLineCount || 0) + 1
        // Limit to 2 consecutive empty lines max
        if (this.emptyLineCount > 2) continue
      } else {
        this.emptyLineCount = 0
      }

      this.renderLine(line)
      this.lineHandler('\n')
    }
  }

  /**
   * Flush remaining buffer content
   */
  flush() {
    if (this.buffer.length > 0) {
      this.renderLine(this.buffer)
      this.buffer = ''
    }

    // Close any open code block
    if (this.inCodeBlock) {
      this.lineHandler(`${ANSI.reset}\n`)
      this.inCodeBlock = false
    }
  }

  /**
   * Render a complete line
   * @param {string} line - Line to render
   */
  renderLine(line) {
    // Check for table rows
    if (line.includes('|')) {
      const trimmed = line.trim()
      // Table separator line
      if (/^\|?[-:|]+\|[-:|]+\|?$/.test(trimmed)) {
        this.inTable = true
        return // Skip separator line, we'll draw our own
      }
      // Table data row
      if (trimmed.startsWith('|') || (this.inTable && trimmed.includes('|'))) {
        this.tableRows.push(line)
        return
      }
    } else if (this.inTable && this.tableRows.length > 0) {
      // End of table, render it
      this.renderTable()
      this.inTable = false
      this.tableRows = []
    }

    // Check for code block markers
    const codeBlockMatch = line.match(/^```(\w*)/)
    if (codeBlockMatch) {
      if (!this.inCodeBlock) {
        // Starting code block
        this.inCodeBlock = true
        this.codeBlockLang = codeBlockMatch[1] || 'code'
        this.codeBlockContent = ''

        const isRunnable = ['javascript', 'js', 'typescript', 'ts', 'node'].includes(
          this.codeBlockLang.toLowerCase(),
        )

        if (this.useColor) {
          if (isRunnable && this.enableCodeExecution) {
            const blockId = this.codeBlocks.length
            this.lineHandler(
              `${ANSI.dim}─── ${this.codeBlockLang} ${ANSI.green}[${blockId}]${ANSI.dim} ───${ANSI.reset}\n`,
            )
          } else {
            this.lineHandler(`${ANSI.dim}─── ${this.codeBlockLang} ───${ANSI.reset}\n`)
          }
        }
      } else {
        // Ending code block
        const isRunnable = ['javascript', 'js', 'typescript', 'ts', 'node'].includes(
          this.codeBlockLang.toLowerCase(),
        )

        // Store runnable code blocks
        if (isRunnable && this.enableCodeExecution && this.codeBlockContent.trim()) {
          const blockId = this.codeBlocks.length
          this.codeBlocks.push({
            id: blockId,
            language: this.codeBlockLang,
            code: this.codeBlockContent.trim(),
          })

          if (this.useColor) {
            this.lineHandler(
              `${ANSI.dim}───────────${ANSI.reset} ${ANSI.green}▶ /run ${blockId}${ANSI.reset}`,
            )
          } else {
            this.lineHandler(`─────────── ▶ /run ${blockId}`)
          }
        } else {
          if (this.useColor) {
            this.lineHandler(`${ANSI.dim}───────────${ANSI.reset}`)
          }
        }

        this.inCodeBlock = false
        this.codeBlockContent = ''
      }
      return
    }

    // Inside code block - render as-is with styling and capture content
    if (this.inCodeBlock) {
      // Capture code for later execution
      this.codeBlockContent += line + '\n'

      if (this.useColor) {
        this.lineHandler(`${ANSI.gray}│ ${ANSI.brightWhite}${line}${ANSI.reset}`)
      } else {
        this.lineHandler(`  ${line}`)
      }
      return
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const text = headerMatch[2]
      if (this.useColor) {
        const colors = [
          ANSI.brightCyan,
          ANSI.brightBlue,
          ANSI.brightMagenta,
          ANSI.cyan,
          ANSI.blue,
          ANSI.magenta,
        ]
        const color = colors[level - 1] || ANSI.white
        this.lineHandler(`${ANSI.bold}${color}${'#'.repeat(level)} ${text}${ANSI.reset}`)
      } else {
        this.lineHandler(line)
      }
      return
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      if (this.useColor) {
        this.lineHandler(`${ANSI.dim}${'─'.repeat(40)}${ANSI.reset}`)
      } else {
        this.lineHandler('─'.repeat(40))
      }
      return
    }

    // Blockquote
    const quoteMatch = line.match(/^>\s*(.*)/)
    if (quoteMatch) {
      if (this.useColor) {
        this.lineHandler(
          `${ANSI.dim}│${ANSI.reset} ${ANSI.italic}${formatInline(quoteMatch[1], this.useColor)}${ANSI.reset}`,
        )
      } else {
        this.lineHandler(`│ ${formatInline(quoteMatch[1], false)}`)
      }
      return
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)/)
    if (ulMatch) {
      const indent = ulMatch[1] || ''
      const text = ulMatch[2]
      if (this.useColor) {
        this.lineHandler(
          `${indent}${ANSI.green}•${ANSI.reset} ${formatInline(text, this.useColor)}`,
        )
      } else {
        this.lineHandler(`${indent}• ${formatInline(text, false)}`)
      }
      return
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)/)
    if (olMatch) {
      const indent = olMatch[1] || ''
      const num = olMatch[2]
      const text = olMatch[3]
      if (this.useColor) {
        this.lineHandler(
          `${indent}${ANSI.yellow}${num}.${ANSI.reset} ${formatInline(text, this.useColor)}`,
        )
      } else {
        this.lineHandler(`${indent}${num}. ${formatInline(text, false)}`)
      }
      return
    }

    // Task list
    const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)/)
    if (taskMatch) {
      const indent = taskMatch[1] || ''
      const checked = taskMatch[2].toLowerCase() === 'x'
      const text = taskMatch[3]
      if (this.useColor) {
        const checkbox = checked ? `${ANSI.green}✓${ANSI.reset}` : `${ANSI.dim}○${ANSI.reset}`
        this.lineHandler(`${indent}${checkbox} ${formatInline(text, this.useColor)}`)
      } else {
        const checkbox = checked ? '[x]' : '[ ]'
        this.lineHandler(`${indent}${checkbox} ${formatInline(text, false)}`)
      }
      return
    }

    // Regular paragraph - just format inline elements
    this.lineHandler(formatInline(line, this.useColor))
  }

  /**
   * Get terminal width
   */
  getTerminalWidth() {
    try {
      return process.stdout.columns || 80
    } catch {
      return 80
    }
  }

  /**
   * Wrap text to a maximum width
   */
  wrapText(text, maxWidth) {
    if (text.length <= maxWidth) return [text]

    const words = text.split(/\s+/)
    const lines = []
    let currentLine = ''

    for (const word of words) {
      if (currentLine.length === 0) {
        currentLine = word
      } else if (currentLine.length + 1 + word.length <= maxWidth) {
        currentLine += ' ' + word
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) lines.push(currentLine)

    return lines.length > 0 ? lines : ['']
  }

  /**
   * Render a collected table - terminal-friendly with column limits
   */
  renderTable() {
    if (this.tableRows.length === 0) return

    // Parse cells from each row
    const rows = this.tableRows.map((row) => {
      return row
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell, i, arr) => (i > 0 && i < arr.length - 1) || cell !== '')
    })

    if (rows.length === 0) return

    const colCount = Math.max(...rows.map((r) => r.length))

    // Calculate available width
    const termWidth = this.getTerminalWidth()
    const maxTableWidth = Math.min(termWidth - 4, 120) // Leave margin

    // For wide tables, render as list instead of table
    const rawWidths = []
    for (let i = 0; i < colCount; i++) {
      rawWidths[i] = Math.max(...rows.map((r) => (r[i] || '').length), 3)
    }
    const totalRawWidth = rawWidths.reduce((a, b) => a + b, 0) + colCount * 3 + 1

    if (totalRawWidth > maxTableWidth && colCount > 2) {
      // Render as formatted list instead of table
      this.renderTableAsList(rows)
      return
    }

    // Calculate column widths with max cap
    const maxColWidth = Math.floor((maxTableWidth - colCount * 3 - 1) / colCount)
    const colWidths = rawWidths.map((w) => Math.min(w, Math.max(maxColWidth, 15)))

    // Box drawing characters
    const box = {
      tl: '┌',
      tr: '┐',
      bl: '└',
      br: '┘',
      h: '─',
      v: '│',
      lt: '├',
      rt: '┤',
      tt: '┬',
      bt: '┴',
      cross: '┼',
    }

    // Top border
    let topBorder = box.tl
    for (let i = 0; i < colCount; i++) {
      topBorder += box.h.repeat(colWidths[i] + 2)
      topBorder += i < colCount - 1 ? box.tt : box.tr
    }
    this.lineHandler(this.useColor ? `${ANSI.dim}${topBorder}${ANSI.reset}` : topBorder)
    this.lineHandler('\n')

    // Render rows
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx]

      // Wrap cell contents
      const wrappedCells = row.map((cell, i) => this.wrapText(cell || '', colWidths[i] || 15))
      const maxLines = Math.max(...wrappedCells.map((c) => c.length))

      for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
        let line = this.useColor ? `${ANSI.dim}${box.v}${ANSI.reset}` : box.v

        for (let i = 0; i < colCount; i++) {
          const cellLines = wrappedCells[i] || ['']
          const cellText = cellLines[lineIdx] || ''
          const formattedCell = formatInline(cellText, this.useColor)
          const padding = ' '.repeat(Math.max(0, colWidths[i] - cellText.length))
          line += ` ${formattedCell}${padding} `
          line += this.useColor ? `${ANSI.dim}${box.v}${ANSI.reset}` : box.v
        }

        this.lineHandler(line)
        this.lineHandler('\n')
      }

      // Header separator (after first row)
      if (rowIdx === 0 && rows.length > 1) {
        let sep = this.useColor ? `${ANSI.dim}${box.lt}` : box.lt
        for (let i = 0; i < colCount; i++) {
          sep += box.h.repeat(colWidths[i] + 2)
          sep += i < colCount - 1 ? box.cross : box.rt
        }
        sep += this.useColor ? ANSI.reset : ''
        this.lineHandler(sep)
        this.lineHandler('\n')
      }
    }

    // Bottom border
    let bottomBorder = box.bl
    for (let i = 0; i < colCount; i++) {
      bottomBorder += box.h.repeat(colWidths[i] + 2)
      bottomBorder += i < colCount - 1 ? box.bt : box.br
    }
    this.lineHandler(this.useColor ? `${ANSI.dim}${bottomBorder}${ANSI.reset}` : bottomBorder)
  }

  /**
   * Render table as a formatted list (for wide tables)
   */
  renderTableAsList(rows) {
    if (rows.length === 0) return

    // First row is headers
    const headers = rows[0]
    const dataRows = rows.slice(1)

    for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
      const row = dataRows[rowIdx]

      // Row separator
      if (rowIdx > 0) {
        this.lineHandler(
          this.useColor ? `${ANSI.dim}${'─'.repeat(40)}${ANSI.reset}` : '─'.repeat(40),
        )
        this.lineHandler('\n')
      }

      // Row header (first column bold)
      if (row[0]) {
        const header = this.useColor ? `${ANSI.bold}${ANSI.cyan}${row[0]}${ANSI.reset}` : row[0]
        this.lineHandler(header)
        this.lineHandler('\n')
      }

      // Other columns as labeled entries
      for (let i = 1; i < row.length; i++) {
        if (row[i] && row[i].trim()) {
          const label = headers[i] || `Column ${i + 1}`
          const labelFormatted = this.useColor ? `${ANSI.dim}${label}:${ANSI.reset}` : `${label}:`
          this.lineHandler(`  ${labelFormatted} `)
          this.lineHandler(formatInline(row[i], this.useColor))
          this.lineHandler('\n')
        }
      }
    }
  }

  /**
   * Reset renderer state
   */
  reset() {
    this.buffer = ''
    this.inCodeBlock = false
    this.codeBlockLang = ''
    this.codeBlockContent = ''
    this.inTable = false
    this.tableRows = []
    this.emptyLineCount = 0
    // Note: We don't reset codeBlocks here - they persist for /run commands
  }

  /**
   * Get all captured runnable code blocks
   */
  getCodeBlocks() {
    return this.codeBlocks
  }

  /**
   * Get a specific code block by ID
   */
  getCodeBlock(id) {
    return this.codeBlocks[id] || null
  }

  /**
   * Clear all captured code blocks
   */
  clearCodeBlocks() {
    this.codeBlocks = []
  }
}

/**
 * JavaScript Code Runner
 * Safely executes JavaScript code and captures output
 */
class CodeRunner {
  constructor(options = {}) {
    this.timeout = options.timeout || 120
    this.useColor = options.useColor !== false
  }

  /**
   * Color helper
   */
  color(code, text) {
    if (!this.useColor) return text
    return `${code}${text}${ANSI.reset}`
  }

  /**
   * Run JavaScript code and return output
   */
  run(code, options = {}) {
    const output = []
    const startTime = Date.now()

    // Create sandboxed console
    const sandboxConsole = {
      log: (...args) => output.push({ type: 'log', args: args.map((v) => this.formatValue(v)) }),
      info: (...args) => output.push({ type: 'info', args: args.map((v) => this.formatValue(v)) }),
      warn: (...args) => output.push({ type: 'warn', args: args.map((v) => this.formatValue(v)) }),
      error: (...args) =>
        output.push({ type: 'error', args: args.map((v) => this.formatValue(v)) }),
      table: (data) => output.push({ type: 'log', args: [this.formatValue(data)] }),
      clear: () => {
        output.length = 0
      },
      time: () => {},
      timeEnd: () => {},
      trace: () => {},
      assert: (condition, ...args) => {
        if (!condition) {
          output.push({
            type: 'error',
            args: ['Assertion failed:', ...args.map((v) => this.formatValue(v))],
          })
        }
      },
    }

    try {
      // Create a sandboxed context
      const sandbox = {
        console: sandboxConsole,
        setTimeout: () => {
          throw new Error('setTimeout not allowed in sandbox')
        },
        setInterval: () => {
          throw new Error('setInterval not allowed in sandbox')
        },
        require: () => {
          throw new Error('require not allowed in sandbox')
        },
        process: { env: {} },
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Promise,
        Symbol,
        Error,
        TypeError,
        RangeError,
        SyntaxError,
        ReferenceError,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURI,
        decodeURI,
        encodeURIComponent,
        decodeURIComponent,
      }

      // Use vm module for sandboxed execution
      const vm = require('vm')
      const context = vm.createContext(sandbox)

      // Wrap code to capture return value
      const wrappedCode = `
                (function() {
                    ${code}
                })()
            `

      const result = vm.runInContext(wrappedCode, context, {
        timeout: this.timeout,
        displayErrors: true,
      })

      // Add return value to output if meaningful
      if (result !== undefined) {
        output.push({ type: 'result', args: ['→ ' + this.formatValue(result)] })
      }

      return {
        success: true,
        output,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      output.push({
        type: 'error',
        args: [`${error.name}: ${error.message}`],
      })

      return {
        success: false,
        output,
        error: error.message,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Format a value for display
   */
  formatValue(value) {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`
    if (value instanceof Error) return `${value.name}: ${value.message}`
    if (Array.isArray(value)) {
      if (value.length <= 10) {
        return '[' + value.map((v) => this.formatValue(v)).join(', ') + ']'
      }
      return `Array(${value.length}) [${value
        .slice(0, 5)
        .map((v) => this.formatValue(v))
        .join(', ')}, ...]`
    }
    if (typeof value === 'object') {
      try {
        const str = JSON.stringify(value, null, 2)
        if (str.length > 500) {
          return str.substring(0, 500) + '...'
        }
        return str
      } catch {
        return '[Object]'
      }
    }
    return String(value)
  }

  /**
   * Format output for terminal display
   */
  formatOutput(result) {
    const lines = []

    if (this.useColor) {
      lines.push(`${ANSI.dim}┌── Output ──${ANSI.reset}`)
    } else {
      lines.push('┌── Output ──')
    }

    if (result.output.length === 0) {
      if (this.useColor) {
        lines.push(`${ANSI.dim}│ ${ANSI.gray}(no output)${ANSI.reset}`)
      } else {
        lines.push('│ (no output)')
      }
    } else {
      for (const item of result.output) {
        let prefix = ''
        let color = ANSI.white

        switch (item.type) {
          case 'error':
            prefix = '✗ '
            color = ANSI.red
            break
          case 'warn':
            prefix = '⚠ '
            color = ANSI.yellow
            break
          case 'info':
            prefix = 'ℹ '
            color = ANSI.cyan
            break
          case 'result':
            color = ANSI.green
            break
          default:
            color = ANSI.white
        }

        const content = item.args.join(' ')
        if (this.useColor) {
          lines.push(`${ANSI.dim}│ ${color}${prefix}${content}${ANSI.reset}`)
        } else {
          lines.push(`│ ${prefix}${content}`)
        }
      }
    }

    // Duration
    if (this.useColor) {
      lines.push(`${ANSI.dim}└── ⏱ ${result.duration}ms ──${ANSI.reset}`)
    } else {
      lines.push(`└── ⏱ ${result.duration}ms ──`)
    }

    return lines.join('\n')
  }
}

/**
 * Simple one-shot markdown formatting
 * @param {string} text - Full markdown text
 * @param {boolean} useColor - Whether to use colors
 * @returns {string} Formatted text
 */
function formatMarkdown(text, useColor = true) {
  const lines = []
  const renderer = new MarkdownRenderer({
    useColor,
    onLine: (line) => lines.push(line),
  })

  renderer.write(text)
  renderer.flush()

  // Flush any remaining table
  if (renderer.tableRows.length > 0) {
    renderer.renderTable()
  }

  return lines.join('')
}

module.exports = {
  MarkdownRenderer,
  formatMarkdown,
  formatInline,
  CodeRunner,
  ANSI,
}
