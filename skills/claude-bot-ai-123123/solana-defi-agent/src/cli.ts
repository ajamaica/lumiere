#!/usr/bin/env node
/**
 * Solana Blinks CLI
 * AI-agent ready CLI for Solana Actions
 *
 * Uses direct protocol action endpoints per the Solana Actions specification:
 * - GET to action URL → metadata + available actions
 * - POST with account → transaction to sign
 */

import { Command } from 'commander'
import { config } from 'dotenv'

config()

import { ActionsClient, PROTOCOL_ACTIONS, TRUSTED_HOSTS } from './lib/actions.js'
import { BlinksExecutor } from './lib/blinks.js'
import { checkConnection, getConnection } from './lib/connection.js'
import { TOKENS } from './lib/endpoints.js'
import { error, formatOutput, formatPercent, formatUsd, info, success } from './lib/output.js'
import { createProtocolHandlers, PROTOCOL_ACTION_ENDPOINTS, PROTOCOLS } from './lib/protocols.js'
import { getWalletBalance, getWalletTokenBalances, Wallet } from './lib/wallet.js'
import type { MarketType, OutputFormat, ProtocolId } from './types/index.js'

const program = new Command()

// ============================================
// Global Options
// ============================================

program
  .name('blinks')
  .description('Solana Blinks CLI - Direct Solana Actions Integration')
  .version('2.0.0')
  .option('-f, --format <format>', 'Output format: json, table, minimal', 'json')
  .option('-r, --rpc <url>', 'Solana RPC URL')
  .option('-q, --quiet', 'Minimal output')
  .hook('preAction', () => {
    const opts = program.opts()
    if (opts.rpc) {
      process.env.SOLANA_RPC_URL = opts.rpc
    }
  })

function getFormat(): OutputFormat {
  const opts = program.opts()
  if (opts.quiet) return 'minimal'
  return (opts.format as OutputFormat) || 'json'
}

// ============================================
// Wallet Commands
// ============================================

const walletCmd = program.command('wallet').description('Wallet operations')

