#!/usr/bin/env npx tsx
/**
 * Generate a beautiful status report for chat surfaces
 * Usage: npx tsx report.ts [--json|--plain]
 */

import { type Address, formatUnits } from 'viem'

import {
  ERC20_ABI,
  fetchVaultAPY,
  formatUSDC,
  getClients,
  getLastCompound,
  getNextCheckDate,
  getTotalReinvested,
  handleError,
  loadConfig,
  loadPreferences,
  rateLimitedFetch,
  USDC_ADDRESS,
  VAULT_ABI,
  VAULT_ADDRESS,
} from './config.js'

const WELL_ADDRESS = '0xA88594D404727625A9437C3f886C7643872296AE' as Address
const MORPHO_ADDRESS = '0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842' as Address

// Estimated APRs for reward tokens (from Merkl, can vary)
const REWARD_APRS = {
  WELL: 0.003, // ~0.3% APR in WELL rewards
  MORPHO: 0.003, // ~0.3% APR in MORPHO rewards
}

interface ReportData {
  wallet: string
  shortWallet: string
  positionUSDC: number
  vaultAPY: number
  totalAPY: number
  wellBalance: number
  morphoBalance: number
  wellValueUSD: number
  morphoValueUSD: number
  totalRewardsUSD: number
  ethBalance: number
  lastCompound: { timestamp: string; hash: string; deposited: string; timeAgo: string } | null
  totalReinvested: number
  nextCheck: string
  compoundThreshold: number
}

async function getTokenPrice(symbol: string): Promise<number> {
  const ids: Record<string, string> = {
    WELL: 'moonwell',
    MORPHO: 'morpho',
  }

  const id = ids[symbol]
  if (!id) return 0

  try {
    const res = await rateLimitedFetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    )
    if (!res.ok) return 0
    const data = (await res.json()) as Record<string, { usd?: number }>
    return data[id]?.usd ?? 0
  } catch {
    return 0
  }
}

function formatShortWallet(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMinutes > 0) return `${diffMinutes}m ago`
  return 'Just now'
}

function formatCompoundInfo(
  compound: { timestamp: string; hash: string; deposited: string; timeAgo?: string } | null,
): string {
  if (!compound) return 'Never'

  const timeAgo = compound.timeAgo || formatTimeAgo(compound.timestamp)
  const depositedUSDC = formatUSDC(BigInt(compound.deposited))
  return `${timeAgo} (${depositedUSDC} USDC)`
}

async function gatherReportData(): Promise<ReportData> {
  const config = loadConfig()
  const { publicClient, account } = getClients(config)

  // Fetch all data in parallel
  const [
    shares,
    totalAssets,
    totalSupply,
    wellBalance,
    morphoBalance,
    ethBalance,
    wellPrice,
    morphoPrice,
    vaultAPY,
  ] = await Promise.all([
    publicClient.readContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }),
    publicClient.readContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'totalAssets',
    }),
    publicClient.readContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'totalSupply',
    }),
    publicClient.readContract({
      address: WELL_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }),
    publicClient.readContract({
      address: MORPHO_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }),
    publicClient.getBalance({ address: account.address }),
    getTokenPrice('WELL'),
    getTokenPrice('MORPHO'),
    fetchVaultAPY(),
  ])

  // Calculate position value
  const positionValue = totalSupply > 0n ? (shares * totalAssets) / totalSupply : 0n

  const positionUSDC = Number(positionValue) / 1e6
  const wellBal = Number(wellBalance) / 1e18
  const morphoBal = Number(morphoBalance) / 1e18

  // Use fetched APY or fallback
  const baseAPY = vaultAPY > 0 ? vaultAPY : 4.5

  // Total APY including rewards
  const totalAPY = baseAPY + REWARD_APRS.WELL * 100 + REWARD_APRS.MORPHO * 100

  const lastCompoundRaw = getLastCompound()
  const lastCompound = lastCompoundRaw
    ? {
        ...lastCompoundRaw,
        timeAgo: formatTimeAgo(lastCompoundRaw.timestamp),
      }
    : null

  const preferences = loadPreferences()
  const totalReinvested = getTotalReinvested()
  const nextCheck = getNextCheckDate(preferences.reportFrequency)

  return {
    wallet: account.address,
    shortWallet: formatShortWallet(account.address),
    positionUSDC,
    vaultAPY: baseAPY,
    totalAPY,
    wellBalance: wellBal,
    morphoBalance: morphoBal,
    wellValueUSD: wellBal * wellPrice,
    morphoValueUSD: morphoBal * morphoPrice,
    totalRewardsUSD: wellBal * wellPrice + morphoBal * morphoPrice,
    ethBalance: Number(ethBalance) / 1e18,
    lastCompound,
    totalReinvested,
    nextCheck,
    compoundThreshold: preferences.compoundThreshold,
  }
}

