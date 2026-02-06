import type { LingzhuContext, LingzhuMessage, LingzhuSSEData } from './types.js'

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | { type: string; image_url?: { url: string } }[]
}

interface OpenAIToolCall {
  id?: string
  type?: string
  function?: {
    name: string
    arguments: string
  }
}

interface OpenAIChunk {
  choices?: Array<{
    delta?: {
      content?: string
      tool_calls?: OpenAIToolCall[]
    }
    finish_reason?: string | null
  }>
}

/**
 * 灵珠设备命令映射表
 * 将 OpenClaw 工具名称映射到灵珠设备命令
 */
const TOOL_COMMAND_MAP: Record<string, string> = {
  // 拍照相关
  take_photo: 'take_photo',
  camera: 'take_photo',
  photo: 'take_photo',

  // 导航相关
  navigate: 'take_navigation',
  navigation: 'take_navigation',
  take_navigation: 'take_navigation',
  maps: 'take_navigation',

  // 日程相关
  calendar: 'control_calendar',
  add_calendar: 'control_calendar',
  control_calendar: 'control_calendar',
  schedule: 'control_calendar',
  reminder: 'control_calendar',

  // 退出智能体
  exit: 'notify_agent_off',
  quit: 'notify_agent_off',
  notify_agent_off: 'notify_agent_off',
}

/**
 * 将灵珠消息格式转换为 OpenAI messages 格式
 */
export function lingzhuToOpenAI(
  messages: LingzhuMessage[],
  context?: LingzhuContext,
): OpenAIMessage[] {
  const openaiMessages: OpenAIMessage[] = []

  // 如果有设备上下文信息，添加为 system 消息
  if (context) {
    const parts: string[] = []
    if (context.location) parts.push(`位置: ${context.location}`)
    if (context.weather) parts.push(`天气: ${context.weather}`)
    if (context.battery) parts.push(`电量: ${context.battery}`)
    if (context.latitude && context.longitude) {
      parts.push(`坐标: ${context.latitude}, ${context.longitude}`)
    }

    if (parts.length > 0) {
      openaiMessages.push({
        role: 'system',
        content: `[设备信息] ${parts.join(', ')}`,
      })
    }
  }

  // 转换消息
  for (const msg of messages) {
    const role = msg.role === 'agent' ? 'assistant' : 'user'

    if (msg.type === 'text' && msg.text) {
      openaiMessages.push({ role, content: msg.text })
    } else if (msg.type === 'image' && msg.image_url) {
      openaiMessages.push({
        role,
        content: [{ type: 'image_url', image_url: { url: msg.image_url } }],
      })
    }
  }

  return openaiMessages
}

/**
 * 解析工具调用参数并转换为灵珠 tool_call 格式
 */
function parseToolCall(toolName: string, argsStr: string): LingzhuSSEData['tool_call'] | null {
  const command = TOOL_COMMAND_MAP[toolName.toLowerCase()]
  if (!command) {
    return null
  }

  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(argsStr || '{}')
  } catch {
    args = {}
  }

  const toolCall: NonNullable<LingzhuSSEData['tool_call']> = {
    command: command as 'take_photo' | 'take_navigation' | 'notify_agent_off' | 'control_calendar',
  }

  // 根据命令类型填充参数
  switch (command) {
    case 'take_navigation':
      toolCall.action = (args.action as string) || 'open'
      if (args.destination || args.poi_name || args.address) {
        toolCall.poi_name = (args.destination || args.poi_name || args.address) as string
      }
      if (args.navi_type || args.type) {
        toolCall.navi_type = String(args.navi_type ?? args.type ?? '0')
      }
      break

    case 'control_calendar':
      toolCall.action = (args.action as string) || 'create'
      if (args.title) toolCall.title = args.title as string
      if (args.start_time || args.startTime) {
        toolCall.start_time = (args.start_time || args.startTime) as string
      }
      if (args.end_time || args.endTime) {
        toolCall.end_time = (args.end_time || args.endTime) as string
      }
      break
  }

  return toolCall
}

/**
 * 将 OpenAI SSE chunk 转换为灵珠 SSE 格式
 */
export function openaiChunkToLingzhu(
  chunk: OpenAIChunk,
  messageId: string,
  agentId: string,
): LingzhuSSEData {
  const choice = chunk.choices?.[0]
  const delta = choice?.delta
  const content = delta?.content || ''
  const isFinish = choice?.finish_reason != null
  const toolCalls = delta?.tool_calls

  // 检查是否有工具调用
  if (toolCalls && toolCalls.length > 0) {
    const tc = toolCalls[0]
    if (tc.function?.name) {
      const parsedToolCall = parseToolCall(tc.function.name, tc.function.arguments || '{}')

      if (parsedToolCall) {
        return {
          role: 'agent',
          type: 'tool_call',
          message_id: messageId,
          agent_id: agentId,
          is_finish: isFinish,
          tool_call: parsedToolCall,
        }
      }
    }
  }

  // 普通文本回答
  return {
    role: 'agent',
    type: 'answer',
    answer_stream: content,
    message_id: messageId,
    agent_id: agentId,
    is_finish: isFinish,
  }
}

/**
 * 创建 follow_up 类型的响应
 */
export function createFollowUpResponse(
  suggestions: string[],
  messageId: string,
  agentId: string,
): LingzhuSSEData {
  return {
    role: 'agent',
    type: 'follow_up',
    message_id: messageId,
    agent_id: agentId,
    is_finish: true,
    follow_up: suggestions,
  }
}

/**
 * 从文本中提取 follow_up 建议
 * 检测类似 "你还可以问我：1. xxx 2. xxx" 的模式
 */
export function extractFollowUpFromText(text: string): string[] | null {
  // 匹配常见的建议问题模式
  const patterns = [
    /你(?:还)?可以(?:问我|尝试|试试)[：:]\s*(.+)/,
    /(?:推荐|建议)(?:问题|提问)[：:]\s*(.+)/,
    /(?:相关|更多)问题[：:]\s*(.+)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const suggestions = match[1]
        .split(/[,，;；\n]|(?:\d+[.、)])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 100)

      if (suggestions.length > 0) {
        return suggestions
      }
    }
  }

  return null
}

/**
 * 构造灵珠 SSE 事件字符串
 */
export function formatLingzhuSSE(event: 'message' | 'done', data: LingzhuSSEData | string): string {
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data)
  return `event:${event}\ndata:${dataStr}\n\n`
}