walletCmd
  .command('address')
  .description('Show configured wallet address')
  .action(() => {
    try {
      const wallet = Wallet.fromEnv()
      console.log(formatOutput({ address: wallet.address }, getFormat()))
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

walletCmd
  .command('balance')
  .description('Show wallet balances')
  .option('-w, --wallet <address>', 'Wallet address (defaults to configured)')
  .action(async (opts) => {
    try {
      const connection = getConnection()

      if (opts.wallet) {
        const balances = await getWalletTokenBalances(connection, opts.wallet)
        console.log(formatOutput(balances, getFormat()))
      } else {
        const wallet = Wallet.fromEnv()
        const balances = await wallet.getAllBalances(connection)
        console.log(formatOutput(balances, getFormat()))
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

// ============================================
// Portfolio Command
// ============================================

program
  .command('portfolio')
  .description('Show full portfolio - tokens, DeFi positions, staking')
  .option('-w, --wallet <address>', 'Wallet address (defaults to configured)')
  .action(async (opts) => {
    try {
      const connection = getConnection()
      let walletAddress: string

      if (opts.wallet) {
        walletAddress = opts.wallet
      } else {
        const wallet = Wallet.fromEnv()
        walletAddress = wallet.address
      }

      info(`Fetching portfolio for ${walletAddress}...`)

      // 1. Get token balances
      const balances = await getWalletTokenBalances(connection, walletAddress)

      // 2. Check for LST tokens (staking positions)
      const LST_MINTS: Record<string, string> = {
        J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: 'JitoSOL',
        mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: 'mSOL',
        bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1: 'bSOL',
        he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A: 'hSOL',
        LAinEtNLgpmCP9Rvsf5Hn8W6EhNiKLZQti1xfWMLy6X: 'laineSOL',
        Comp4ssDzXcLeu2MnLuGNNFC4cmLPMng8qWHPvzAMU1h: 'compassSOL',
      }

      const stakingPositions = balances
        .filter((b) => LST_MINTS[b.mint])
        .map((b) => ({
          protocol: 'Staking',
          type: 'Liquid Staking',
          token: LST_MINTS[b.mint],
          balance: b.balance,
          mint: b.mint,
        }))

      // 3. Check Kamino positions via Hubble API
      let kaminoPositions: Array<{
        protocol: string
        type: string
        market?: string
        deposited?: number
        borrowed?: number
        healthFactor?: number
      }> = []
      try {
        const kaminoRes = await fetch(
          `https://api.hubbleprotocol.io/kamino/users/${walletAddress}/obligations`,
        )
        if (kaminoRes.ok) {
          const kaminoData = (await kaminoRes.json()) as Array<{
            market: string
            deposits: Array<{ amount: number }>
            borrows: Array<{ amount: number }>
            ltv: number
          }>
          if (Array.isArray(kaminoData) && kaminoData.length > 0) {
            kaminoPositions = kaminoData.map((pos) => ({
              protocol: 'Kamino',
              type: 'Lending',
              market: pos.market,
              deposited:
                pos.deposits?.reduce((sum: number, d: { amount: number }) => sum + d.amount, 0) ||
                0,
              borrowed:
                pos.borrows?.reduce((sum: number, b: { amount: number }) => sum + b.amount, 0) || 0,
              healthFactor: pos.ltv ? 1 / pos.ltv : undefined,
            }))
          }
        }
      } catch {
        // Kamino API unavailable
      }

      // 4. Check Drift positions
      let driftPositions: Array<{
        protocol: string
        type: string
        vault?: string
        balance?: number
      }> = []
      try {
        const driftRes = await fetch(`https://mainnet-beta.api.drift.trade/users/${walletAddress}`)
        if (driftRes.ok) {
          const driftData = (await driftRes.json()) as {
            vaultDeposits?: Array<{ vault: string; balance: number }>
          }
          if (driftData.vaultDeposits && driftData.vaultDeposits.length > 0) {
            driftPositions = driftData.vaultDeposits.map((v) => ({
              protocol: 'Drift',
              type: 'Vault',
              vault: v.vault,
              balance: v.balance,
            }))
          }
        }
      } catch {
        // Drift API unavailable
      }

      // 5. Check Marinade staking
      let marinadePosition = null
      const msolBalance = balances.find(
        (b) => b.mint === 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
      )
      if (msolBalance && msolBalance.balance > 0) {
        marinadePosition = {
          protocol: 'Marinade',
          type: 'Liquid Staking',
          token: 'mSOL',
          balance: msolBalance.balance,
        }
      }

      // 6. Build portfolio summary
      const portfolio = {
        wallet: walletAddress,
        timestamp: new Date().toISOString(),
        tokens: balances,
        defiPositions: [
          ...stakingPositions,
          ...kaminoPositions,
          ...driftPositions,
          ...(marinadePosition ? [marinadePosition] : []),
        ],
        summary: {
          tokenCount: balances.length,
          defiPositionCount:
            stakingPositions.length +
            kaminoPositions.length +
            driftPositions.length +
            (marinadePosition ? 1 : 0),
          hasStaking: stakingPositions.length > 0,
          hasLending: kaminoPositions.length > 0,
          hasVaults: driftPositions.length > 0,
        },
      }

      console.log(formatOutput(portfolio, getFormat()))
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

// ============================================
// Protocols Command
// ============================================

program
  .command('protocols')
  .description('List all supported protocols and their action endpoints')
  .action(() => {
    const formatted = Object.entries(PROTOCOLS).map(([id, p]) => {
      const endpoints = PROTOCOL_ACTION_ENDPOINTS[id]
      return {
        name: p.name,
        displayName: p.displayName,
        category: p.category,
        actions: p.actions.join(', '),
        directActions: p.directActionsAvailable ? '✓' : '-',
        blinks: p.blinksSupported ? '✓' : '-',
        endpoints: endpoints ? Object.keys(endpoints.actions).join(', ') : '-',
      }
    })
    console.log(formatOutput(formatted, getFormat()))
  })

// ============================================
// Trusted Hosts Command
// ============================================

program
  .command('trusted-hosts')
  .description('List all trusted action hosts from the registry')
  .action(() => {
    console.log(formatOutput({ trustedHosts: TRUSTED_HOSTS }, getFormat()))
  })

// ============================================
// Blinks Commands (Inspect/Execute)
// ============================================

program
  .command('inspect <url>')
  .description('Inspect a blink/action URL - fetch metadata and available actions')
  .action(async (url) => {
    try {
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)
      const result = await blinks.inspect(url)
      console.log(formatOutput(result, getFormat()))
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

program
  .command('execute <url>')
  .description('Execute a blink action')
  .option('--amount <amount>', 'Amount parameter')
  .option('--dry-run', 'Simulate without executing')
  .option('-p, --params <json>', 'Additional params as JSON')
  .action(async (url, opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      // Build params
      const params: Record<string, string | number> = {}
      if (opts.amount) params.amount = opts.amount
      if (opts.params) {
        Object.assign(params, JSON.parse(opts.params))
      }

      // Check if trusted
      const trusted = blinks.isTrustedHost(url)
      if (!trusted) {
        info(`Warning: This URL is not from a verified trusted host`)
      }

      // Get transaction
      info(`Fetching transaction from action endpoint...`)
      const blinkTx = await blinks.getTransaction(url, wallet.address, params)

      if (opts.dryRun) {
        // Simulate
        const simResult = await blinks.simulate(blinkTx)
        console.log(
          formatOutput(
            {
              success: simResult.success,
              unitsConsumed: simResult.unitsConsumed,
              error: simResult.error,
              message: blinkTx.message,
              trusted,
            },
            getFormat(),
          ),
        )
      } else {
        // Execute
        info(`Signing and sending transaction...`)
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Transaction confirmed!`)
        console.log(
          formatOutput(
            {
              signature,
              explorer: `https://solscan.io/tx/${signature}`,
              message: blinkTx.message,
              trusted,
            },
            getFormat(),
          ),
        )
      }
    } catch (e: unknown) {
      const err = e as Error & { details?: string }
      error(err.message)
      if (err.details) {
        try {
          const parsed = JSON.parse(err.details)
          if (parsed.message) error(`  → ${parsed.message}`)
        } catch {
          if (err.details !== err.message) error(`  → ${err.details}`)
        }
      }
      process.exit(1)
    }
  })

// ============================================
// Kamino Commands
// ============================================

const kaminoCmd = program.command('kamino').description('Kamino Finance operations')

kaminoCmd
  .command('deposit')
  .description('Deposit to Kamino Lend vault')
  .requiredOption('--vault <slug>', 'Vault slug (e.g., usdc-prime)')
  .requiredOption('--amount <amount>', 'Amount to deposit')
  .option('--dry-run', 'Simulate without executing')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const blinkUrl = `https://kamino.dial.to/api/v0/lend/${opts.vault}/deposit`

      info(`Depositing ${opts.amount} to ${opts.vault}...`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address, {
        amount: opts.amount,
      })

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Deposit confirmed!`)
        console.log(
          formatOutput(
            {
              signature,
              explorer: `https://solscan.io/tx/${signature}`,
            },
            getFormat(),
          ),
        )
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

kaminoCmd
  .command('withdraw')
  .description('Withdraw from Kamino Lend vault')
  .requiredOption('--vault <slug>', 'Vault slug')
  .requiredOption('--amount <amount>', 'Amount to withdraw')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const blinkUrl = `https://kamino.dial.to/api/v0/lend/${opts.vault}/withdraw`

      info(`Withdrawing ${opts.amount} from ${opts.vault}...`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address, {
        amount: opts.amount,
      })

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Withdrawal confirmed!`)
        console.log(
          formatOutput(
            {
              signature,
              explorer: `https://solscan.io/tx/${signature}`,
            },
            getFormat(),
          ),
        )
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

kaminoCmd
  .command('borrow')
  .description('Borrow from Kamino lending market')
  .requiredOption('--market <address>', 'Market address')
  .requiredOption('--reserve <address>', 'Reserve address')
  .requiredOption('--amount <amount>', 'Amount to borrow')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const blinkUrl = `https://kamino.dial.to/api/v0/lending/reserve/${opts.market}/${opts.reserve}/borrow`

      info(`Borrowing ${opts.amount}...`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address, {
        amount: opts.amount,
      })

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Borrow confirmed!`)
        console.log(
          formatOutput(
            {
              signature,
              explorer: `https://solscan.io/tx/${signature}`,
            },
            getFormat(),
          ),
        )
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

