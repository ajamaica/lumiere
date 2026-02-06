/**
 * LangChain.js ReAct agent: MCP tools + local tools, Hugging Face LLM.
 */

import { createReactAgent } from '@langchain/langgraph/prebuilt'

import { createLLM } from './llm.js'
import { createLocalTools } from './tools/localTools.js'
import { createMcpTools } from './tools/mcpTools.js'

const SYSTEM_MESSAGE = `You are an autonomous agent that can create, fund, and use your own Aptos and EVM wallets (optionally testnet or mainnet), then run stock predictions, backtests, and link bank accounts via paid MCP tools.

Before trying any paid or wallet-dependent action: use get_wallet_addresses to see which wallets are configured. It returns lists: aptos: [{ address, network? }, ...], evm: [{ address, network? }, ...]. You can have multiple Aptos and multiple EVM wallets (e.g. one testnet and one mainnet each). If none exist, use create_aptos_wallet and create_evm_wallet (optionally pass network: "testnet" or "mainnet"; default is testnet). Use force: true to add another wallet when one already exists. Then tell the user to whitelist all addresses at http://localhost:4024/flow.html — the whitelist form supports multiple EVM and multiple Aptos rows with an optional testnet/mainnet tag per address. Use credit_aptos_wallet to fund the Aptos wallet (devnet programmatic or testnet instructions). Use fund_evm_wallet to get funding instructions for the EVM wallet.

When the user asks to create or produce wallets: use create_aptos_wallet and create_evm_wallet (with network if they want testnet or mainnet), then credit_aptos_wallet and fund_evm_wallet for instructions, and remind the user to whitelist every address at http://localhost:4024/flow.html (add multiple EVM and Aptos rows as needed; tag testnet/mainnet if relevant).

Use run_prediction for stock predictions (symbol, horizon in days). Use run_backtest for backtesting a strategy.
Use link_bank_account to start the bank linking flow.
Use get_agent_reputation_score and get_borrower_score to query scores for allowlisted wallets; use get_agent_reputation_score_by_email and get_borrower_score_by_email when you have an email (requires SCORE_BY_EMAIL_ENABLED on server). Score tools can be paid via x402 or lender credits (payer_wallet).
Use balance_aptos and balance_evm to check wallet balances.
When you need to pay for a tool (402), the payment is handled automatically; just call the tool.`

/**
 * Create agent graph: llm + tools (MCP + local).
 * @param {{ llm?: import('@langchain/core/language_models/chat_models').BaseChatModel; tools?: import('@langchain/core/tools').StructuredToolInterface[] }} options - llm and tools (if omitted, created from env and mcpClient)
 * @param {{ callTool: (name: string, args: Object) => Promise<Object> }} [options.mcpClient] - required if tools not provided
 * @returns {Promise<{ agent: import('@langchain/langgraph').CompiledStateGraph; runAgent: (message: string) => Promise<Object> }>}
 */
export async function createAgent(options = {}) {
  const llm = options.llm || createLLM()
  let tools = options.tools
  if (!tools && options.mcpClient) {
    tools = [...createMcpTools(options.mcpClient), ...createLocalTools()]
  }
  if (!tools) {
    throw new Error('Provide options.tools or options.mcpClient to createAgent.')
  }

  const agent = createReactAgent({
    llm,
    tools,
    stateModifier: (state) => [
      { role: 'system', content: SYSTEM_MESSAGE },
      ...(state.messages || []),
    ],
  })

  async function runAgent(userMessage) {
    const result = await agent.invoke(
      { messages: [{ role: 'user', content: userMessage }] },
      { recursionLimit: 50 },
    )
    return result
  }

  return { agent, runAgent }
}
