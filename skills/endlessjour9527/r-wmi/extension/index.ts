import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { registerLingzhuCli } from './src/cli.js'
import { generateAuthAk, lingzhuConfigSchema, resolveLingzhuConfig } from './src/config.js'
import { createHttpHandler } from './src/http-handler.js'
import type { LingzhuConfig } from './src/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AK_FILE = path.join(__dirname, '../.lingzhu.ak') // 存储在插件根目录

// 插件状态
let pluginConfig: LingzhuConfig = {}
let activeAuthAk = ''
let gatewayPort = 18789

/**
 * 灵珠平台接入插件
 */
const lingzhuPlugin = {
  id: 'lingzhu',
  name: 'Lingzhu Bridge',
  description: '灵珠平台 <-> OpenClaw 协议转换桥梁',
  configSchema: lingzhuConfigSchema,

  register(api: any) {
    const logger = api.logger

    // 获取并解析配置
    const rawConfig = api.config?.plugins?.entries?.lingzhu?.config
    pluginConfig = resolveLingzhuConfig(rawConfig)

    // 生成或使用已有 AK
    if (pluginConfig.authAk) {
      activeAuthAk = pluginConfig.authAk
    } else {
      // 尝试从本地文件读取
      if (fs.existsSync(AK_FILE)) {
        try {
          activeAuthAk = fs.readFileSync(AK_FILE, 'utf-8').trim()
          logger.info(`[Lingzhu] 已从本地记录加载 AK: ${activeAuthAk}`)
        } catch (e) {
          logger.warn(`[Lingzhu] 读取本地 AK 文件失败: ${e}`)
        }
      }

      // 如果还是没有，则生成并保存
      if (!activeAuthAk) {
        activeAuthAk = generateAuthAk()
        try {
          fs.writeFileSync(AK_FILE, activeAuthAk, 'utf-8')
          logger.info(`[Lingzhu] 自动生成并持久化 AK: ${activeAuthAk}`)
        } catch (e) {
          logger.warn(`[Lingzhu] 持久化 AK 文件失败: ${e}`)
        }
      }
    }

    // 获取 Gateway 端口
    gatewayPort = api.config?.gateway?.port ?? 18789

    // 配置获取函数
    const getConfig = () => pluginConfig
    const getState = () => ({
      config: pluginConfig,
      authAk: activeAuthAk,
      gatewayPort,
    })

    // 1. 注册 HTTP 路由
    if (typeof api.registerHttpHandler === 'function') {
      api.registerHttpHandler(createHttpHandler(api, getConfig))
      logger.info('[Lingzhu] 已注册 HTTP 端点: POST /metis/agent/api/sse')
    }

    // 2. 注册 CLI 命令
    if (typeof api.registerCli === 'function') {
      api.registerCli((ctx: any) => registerLingzhuCli(ctx, getState), { commands: ['lingzhu'] })
    }

    // 3. 注册后台服务
    if (typeof api.registerService === 'function') {
      api.registerService({
        id: 'lingzhu-bridge',
        start: () => {
          if (pluginConfig.enabled === false) {
            logger.info('[Lingzhu] 插件已禁用')
            return
          }

          const url = `http://127.0.0.1:${gatewayPort}/metis/agent/api/sse`

          console.log('')
          console.log('╔═══════════════════════════════════════════════════════════════════════╗')
          console.log('║                    Lingzhu Bridge 已启动                              ║')
          console.log('╠═══════════════════════════════════════════════════════════════════════╣')
          console.log(`║  SSE 接口:  ${url.padEnd(56)}║`)
          console.log(`║  鉴权 AK:   ${activeAuthAk.padEnd(56)}║`)
          console.log('╚═══════════════════════════════════════════════════════════════════════╝')
          console.log('')

          logger.info(`[Lingzhu] Bridge 已启动，端点: ${url}`)
        },
        stop: () => {
          logger.info('[Lingzhu] Bridge 已停止')
        },
      })
    }
  },
}

export default lingzhuPlugin
