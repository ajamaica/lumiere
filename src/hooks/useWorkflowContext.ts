import { useAtom } from 'jotai'
import { useCallback } from 'react'

import { buildWorkflowContext, formatWorkflowContextPrefix } from '../services/workflow'
import { currentSessionKeyAtom, workflowConfigAtom } from '../store'
import { logger } from '../utils/logger'

const workflowLogger = logger.create('WorkflowContext')

/**
 * Hook that provides workflow context injection for the current session.
 *
 * When workflow mode is enabled and files are loaded, `prependContext`
 * reads the indexed documents and prepends their content to the user's message.
 */
export function useWorkflowContext() {
  const [currentSessionKey] = useAtom(currentSessionKeyAtom)
  const [workflowConfigs] = useAtom(workflowConfigAtom)

  const config = workflowConfigs[currentSessionKey]
  const isActive = config?.enabled && config.files.length > 0

  /**
   * Prepend workflow document context to a user message.
   * If workflow mode is not active, returns the message unchanged.
   */
  const prependContext = useCallback(
    async (message: string): Promise<string> => {
      if (!isActive || !config) return message

      try {
        const fileContexts = await buildWorkflowContext(config.files)
        if (fileContexts.length === 0) return message

        const prefix = formatWorkflowContextPrefix(fileContexts)
        workflowLogger.info(
          `Injected ${fileContexts.length} document(s) as context (${prefix.length} chars)`,
        )
        return prefix + message
      } catch (err) {
        workflowLogger.logError('Failed to build workflow context', err)
        return message
      }
    },
    [isActive, config],
  )

  return {
    isActive,
    fileCount: config?.files.length ?? 0,
    prependContext,
  }
}
