import type { LingzhuConfig } from './types.js'

const DEFAULT_CONFIG: Required<LingzhuConfig> = {
  enabled: true,
  authAk: '',
  agentId: 'main',
}

/**
 * 解析并验证灵珠插件配置
 */
export function resolveLingzhuConfig(raw: unknown): LingzhuConfig {
  const cfg = (raw ?? {}) as Partial<LingzhuConfig>
  return {
    enabled: cfg.enabled ?? DEFAULT_CONFIG.enabled,
    authAk: cfg.authAk ?? DEFAULT_CONFIG.authAk,
    agentId: cfg.agentId ?? DEFAULT_CONFIG.agentId,
  }
}

/**
 * 生成随机 AK (首次启动时使用)
 */
export function generateAuthAk(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const segments = [8, 4, 4, 4, 12]
  return segments
    .map((len) =>
      Array.from({ length: len }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join(''),
    )
    .join('-')
}

/**
 * 配置 schema 导出 (用于插件注册)
 */
export const lingzhuConfigSchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' as const },
    authAk: { type: 'string' as const },
    agentId: { type: 'string' as const },
  },
  parse(value: unknown): LingzhuConfig {
    return resolveLingzhuConfig(value)
  },
  uiHints: {
    enabled: { label: '启用灵珠接入' },
    authAk: {
      label: '鉴权密钥 (AK)',
      sensitive: true,
      help: '灵珠平台调用时携带的 Bearer Token，留空则自动生成',
    },
    agentId: {
      label: '智能体 ID',
      help: '使用的 OpenClaw 智能体 ID，默认 main',
    },
  },
}