kaminoCmd
  .command('repay')
  .description('Repay Kamino loan')
  .requiredOption('--market <address>', 'Market address')
  .requiredOption('--reserve <address>', 'Reserve address')
  .requiredOption('--amount <amount>', 'Amount to repay')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const blinkUrl = `https://kamino.dial.to/api/v0/lending/reserve/${opts.market}/${opts.reserve}/repay`

      info(`Repaying ${opts.amount}...`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address, {
        amount: opts.amount,
      })

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Repayment confirmed!`)
        console.log(
          formatOutput(
            {
              signature,
              explorer: `https://solscan.io/tx/${signature}`,
            },
            getFormat(),
          ),
        )
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

kaminoCmd
  .command('multiply')
  .description('Open Kamino multiply position')
  .requiredOption('--market <address>', 'Market address')
  .requiredOption('--coll-token <mint>', 'Collateral token mint')
  .requiredOption('--debt-token <mint>', 'Debt token mint')
  .requiredOption('--amount <amount>', 'Amount')
  .option('--leverage <x>', 'Leverage multiplier')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const blinkUrl = `https://kamino.dial.to/api/v0/multiply/${opts.market}/deposit?collTokenMint=${opts.collToken}&debtTokenMint=${opts.debtToken}`

      const params: Record<string, string | number> = { amount: opts.amount }
      if (opts.leverage) params.leverage = opts.leverage

      info(`Opening multiply position...`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address, params)

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Position opened!`)
        console.log(
          formatOutput(
            {
              signature,
              explorer: `https://solscan.io/tx/${signature}`,
            },
            getFormat(),
          ),
        )
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

