/**
 * Chat Handler
 *
 * Handles chat API endpoints including streaming and non-streaming chat.
 */

const { loggers, sendJson, readBody } = require('./utils')
const { truncateToolContent } = require('../shared')
const { processToolCalls } = require('../../tools')

const { http: logHttp, stream: logStream, tool: logTool, learn: logLearn } = loggers

/**
 * Creates chat route handlers
 * @param {Object} server - SentientServer instance
 * @returns {Object} Route handlers
 */
function createChatHandlers(server) {
  return {
    /**
     * Handle non-streaming chat
     */
    handleChat: async (req, res) => {
      try {
        const body = await readBody(req)
        const { message } = JSON.parse(body)

        if (!message) {
          sendJson(res, { error: 'Message required' }, 400)
          return
        }

        const timestamp = Date.now()
        server.observer.processText(message)
        server.addToHistory('user', message, { timestamp })

        // Record to senses
        if (server.senses) {
          server.senses.recordUserInput(message)
        }

        const historyMessages = server.conversationHistory.slice(0, -1).map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        }))

        // Get sense readings for injection
        let enhancedMessage = message
        if (server.senses) {
          const senseBlock = await server.senses.formatForPrompt()
          enhancedMessage = `${message}\n\n---\n${senseBlock}`
        }

        let response = ''
        const llmStart = Date.now()
        for await (const chunk of server.chat.streamChat(enhancedMessage, null, {
          conversationHistory: historyMessages,
        })) {
          if (typeof chunk === 'string') response += chunk
        }

        // Record LLM call to senses
        if (server.senses) {
          server.senses.recordLLMCall(Date.now() - llmStart)
          server.senses.recordResponse(response)
        }

        // Process tool calls and get cleaned response (without tool call XML)
        const { hasTools, results, cleanedResponse } = await processToolCalls(
          response,
          server.toolExecutor,
        )

        // Store the clean response in history (without tool call XML)
        server.addToHistory('assistant', cleanedResponse, { timestamp: Date.now() })

        // Format tool results for the response
        const toolResults = results.map((r) => ({
          tool: r.toolCall.tool,
          success: r.result.success,
          content: truncateToolContent(r.result.content || r.result.error || r.result.message),
        }))

        // Generate next-step suggestions
        let nextSteps = []
        if (server.nextStepGenerator) {
          const topics = server.learner?.curiosityEngine?.getConversationTopics() || []
          nextSteps = server.nextStepGenerator.generateSuggestions({
            userMessage: message,
            assistantResponse: cleanedResponse,
            conversationHistory: server.conversationHistory,
            topics,
            toolResults,
          })
          logHttp('Generated', nextSteps.length, 'next-step suggestions')
        }

        sendJson(res, {
          response: cleanedResponse,
          toolResults,
          hasTools,
          nextSteps,
          state: {
            coherence: server.observer.currentState.coherence,
            entropy: server.observer.currentState.entropy,
          },
        })
      } catch (error) {
        sendJson(res, { error: error.message }, 500)
      }
    },

    /**
     * Handle streaming chat
     */
    handleStreamingChat: async (req, res) => {
      try {
        const body = await readBody(req)
        const { message } = JSON.parse(body)

        if (!message) {
          sendJson(res, { error: 'Message required' }, 400)
          return
        }

        // Set up SSE response
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        })

        // Status tracking
        let toolIteration = 0
        let pendingToolCalls = null
        let chunkCount = 0
        let currentStatusMessage = 'Initializing...'

        const updateStatus = (msg) => {
          currentStatusMessage = msg
          try {
            res.write(
              `event: status\ndata: ${JSON.stringify({
                status: pendingToolCalls ? 'executing_tools' : 'generating',
                iteration: toolIteration,
                message: currentStatusMessage,
              })}\n\n`,
            )
          } catch (e) {}
        }

        updateStatus('Processing input...')

        const timestamp = Date.now()
        server.observer.processText(message)
        server.addToHistory('user', message, { timestamp })

        // Record to senses
        if (server.senses) {
          server.senses.recordUserInput(message)
        }

        // Record user message for learning topic extraction
        if (server.learner) {
          server.learner.recordText(message, { source: 'user_message' })
        }

        const historyMessages = server.conversationHistory.slice(0, -1).map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        }))

        // Get sense readings for injection
        let enhancedMessage = message
        if (server.senses) {
          updateStatus('Gathering sensory data...')
          const senseBlock = await server.senses.formatForPrompt()
          enhancedMessage = `${message}\n\n---\n${senseBlock}`
        }

        // Send initial thinking event
        res.write(`event: thinking\ndata: ${JSON.stringify({ status: 'starting' })}\n\n`)

        let fullResponse = ''
        // chunkCount initialized above
        // pendingToolCalls initialized above
        const llmStart = Date.now()
        const MAX_TOOL_ITERATIONS = 5

        console.log('[Stream] Starting stream for message:', message.substring(0, 50) + '...')

        // Build conversation messages for multi-turn tool use
        let conversationMessages = [...historyMessages]
        let currentUserMessage = enhancedMessage
        // toolIteration initialized above

        updateStatus('Connecting to neural network...')

        // Heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          const elapsed = Math.round((Date.now() - llmStart) / 1000)
          try {
            res.write(
              `event: heartbeat\ndata: ${JSON.stringify({
                elapsed,
                iteration: toolIteration,
                status: pendingToolCalls ? 'executing_tools' : 'generating',
                message: currentStatusMessage,
                chunks: chunkCount,
              })}\n\n`,
            )
          } catch (e) {
            clearInterval(heartbeatInterval)
          }
        }, 2000)

        try {
          // Loop to handle tool calls - LLM may need multiple rounds
          while (toolIteration < MAX_TOOL_ITERATIONS) {
            toolIteration++

            // Send iteration status
            updateStatus(
              toolIteration === 1
                ? 'Generating response...'
                : `Processing step ${toolIteration}...`,
            )

            let streamGenerator
            try {
              streamGenerator = server.chat.streamChat(currentUserMessage, null, {
                conversationHistory: conversationMessages,
              })
            } catch (streamInitError) {
              res.write(
                `event: error\ndata: ${JSON.stringify({
                  error: 'Failed to connect to LLM: ' + streamInitError.message,
                  recoverable: true,
                })}\n\n`,
              )
              break
            }

            let iterationResponse = ''
            pendingToolCalls = null

            try {
              for await (const chunk of streamGenerator) {
                if (typeof chunk === 'string') {
                  iterationResponse += chunk
                  fullResponse += chunk
                  chunkCount++

                  // Send chunk event
                  res.write(
                    `event: chunk\ndata: ${JSON.stringify({
                      content: chunk,
                      total: fullResponse.length,
                      chunkNum: chunkCount,
                      iteration: toolIteration,
                    })}\n\n`,
                  )
                } else if (chunk && typeof chunk === 'object' && chunk.type === 'tool_calls') {
                  pendingToolCalls = chunk.toolCalls

                  // Send tool call event to UI
                  res.write(
                    `event: tool_call\ndata: ${JSON.stringify({
                      toolCalls: chunk.toolCalls,
                      iteration: toolIteration,
                    })}\n\n`,
                  )
                }
              }
            } catch (chunkError) {
              res.write(
                `event: error\ndata: ${JSON.stringify({
                  error: 'Streaming error: ' + chunkError.message,
                  recoverable: true,
                  partial: iterationResponse.length > 0,
                })}\n\n`,
              )

              if (iterationResponse.length === 0) break
            }

            // If we have tool calls, execute them and continue
            if (pendingToolCalls && pendingToolCalls.length > 0) {
              const toolResults = []
              for (const toolCall of pendingToolCalls) {
                const toolName = toolCall.function?.name
                let toolArgs = {}

                try {
                  toolArgs = JSON.parse(toolCall.function?.arguments || '{}')
                } catch (e) {
                  logTool.error('Failed to parse tool args:', e.message)
                }

                logTool(`Executing: ${toolName}`, JSON.stringify(toolArgs).substring(0, 100))
                updateStatus(`Executing tool: ${toolName}...`)

                // Send tool execution event
                res.write(
                  `event: tool_exec\ndata: ${JSON.stringify({
                    tool: toolName,
                    status: 'executing',
                  })}\n\n`,
                )

                let result
                try {
                  result = await server.toolExecutor.execute({
                    tool: toolName,
                    ...toolArgs,
                  })
                } catch (toolError) {
                  logTool.error(`Tool ${toolName} failed:`, toolError.message)
                  result = { success: false, error: toolError.message }
                }

                // Send tool result event
                res.write(
                  `event: tool_result\ndata: ${JSON.stringify({
                    tool: toolName,
                    success: result.success,
                    content: truncateToolContent(
                      result.content || result.error || result.message || 'No output',
                    ),
                  })}\n\n`,
                )

                toolResults.push({
                  tool_call_id: toolCall.id,
                  role: 'tool',
                  content: JSON.stringify(
                    result.success
                      ? result.content || result.message || 'Success'
                      : result.error || 'Failed',
                  ),
                })
              }

              // Build messages for next iteration
              conversationMessages.push({
                role: 'assistant',
                content: iterationResponse || null,
                tool_calls: pendingToolCalls,
              })

              for (const tr of toolResults) {
                conversationMessages.push(tr)
              }

              currentUserMessage = ''
            } else {
              break
            }
          }
        } catch (streamError) {
          res.write(
            `event: error\ndata: ${JSON.stringify({
              error: streamError.message,
              recoverable: false,
            })}\n\n`,
          )
        } finally {
          clearInterval(heartbeatInterval)
        }

        // Record LLM call to senses
        if (server.senses) {
          server.senses.recordLLMCall(Date.now() - llmStart)
          server.senses.recordResponse(fullResponse)
        }

        // Process any remaining tool calls in the text response (XML-based)
        updateStatus('Processing response...')
        const { hasTools, results, cleanedResponse } = await processToolCalls(
          fullResponse,
          server.toolExecutor,
        )

        // Store the clean response in history
        const finalResponseText = cleanedResponse || fullResponse
        if (finalResponseText && finalResponseText.trim()) {
          server.addToHistory('assistant', finalResponseText, { timestamp: Date.now() })
        } else {
          logStream('Skipping empty response for history')
        }

        // Record the complete exchange for learning topic extraction
        if (server.learner) {
          updateStatus('Learning from conversation...')
          server.learner.recordConversation({
            user: message,
            assistant: cleanedResponse || fullResponse,
          })
          logLearn('Recorded conversation exchange for topic learning')

          // Broadcast topic update to learning SSE clients
          if (
            server.learner.curiosityEngine &&
            server.learningSSEClients &&
            server.learningSSEClients.size > 0
          ) {
            const topics = server.learner.curiosityEngine.getConversationTopics()
            const curiosityQueue = server.learner.curiosityEngine.getCuriosityQueue(10)

            // Send topic update event to all learning stream clients
            const topicEvent = JSON.stringify({
              topics,
              curiosityQueue,
              source: 'conversation',
              timestamp: Date.now(),
            })

            for (const client of server.learningSSEClients) {
              try {
                client.write(`event: topics\ndata: ${topicEvent}\n\n`)
              } catch (e) {
                // Client disconnected
              }
            }
            logLearn('Broadcast topic update to', server.learningSSEClients.size, 'clients')
          }
        }

        // Format tool results for the response
        const toolResults = results.map((r) => ({
          tool: r.toolCall.tool,
          success: r.result.success,
          content: truncateToolContent(r.result.content || r.result.error || r.result.message),
        }))

        // Generate next-step suggestions
        let nextSteps = []
        if (server.nextStepGenerator) {
          updateStatus('Generating next steps...')
          const topics = server.learner?.curiosityEngine?.getConversationTopics() || []
          nextSteps = server.nextStepGenerator.generateSuggestions({
            userMessage: message,
            assistantResponse: cleanedResponse || fullResponse,
            conversationHistory: server.conversationHistory,
            topics,
            toolResults,
          })
          logStream('Generated', nextSteps.length, 'next-step suggestions')
        }

        // Send next-step suggestions as separate event before complete
        if (nextSteps.length > 0) {
          res.write(
            `event: next_steps\ndata: ${JSON.stringify({
              suggestions: nextSteps,
              count: nextSteps.length,
            })}\n\n`,
          )
        }

        updateStatus('Complete')

        // Send complete event with final data
        res.write(
          `event: complete\ndata: ${JSON.stringify({
            response: cleanedResponse || fullResponse,
            toolResults,
            hasTools,
            nextSteps,
            state: {
              coherence: server.observer.currentState.coherence,
              entropy: server.observer.currentState.entropy,
            },
          })}\n\n`,
        )

        res.end()
      } catch (error) {
        try {
          res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`)
          res.end()
        } catch (e) {
          // Connection already closed
        }
      }
    },
  }
}

module.exports = { createChatHandlers }
