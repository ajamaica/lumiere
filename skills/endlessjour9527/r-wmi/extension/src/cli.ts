import type { Command } from 'commander'

import type { LingzhuConfig } from './types.js'

interface CliContext {
  program: Command
}

interface LingzhuState {
  config: LingzhuConfig
  authAk: string
  gatewayPort: number
}

/**
 * 注册 CLI 命令
 */
export function registerLingzhuCli(ctx: CliContext, getState: () => LingzhuState) {
  const { program } = ctx

  const lingzhuCmd = program.command('lingzhu').description('灵珠平台接入管理')

  // openclaw lingzhu info
  lingzhuCmd
    .command('info')
    .description('显示灵珠接入信息')
    .action(() => {
      const state = getState()
      const url = `http://127.0.0.1:${state.gatewayPort}/lingzhu/agent`

      console.log('')
      console.log('╔═══════════════════════════════════════════════════════════╗')
      console.log('║           灵珠平台接入信息                                 ║')
      console.log('╠═══════════════════════════════════════════════════════════╣')
      console.log(`║  SSE 接口:   ${url.padEnd(45)}║`)
      console.log(`║  鉴权 AK:    ${state.authAk.padEnd(45)}║`)
      console.log(`║  智能体 ID:  ${(state.config.agentId || 'main').padEnd(45)}║`)
      console.log(
        `║  状态:       ${(state.config.enabled !== false ? '已启用 ✓' : '已禁用 ✗').padEnd(45)}║`,
      )
      console.log('╚═══════════════════════════════════════════════════════════╝')
      console.log('')
      console.log('提交给灵珠平台:')
      console.log(`  • 智能体SSE接口地址: ${url}`)
      console.log(`  • 智能体鉴权AK: ${state.authAk}`)
      console.log('')
    })

  // openclaw lingzhu status
  lingzhuCmd
    .command('status')
    .description('检查灵珠接入状态')
    .action(() => {
      const state = getState()
      if (state.config.enabled !== false) {
        console.log('✓ 灵珠接入已启用')
      } else {
        console.log('✗ 灵珠接入已禁用')
      }
    })

  return lingzhuCmd
}