// ============================================
// Jupiter Commands
// ============================================

const jupiterCmd = program.command('jupiter').description('Jupiter operations')

jupiterCmd
  .command('swap')
  .description('Swap tokens via Jupiter')
  .requiredOption('--input <mint>', 'Input token mint')
  .requiredOption('--output <mint>', 'Output token mint')
  .requiredOption('--amount <amount>', 'Amount to swap')
  .option('--slippage <bps>', 'Slippage in basis points', '50')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const inputMint = TOKENS[opts.input.toUpperCase()] || opts.input
      const outputMint = TOKENS[opts.output.toUpperCase()] || opts.output
      const blinkUrl = `https://worker.jup.ag/blinks/swap/${inputMint}/${outputMint}/${opts.amount}`

      info(`Swapping ${opts.amount} ${opts.input} for ${opts.output}...`)
      info(`URL: ${blinkUrl}`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address)

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Swap confirmed!`)
        console.log(
          formatOutput(
            {
              signature,
              explorer: `https://solscan.io/tx/${signature}`,
            },
            getFormat(),
          ),
        )
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

// ============================================
// Lulo Commands
// ============================================

const luloCmd = program.command('lulo').description('Lulo yield operations')

luloCmd
  .command('deposit')
  .description('Deposit to Lulo')
  .requiredOption('--token <mint>', 'Token mint address')
  .requiredOption('--amount <amount>', 'Amount')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const blinkUrl = `https://lulo.dial.to/api/v0/deposit`

      info(`Depositing ${opts.amount} to Lulo...`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address, {
        token: opts.token,
        amount: opts.amount,
      })

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Deposit confirmed!`)
        console.log(formatOutput({ signature }, getFormat()))
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

luloCmd
  .command('withdraw')
  .description('Initiate withdrawal from Lulo (24h cooldown for regular pool)')
  .requiredOption('--token <token>', 'Token symbol (USDC)')
  .option('--type <type>', 'Pool type: regular or protected', 'regular')
  .option('--amount <amount>', 'Amount to withdraw')
  .option('--percentage <pct>', 'Percentage to withdraw (25, 50, 100)')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const poolType = opts.type || 'regular'
      let blinkUrl = `https://lulo.dial.to/api/v0/withdraw/${opts.token}/${poolType}`
      if (opts.percentage) {
        blinkUrl += `?percentage=${opts.percentage}`
      } else if (opts.amount) {
        blinkUrl += `?amount=${opts.amount}`
      }

      info(`Initiating ${poolType} withdrawal from Lulo...`)
      info(
        `Note: ${poolType === 'regular' ? '24-hour' : '48-hour'} cooldown applies. Use 'lulo pending' to check status.`,
      )
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address)

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Withdrawal initiated!`)
        console.log(
          formatOutput(
            { signature, note: 'Use "blinks lulo pending" to check when you can complete.' },
            getFormat(),
          ),
        )
      }
    } catch (e: unknown) {
      const err = e as Error & { details?: string }
      error(err.message)
      if (err.details) {
        try {
          const parsed = JSON.parse(err.details)
          if (parsed.message) error(`  → ${parsed.message}`)
        } catch {
          if (err.details !== err.message) error(`  → ${err.details}`)
        }
      }
      process.exit(1)
    }
  })

luloCmd
  .command('pending')
  .description('Check pending Lulo withdrawals and cooldown status')
  .action(async () => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()

      const LULO_PROGRAM = 'FL3X2pRsQ9zHENpZSKDRREtccwJuei8yg9fwDu9UN69Q'
      const { PublicKey } = await import('@solana/web3.js')

      // Find withdrawal request accounts owned by Lulo program with our wallet
      const accounts = await connection.getProgramAccounts(new PublicKey(LULO_PROGRAM), {
        filters: [
          { dataSize: 67 }, // Withdrawal request size
          { memcmp: { offset: 11, bytes: wallet.address } }, // Owner pubkey at offset 11
        ],
      })

      if (accounts.length === 0) {
        info('No pending withdrawals found.')
        return
      }

      const pending = accounts.map(({ pubkey, account }) => {
        const data = account.data
        const poolType = data[8]
        const status = data[9]
        const initiatedAt = Number(data.readBigUInt64LE(43))
        const cooldownSeconds = Number(data.readBigUInt64LE(51))
        const amount = Number(data.readBigUInt64LE(59))

        const completeAt = initiatedAt + cooldownSeconds
        const now = Math.floor(Date.now() / 1000)
        const remaining = completeAt - now

        return {
          account: pubkey.toBase58(),
          poolType: poolType === 0 ? 'regular' : poolType === 1 ? 'protected' : 'boosted',
          amount: (amount / 1e6).toFixed(6) + ' USDC',
          initiatedAt: new Date(initiatedAt * 1000).toISOString(),
          cooldown: cooldownSeconds / 3600 + ' hours',
          completeAt: new Date(completeAt * 1000).toISOString(),
          status:
            remaining > 0
              ? `Pending (${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}m remaining)`
              : 'READY TO COMPLETE',
          canComplete: remaining <= 0,
        }
      })

      console.log(formatOutput(pending, getFormat()))
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

luloCmd
  .command('rates')
  .description('Show current USDC yield rates on Solana')
  .action(async () => {
    try {
      // Fetch rates from DeFiLlama
      const response = await fetch('https://yields.llama.fi/pools')
      const data = (await response.json()) as {
        data: Array<{ project: string; symbol: string; chain: string; apy: number; tvlUsd: number }>
      }

      // Get top USDC yields on Solana
      const rates = data.data
        .filter((p) => p.symbol === 'USDC' && p.chain === 'Solana' && p.tvlUsd > 500000)
        .sort((a, b) => b.apy - a.apy)
        .slice(0, 10)
        .map((p) => ({
          protocol: p.project,
          apy: p.apy.toFixed(2) + '%',
          tvl: '$' + (p.tvlUsd / 1e6).toFixed(1) + 'M',
        }))

      if (rates.length === 0) {
        info('No rates data available from DeFiLlama')
        return
      }

      console.log(
        formatOutput(
          {
            note: 'Lulo auto-allocates USDC across Kamino, Drift, MarginFi, Jupiter for best yield',
            topSolanaUsdcYields: rates,
          },
          getFormat(),
        ),
      )
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

// ============================================
// Drift Commands
// ============================================

const driftCmd = program.command('drift').description('Drift strategy vault operations')

driftCmd
  .command('vault-deposit')
  .description('Deposit to Drift vault')
  .requiredOption('--vault <address>', 'Vault address')
  .requiredOption('--amount <amount>', 'Amount')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const blinkUrl = `https://app.drift.trade/api/actions/vault/deposit?vault=${opts.vault}`

      info(`Depositing ${opts.amount} to Drift vault...`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address, {
        amount: opts.amount,
      })

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Vault deposit confirmed!`)
        console.log(formatOutput({ signature }, getFormat()))
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

driftCmd
  .command('vault-withdraw')
  .description('Withdraw from Drift vault')
  .requiredOption('--vault <address>', 'Vault address')
  .requiredOption('--amount <amount>', 'Amount')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const blinkUrl = `https://app.drift.trade/api/actions/vault/withdraw?vault=${opts.vault}`

      info(`Withdrawing ${opts.amount} from Drift vault...`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address, {
        amount: opts.amount,
      })

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Vault withdrawal confirmed!`)
        console.log(formatOutput({ signature }, getFormat()))
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

// ============================================
// Sanctum Commands (LST Staking)
// ============================================

const sanctumCmd = program.command('sanctum').description('Sanctum LST staking operations')

sanctumCmd
  .command('stake')
  .description('Stake SOL for an LST via Sanctum')
  .requiredOption('--lst <mint>', 'LST token mint (e.g., JitoSOL, mSOL)')
  .requiredOption('--amount <amount>', 'Amount of SOL to stake')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const SOL_MINT = 'So11111111111111111111111111111111111111112'
      const blinkUrl = `https://sanctum.dial.to/api/v0/stake`

      info(`Staking ${opts.amount} SOL for ${opts.lst}...`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address, {
        inputMint: SOL_MINT,
        outputMint: opts.lst,
        amount: opts.amount,
      })

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Staking confirmed!`)
        console.log(formatOutput({ signature }, getFormat()))
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

// ============================================
// Jito Commands
// ============================================

const jitoCmd = program.command('jito').description('Jito staking operations')

jitoCmd
  .command('stake')
  .description('Stake SOL for JitoSOL')
  .requiredOption('--amount <amount>', 'Amount of SOL to stake')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const blinkUrl = `https://jito.dial.to/stake`

      info(`Staking ${opts.amount} SOL for JitoSOL...`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address, {
        amount: opts.amount,
      })

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Staking confirmed!`)
        console.log(formatOutput({ signature }, getFormat()))
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

// ============================================
// Raydium Commands
// ============================================

const raydiumCmd = program.command('raydium').description('Raydium AMM operations')

raydiumCmd
  .command('swap')
  .description('Swap tokens via Raydium')
  .requiredOption('--input <mint>', 'Input token mint')
  .requiredOption('--output <mint>', 'Output token mint')
  .requiredOption('--amount <amount>', 'Amount to swap')
  .option('--dry-run', 'Simulate')
  .action(async (opts) => {
    try {
      const wallet = Wallet.fromEnv()
      const connection = getConnection()
      const blinks = new BlinksExecutor(connection)

      const outputMint = TOKENS[opts.output.toUpperCase()] || opts.output
      const blinkUrl = `https://share.raydium.io/dialect/actions/swap/tx?outputMint=${outputMint}&amount=${opts.amount}`

      info(`Swapping ${opts.amount} SOL for ${opts.output} via Raydium...`)
      info(`URL: ${blinkUrl}`)
      const blinkTx = await blinks.getTransaction(blinkUrl, wallet.address)

      if (opts.dryRun) {
        const simResult = await blinks.simulate(blinkTx)
        console.log(formatOutput(simResult, getFormat()))
      } else {
        const signature = await blinks.signAndSend(blinkTx, wallet.getSigner())
        success(`Swap confirmed!`)
        console.log(formatOutput({ signature }, getFormat()))
      }
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

// ============================================
// Status Command
// ============================================

program
  .command('status')
  .description('Check connection and configuration status')
  .action(async () => {
    try {
      const connection = getConnection()
      const health = await checkConnection(connection)

      let wallet = 'Not configured'
      try {
        const w = Wallet.fromEnv()
        wallet = w.address
      } catch {
        // Not configured
      }

      console.log(
        formatOutput(
          {
            rpc: {
              url: connection.rpcEndpoint,
              healthy: health.healthy,
              slot: health.slot,
              version: health.version,
            },
            wallet,
            architecture: 'Direct Solana Actions (no Dialect API dependency)',
            trustedHostsCount: TRUSTED_HOSTS.length,
            protocolsWithDirectActions: Object.entries(PROTOCOLS)
              .filter(([_, p]) => p.directActionsAvailable)
              .map(([id]) => id),
          },
          getFormat(),
        ),
      )
    } catch (e) {
      error((e as Error).message)
      process.exit(1)
    }
  })

// Parse and run
program.parse()