function formatTelegramReport(data: ReportData): string {
  let report = `🦎 Gekko Yield Report\n\n`

  // Wallet
  report += `🔗 Wallet: ${data.shortWallet}\n\n`

  // Position
  report += `📊 Position\n`
  report += `├ Value: $${data.positionUSDC.toFixed(2)}\n`
  report += `├ Base APY: ${data.vaultAPY.toFixed(2)}%\n`
  report += `└ Total APY: ~${data.totalAPY.toFixed(2)}%\n\n`

  // Compound info
  report += `🔄 Auto-Compound\n`
  report += `├ Last compounded: ${formatCompoundInfo(data.lastCompound)}\n`
  report += `├ Total reinvested: +$${data.totalReinvested.toFixed(2)}\n`
  report += `├ Threshold: $${data.compoundThreshold.toFixed(2)}\n`
  report += `└ Next check: ${data.nextCheck}\n\n`

  // Rewards
  if (data.totalRewardsUSD > 0.01) {
    report += `🎁 Pending Rewards\n`
    if (data.wellBalance > 0) {
      report += `├ WELL: ${data.wellBalance.toFixed(2)} (~$${data.wellValueUSD.toFixed(2)})\n`
    }
    if (data.morphoBalance > 0) {
      report += `├ MORPHO: ${data.morphoBalance.toFixed(4)} (~$${data.morphoValueUSD.toFixed(2)})\n`
    }
    report += `└ Total: $${data.totalRewardsUSD.toFixed(2)}\n\n`
  }

  // Estimated earnings
  const dailyEarnings = (data.positionUSDC * data.totalAPY) / 100 / 365
  const monthlyEarnings = dailyEarnings * 30

  report += `💰 Estimated Earnings\n`
  report += `├ Daily: ~$${dailyEarnings.toFixed(4)}\n`
  report += `└ Monthly: ~$${monthlyEarnings.toFixed(2)}\n\n`

  // Gas status
  const gasStatus = data.ethBalance > 0.001 ? '✅' : '⚠️'
  report += `⛽ Gas: ${gasStatus} ${data.ethBalance.toFixed(4)} ETH`

  return report
}

function formatPlainReport(data: ReportData): string {
  let report = `Gekko Yield Report\n`
  report += `${'='.repeat(40)}\n\n`
  report += `Wallet: ${data.shortWallet} (${data.wallet})\n`
  report += `Position: $${data.positionUSDC.toFixed(2)} USDC\n`
  report += `Base APY: ${data.vaultAPY.toFixed(2)}%\n`
  report += `Total APY: ${data.totalAPY.toFixed(2)}%\n\n`

  report += `Auto-Compound:\n`
  report += `  Last: ${formatCompoundInfo(data.lastCompound)}\n`
  report += `  Total reinvested: +$${data.totalReinvested.toFixed(2)}\n`
  report += `  Threshold: $${data.compoundThreshold.toFixed(2)}\n`
  report += `  Next check: ${data.nextCheck}\n\n`

  if (data.totalRewardsUSD > 0.01) {
    report += `Pending Rewards: $${data.totalRewardsUSD.toFixed(2)}\n`
    if (data.wellBalance > 0) {
      report += `  WELL: ${data.wellBalance.toFixed(2)}\n`
    }
    if (data.morphoBalance > 0) {
      report += `  MORPHO: ${data.morphoBalance.toFixed(4)}\n`
    }
    report += '\n'
  }

  const dailyEarnings = (data.positionUSDC * data.totalAPY) / 100 / 365
  report += `Est. Daily: $${dailyEarnings.toFixed(4)}\n`
  report += `Est. Monthly: $${(dailyEarnings * 30).toFixed(2)}\n`
  report += `Gas: ${data.ethBalance.toFixed(4)} ETH\n`

  return report
}

function formatJSONReport(data: ReportData): string {
  const dailyEarnings = (data.positionUSDC * data.totalAPY) / 100 / 365
  return JSON.stringify(
    {
      ...data,
      timestamp: new Date().toISOString(),
      estimatedDaily: dailyEarnings.toFixed(4),
      estimatedMonthly: (dailyEarnings * 30).toFixed(2),
      shouldCompound: data.totalRewardsUSD > data.compoundThreshold,
      compoundExplanation:
        'Auto-compound swaps WELL/MORPHO reward tokens to USDC via Odos aggregator, then deposits the USDC back into the vault to maximize yield',
    },
    null,
    2,
  )
}

async function main() {
  const format = process.argv.includes('--json')
    ? 'json'
    : process.argv.includes('--plain')
      ? 'plain'
      : 'telegram'

  const data = await gatherReportData()

  switch (format) {
    case 'json':
      console.log(formatJSONReport(data))
      break
    case 'plain':
      console.log(formatPlainReport(data))
      break
    default:
      console.log(formatTelegramReport(data))
  }

  // Explicitly exit to close any open connections
  process.exit(0)
}

main().catch((err) => handleError(err, 'Report failed'))
