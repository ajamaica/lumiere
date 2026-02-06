/**
 * MCP tools as LangChain tools: run_prediction, run_backtest, link_bank_account,
 * get_agent_reputation_score, get_borrower_score, get_agent_reputation_score_by_email, get_borrower_score_by_email.
 * Each invokes mcpClient.callTool(name, args) with x402 retry inside the client.
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * @param {{ callTool: (name: string, args: Object) => Promise<Object> }} mcpClient - from createMcpClient()
 * @returns {import('@langchain/core/tools').StructuredToolInterface[]}
 */
export function createMcpTools(mcpClient) {
  const run_prediction = tool(
    async ({ symbol, horizon }) => {
      console.log(`Calling run_prediction: symbol=${symbol}, horizon=${horizon}`)
      const out = await mcpClient.callTool('run_prediction', {
        symbol: symbol || 'AAPL',
        horizon: horizon ?? 30,
      })
      console.log('MCP response:', JSON.stringify(out, null, 2))
      return typeof out?.result === 'object' ? JSON.stringify(out.result) : JSON.stringify(out)
    },
    {
      name: 'run_prediction',
      description:
        'Run stock prediction for a ticker. Returns prediction result. x402: pay with Aptos or EVM (server offers both).',
      schema: z.object({
        symbol: z.string().describe('Stock symbol (e.g. AAPL)'),
        horizon: z.number().default(30).describe('Prediction horizon in days'),
      }),
    },
  )

  const run_backtest = tool(
    async ({ symbol, startDate, endDate, strategy }) => {
      const out = await mcpClient.callTool('run_backtest', {
        symbol: symbol || 'AAPL',
        startDate: startDate || '',
        endDate: endDate || '',
        strategy: strategy || 'chronos',
      })
      return typeof out?.result === 'object' ? JSON.stringify(out.result) : JSON.stringify(out)
    },
    {
      name: 'run_backtest',
      description: 'Run backtest for a trading strategy on a symbol. x402: pay with Aptos or EVM.',
      schema: z.object({
        symbol: z.string().describe('Stock symbol'),
        startDate: z.string().nullable().default(null).describe('Start date YYYY-MM-DD'),
        endDate: z.string().nullable().default(null).describe('End date YYYY-MM-DD'),
        strategy: z.string().default('chronos').describe('Strategy name'),
      }),
    },
  )

  const link_bank_account = tool(
    async () => {
      const out = await mcpClient.callTool('link_bank_account', {})
      return typeof out?.result === 'object' ? JSON.stringify(out.result) : JSON.stringify(out)
    },
    {
      name: 'link_bank_account',
      description:
        'Start bank linking flow (Plaid link). x402: pay with Aptos or EVM (e.g. Base Sepolia). Returns link_token or account id.',
      schema: z.object({}),
    },
  )

  const get_agent_reputation_score = tool(
    async ({ agent_address, payer_wallet }) => {
      const out = await mcpClient.callTool('get_agent_reputation_score', {
        agent_address: agent_address || undefined,
        payer_wallet: payer_wallet || undefined,
      })
      return typeof out?.result === 'object' ? JSON.stringify(out.result) : JSON.stringify(out)
    },
    {
      name: 'get_agent_reputation_score',
      description:
        'Get agent reputation score for an allowlisted wallet. Returns 200 with reputation_score (e.g. 100) or 403. x402 or lender credits.',
      schema: z.object({
        agent_address: z.string().optional().describe('Wallet to query (allowlisted agent)'),
        payer_wallet: z
          .string()
          .optional()
          .describe('When using lender credits, your registered paying wallet'),
      }),
    },
  )

  const get_borrower_score = tool(
    async ({ agent_address, payer_wallet }) => {
      const out = await mcpClient.callTool('get_borrower_score', {
        agent_address: agent_address || undefined,
        payer_wallet: payer_wallet || undefined,
      })
      return typeof out?.result === 'object' ? JSON.stringify(out.result) : JSON.stringify(out)
    },
    {
      name: 'get_borrower_score',
      description:
        'Get borrower score for an allowlisted agent. Returns 200 with score (100 or 100+X when bank linked). x402 or lender credits.',
      schema: z.object({
        agent_address: z.string().optional().describe('Agent wallet to get score for'),
        payer_wallet: z
          .string()
          .optional()
          .describe('When using lender credits, your registered paying wallet'),
      }),
    },
  )

  const get_agent_reputation_score_by_email = tool(
    async ({ email, payer_wallet }) => {
      const out = await mcpClient.callTool('get_agent_reputation_score_by_email', {
        email: email || undefined,
        payer_wallet: payer_wallet || undefined,
      })
      return typeof out?.result === 'object' ? JSON.stringify(out.result) : JSON.stringify(out)
    },
    {
      name: 'get_agent_reputation_score_by_email',
      description:
        'Get agent reputation score by email (resolves to allowlisted agent). Higher fee. Requires SCORE_BY_EMAIL_ENABLED. x402 or lender credits.',
      schema: z.object({
        email: z.string().describe('Email to resolve to an allowlisted agent'),
        payer_wallet: z
          .string()
          .optional()
          .describe('When using lender credits, your registered paying wallet'),
      }),
    },
  )

  const get_borrower_score_by_email = tool(
    async ({ email, payer_wallet }) => {
      const out = await mcpClient.callTool('get_borrower_score_by_email', {
        email: email || undefined,
        payer_wallet: payer_wallet || undefined,
      })
      return typeof out?.result === 'object' ? JSON.stringify(out.result) : JSON.stringify(out)
    },
    {
      name: 'get_borrower_score_by_email',
      description:
        'Get borrower score by email (resolves to allowlisted agent). Higher fee. Requires SCORE_BY_EMAIL_ENABLED. x402 or lender credits.',
      schema: z.object({
        email: z.string().describe('Email to resolve to an allowlisted agent'),
        payer_wallet: z
          .string()
          .optional()
          .describe('When using lender credits, your registered paying wallet'),
      }),
    },
  )

  return [
    run_prediction,
    run_backtest,
    link_bank_account,
    get_agent_reputation_score,
    get_borrower_score,
    get_agent_reputation_score_by_email,
    get_borrower_score_by_email,
  ]
}
