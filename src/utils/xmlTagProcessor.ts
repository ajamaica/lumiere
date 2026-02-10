/**
 * Process XML-like tags (<thinking>, <final>) in AI response text.
 *
 * Behaviour:
 * - If one or more <final>...</final> blocks are present, return ONLY their
 *   concatenated inner content (separated by double newlines).
 * - If a <final> tag is open but not yet closed (streaming), return the text
 *   that has arrived after the opening tag so far.
 * - Otherwise, strip any <thinking>...</thinking> blocks (and an unclosed
 *   trailing <thinking> block that is still streaming) and return the rest.
 */
export function processXmlTags(text: string): string {
  // 1. Collect all closed <final> blocks
  const finalBlockRegex = /<final>([\s\S]*?)<\/final>/g
  const finalParts: string[] = []
  let m: RegExpExecArray | null
  while ((m = finalBlockRegex.exec(text)) !== null) {
    finalParts.push(m[1].trim())
  }

  if (finalParts.length > 0) {
    return finalParts.join('\n\n')
  }

  // 2. Unclosed <final> tag (still streaming the answer)
  const unclosedFinalIdx = text.lastIndexOf('<final>')
  if (unclosedFinalIdx !== -1) {
    return text.substring(unclosedFinalIdx + '<final>'.length).trim()
  }

  // 3. Strip closed <thinking> blocks
  let result = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '')

  // 4. Strip unclosed trailing <thinking> block (still streaming thinking)
  const unclosedThinkingIdx = result.lastIndexOf('<thinking>')
  if (unclosedThinkingIdx !== -1) {
    result = result.substring(0, unclosedThinkingIdx)
  }

  return result.trim()
}

/**
 * Returns true when the text contains XML tags that this module handles.
 * Useful to skip processing when no tags are present.
 */
export function hasXmlTags(text: string): boolean {
  return /<thinking>|<\/thinking>|<final>|<\/final>/.test(text)
}
