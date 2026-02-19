import React, { useMemo } from 'react'
import { ScrollView, Text, TextStyle, View } from 'react-native'
import { Highlight, themes } from 'prism-react-renderer'

import { useTheme } from '../../theme'
import { createCodeBlockStyles } from './ChatMessage.styles'

/** Map common short aliases to Prism-compatible language identifiers */
const languageAliases: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  html: 'markup',
  css: 'css',
  scss: 'scss',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'markup',
  sql: 'sql',
  md: 'markdown',
  markdown: 'markdown',
  php: 'php',
  dart: 'dart',
  r: 'r',
  lua: 'lua',
  dockerfile: 'docker',
  graphql: 'graphql',
  diff: 'diff',
}

function resolvePrismLanguage(lang?: string): string {
  if (!lang) return 'plain'
  const key = lang.trim().toLowerCase()
  return languageAliases[key] || key
}

interface SyntaxHighlightedCodeProps {
  code: string
  language?: string
  showLineNumbers?: boolean
}

export function SyntaxHighlightedCode({
  code,
  language,
  showLineNumbers = true,
}: SyntaxHighlightedCodeProps) {
  const { theme } = useTheme()
  const codeStyles = useMemo(() => createCodeBlockStyles(theme), [theme])
  const prismTheme = theme.isDark ? themes.oneDark : themes.oneLight
  const prismLanguage = resolvePrismLanguage(language)

  const lineCount = code.split('\n').length
  const gutterWidth = lineCount >= 100 ? 36 : lineCount >= 10 ? 28 : 20

  const baseTextStyle: TextStyle = {
    fontFamily: theme.typography.fontFamily.monospace,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  }

  return (
    <Highlight theme={prismTheme} code={code} language={prismLanguage}>
      {({ tokens }) => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={codeStyles.codeBlockScrollView}>
          <View style={codeStyles.codeContent}>
            {tokens.map((line, lineIndex) => (
              <View key={lineIndex} style={codeStyles.codeLine}>
                {showLineNumbers && (
                  <Text
                    style={[
                      baseTextStyle,
                      codeStyles.lineNumber,
                      { width: gutterWidth },
                    ]}
                    selectable={false}
                  >
                    {lineIndex + 1}
                  </Text>
                )}
                <Text style={baseTextStyle} selectable={true}>
                  {line.map((token, tokenIndex) => (
                    <Text
                      key={tokenIndex}
                      style={token.empty ? undefined : { color: getTokenColor(token.types, prismTheme) }}
                    >
                      {token.content}
                    </Text>
                  ))}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </Highlight>
  )
}

/** Resolve the color for a token by matching its types against the Prism theme styles. */
function getTokenColor(
  types: string[],
  prismTheme: { plain: { color?: string }; styles: Array<{ types: string[]; style: { color?: string } }> },
): string | undefined {
  // Walk theme styles in reverse so later (more specific) entries win
  for (let i = prismTheme.styles.length - 1; i >= 0; i--) {
    const entry = prismTheme.styles[i]
    if (types.some((t) => entry.types.includes(t))) {
      return entry.style.color
    }
  }
  return prismTheme.plain.color
}
