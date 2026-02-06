#!/usr/bin/env npx ts-node
/**
 * Babylon MCP Client
 *
 * Uses MCP (Model Context Protocol) JSON-RPC 2.0 to interact with Babylon's API.
 * Endpoint: /mcp with tools/call method
 * Auth: X-Babylon-Api-Key header
 */

import * as fs from 'fs'
import * as path from 'path'

// Load API key from .env
function loadApiKey(): string {
  const envPath = path.join(process.env.HOME || '', '.openclaw/workspace/.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    const match = content.match(/^BABYLON_API_KEY=(.+)$/m)
    if (match) return match[1].trim()
  }
  throw new Error('BABYLON_API_KEY not found in .env')
}

const API_KEY = loadApiKey()
const BASE_URL = process.env.BABYLON_URL || 'https://staging.babylon.market'
const MCP_ENDPOINT = `${BASE_URL}/mcp`

interface MCPResponse<T = unknown> {
  jsonrpc: '2.0'
  id: number
  result?: {
    content: Array<{ type: 'text'; text: string }>
    isError: boolean
  }
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

/**
 * Call an MCP tool via JSON-RPC 2.0
 */
async function callTool<T>(toolName: string, args: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Babylon-Api-Key': API_KEY,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id: Date.now(),
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }

  const json = (await response.json()) as MCPResponse<T>

  if (json.error) {
    throw new Error(`RPC Error ${json.error.code}: ${json.error.message}`)
  }

  if (!json.result) {
    throw new Error('No result in response')
  }

  if (json.result.isError) {
    const errorText = json.result.content?.[0]?.text || 'Unknown error'
    throw new Error(`Tool error: ${errorText}`)
  }

  // Parse the text content as JSON
  const text = json.result.content?.[0]?.text
  if (!text) {
    throw new Error('No content in response')
  }

  return JSON.parse(text) as T
}

// ============== Account ==============

export async function whoami(): Promise<{ userId: string; username: string | null }> {
  const response = await fetch(`${BASE_URL}/api/auth/whoami`, {
    headers: {
      'X-Babylon-Api-Key': API_KEY,
      Accept: 'application/json',
    },
  })
  if (!response.ok) {
    throw new Error(`Whoami failed: ${response.status}`)
  }
  return response.json() as Promise<{ userId: string; username: string | null }>
}

export async function getBalance(): Promise<{ balance: string; lifetimePnL: string }> {
  return callTool('get_balance')
}

export async function getPositions(marketId?: string): Promise<{ positions: any[] }> {
  return callTool('get_positions', marketId ? { marketId } : {})
}

export async function getUserProfile(userId: string): Promise<any> {
  return callTool('get_user_profile', { userId })
}

// ============== Markets ==============

export interface Market {
  id: string
  question: string
  yesShares: string
  noShares: string
  liquidity: string
  endDate: string
}

export async function getMarkets(
  type: 'prediction' | 'perpetuals' | 'all' = 'prediction',
): Promise<{ markets: Market[] }> {
  return callTool('get_markets', { type })
}

export async function getMarketData(marketId: string): Promise<any> {
  return callTool('get_market_data', { marketId })
}

export async function getMarketPrices(marketId: string): Promise<any> {
  return callTool('get_market_prices', { marketId })
}

export async function getPerpetuals(): Promise<any> {
  return callTool('get_perpetuals')
}

// ============== Trading ==============

export async function buyShares(
  marketId: string,
  outcome: 'YES' | 'NO',
  amount: number,
): Promise<any> {
  return callTool('buy_shares', { marketId, outcome, amount })
}

export async function sellShares(positionId: string, shares: number): Promise<any> {
  return callTool('sell_shares', { positionId, shares })
}

export async function placeBet(marketId: string, side: 'YES' | 'NO', amount: number): Promise<any> {
  return callTool('place_bet', { marketId, side, amount })
}

export async function closePosition(positionId: string): Promise<any> {
  return callTool('close_position', { positionId })
}

export async function openPosition(
  ticker: string,
  side: 'LONG' | 'SHORT',
  amount: number,
  leverage: number,
): Promise<any> {
  return callTool('open_position', { ticker, side, amount, leverage })
}

export async function getTrades(limit?: number, marketId?: string): Promise<any> {
  return callTool('get_trades', { limit, marketId })
}

// ============== Social / Feed ==============

export async function queryFeed(limit = 20, questionId?: string): Promise<any> {
  return callTool('query_feed', { limit, questionId })
}

export async function createPost(content: string, type: 'post' | 'article' = 'post'): Promise<any> {
  return callTool('create_post', { content, type })
}

export async function deletePost(postId: string): Promise<any> {
  return callTool('delete_post', { postId })
}

export async function likePost(postId: string): Promise<any> {
  return callTool('like_post', { postId })
}

export async function unlikePost(postId: string): Promise<any> {
  return callTool('unlike_post', { postId })
}

export async function getComments(postId: string, limit?: number): Promise<any> {
  return callTool('get_comments', { postId, limit })
}

export async function createComment(postId: string, content: string): Promise<any> {
  return callTool('create_comment', { postId, content })
}

// ============== Users ==============

export async function followUser(userId: string): Promise<any> {
  return callTool('follow_user', { userId })
}

export async function unfollowUser(userId: string): Promise<any> {
  return callTool('unfollow_user', { userId })
}

export async function getFollowers(userId: string, limit?: number): Promise<any> {
  return callTool('get_followers', { userId, limit })
}

export async function getFollowing(userId: string, limit?: number): Promise<any> {
  return callTool('get_following', { userId, limit })
}

export async function searchUsers(query: string, limit?: number): Promise<any> {
  return callTool('search_users', { query, limit })
}

// ============== Leaderboard ==============

export async function getLeaderboard(
  page?: number,
  pageSize?: number,
  pointsType?: 'all' | 'earned' | 'referral',
): Promise<any> {
  return callTool('get_leaderboard', { page, pageSize, pointsType })
}

// ============== Notifications ==============

export async function getNotifications(limit?: number): Promise<any> {
  return callTool('get_notifications', { limit })
}

// ============== Stats & Discovery ==============

export async function getSystemStats(): Promise<any> {
  return callTool('get_system_stats')
}

export async function getReputation(userId?: string): Promise<any> {
  return callTool('get_reputation', { userId })
}

export async function getReputationBreakdown(userId?: string): Promise<any> {
  return callTool('get_reputation_breakdown', { userId })
}

export async function getTrendingTags(limit?: number): Promise<any> {
  return callTool('get_trending_tags', { limit })
}

export async function getOrganizations(): Promise<any> {
  return callTool('get_organizations')
}

export async function transferPoints(
  recipientId: string,
  amount: number,
  message?: string,
): Promise<any> {
  return callTool('transfer_points', { recipientId, amount, message })
}

// ============== Chats & Messaging ==============

export async function getChats(): Promise<any> {
  return callTool('get_chats')
}

export async function getChatMessages(chatId: string, limit?: number): Promise<any> {
  return callTool('get_chat_messages', { chatId, limit })
}

export async function sendMessage(chatId: string, content: string): Promise<any> {
  return callTool('send_message', { chatId, content })
}

export async function createGroup(name: string, memberIds: string[]): Promise<any> {
  return callTool('create_group', { name, memberIds })
}

export async function leaveChat(chatId: string): Promise<any> {
  return callTool('leave_chat', { chatId })
}

export async function getUnreadCount(): Promise<any> {
  return callTool('get_unread_count')
}

// ============== Moderation ==============

export async function blockUser(userId: string): Promise<any> {
  return callTool('block_user', { userId })
}

export async function unblockUser(userId: string): Promise<any> {
  return callTool('unblock_user', { userId })
}

export async function muteUser(userId: string): Promise<any> {
  return callTool('mute_user', { userId })
}

export async function unmuteUser(userId: string): Promise<any> {
  return callTool('unmute_user', { userId })
}

export async function reportUser(userId: string, reason: string): Promise<any> {
  return callTool('report_user', { userId, reason })
}

export async function reportPost(postId: string, reason: string): Promise<any> {
  return callTool('report_post', { postId, reason })
}

export async function getBlocks(): Promise<any> {
  return callTool('get_blocks')
}

export async function getMutes(): Promise<any> {
  return callTool('get_mutes')
}

// ============== Favorites ==============

export async function favoriteProfile(userId: string): Promise<any> {
  return callTool('favorite_profile', { userId })
}

export async function unfavoriteProfile(userId: string): Promise<any> {
  return callTool('unfavorite_profile', { userId })
}

export async function getFavorites(): Promise<any> {
  return callTool('get_favorites')
}

export async function getFavoritePosts(): Promise<any> {
  return callTool('get_favorite_posts')
}

// ============== Referrals ==============

export async function getReferralCode(): Promise<any> {
  return callTool('get_referral_code')
}

export async function getReferrals(): Promise<any> {
  return callTool('get_referrals')
}

export async function getReferralStats(): Promise<any> {
  return callTool('get_referral_stats')
}

// ============== Group Invites ==============

export async function getGroupInvites(): Promise<any> {
  return callTool('get_group_invites')
}

export async function acceptGroupInvite(inviteId: string): Promise<any> {
  return callTool('accept_group_invite', { inviteId })
}

export async function declineGroupInvite(inviteId: string): Promise<any> {
  return callTool('decline_group_invite', { inviteId })
}

// ============== Trade History ==============

export async function getTradeHistory(): Promise<any> {
  return callTool('get_trade_history')
}

export async function getUserStats(userId?: string): Promise<any> {
  return callTool('get_user_stats', { userId })
}

export async function getUserWallet(): Promise<any> {
  return callTool('get_user_wallet')
}

export async function getPostsByTag(tag: string, limit?: number): Promise<any> {
  return callTool('get_posts_by_tag', { tag, limit })
}

export async function sharePost(postId: string): Promise<any> {
  return callTool('share_post', { postId })
}

export async function deleteComment(commentId: string): Promise<any> {
  return callTool('delete_comment', { commentId })
}

export async function likeComment(commentId: string): Promise<any> {
  return callTool('like_comment', { commentId })
}

export async function updateProfile(
  displayName?: string,
  bio?: string,
  avatar?: string,
): Promise<any> {
  return callTool('update_profile', { displayName, bio, avatar })
}

export async function markNotificationsRead(notificationIds: string[]): Promise<any> {
  return callTool('mark_notifications_read', { notificationIds })
}

// ============== CLI ==============

async function main() {
  const [, , command, ...args] = process.argv

  try {
    let result: any

    switch (command) {
      case 'whoami':
        result = await whoami()
        break
      case 'balance':
        result = await getBalance()
        break
      case 'positions':
        result = await getPositions(args[0])
        break
      case 'markets':
        result = await getMarkets((args[0] as any) || 'prediction')
        break
      case 'market':
        if (!args[0]) throw new Error('Usage: market <marketId>')
        result = await getMarketData(args[0])
        break
      case 'buy':
        if (args.length < 3) throw new Error('Usage: buy <marketId> <YES|NO> <amount>')
        result = await buyShares(args[0], args[1] as 'YES' | 'NO', parseFloat(args[2]))
        break
      case 'sell':
        if (args.length < 2) throw new Error('Usage: sell <positionId> <shares>')
        result = await sellShares(args[0], parseFloat(args[1]))
        break
      case 'bet':
        if (args.length < 3) throw new Error('Usage: bet <marketId> <YES|NO> <amount>')
        result = await placeBet(args[0], args[1] as 'YES' | 'NO', parseFloat(args[2]))
        break
      case 'close':
        if (!args[0]) throw new Error('Usage: close <positionId>')
        result = await closePosition(args[0])
        break
      case 'feed':
        result = await queryFeed(parseInt(args[0]) || 20)
        break
      case 'post':
        if (!args[0]) throw new Error('Usage: post <content>')
        result = await createPost(args.join(' '))
        break
      case 'leaderboard':
        result = await getLeaderboard(parseInt(args[0]) || 1, parseInt(args[1]) || 20)
        break
      case 'profile':
        if (!args[0]) throw new Error('Usage: profile <userId>')
        result = await getUserProfile(args[0])
        break
      case 'follow':
        if (!args[0]) throw new Error('Usage: follow <userId>')
        result = await followUser(args[0])
        break
      case 'search':
        if (!args[0]) throw new Error('Usage: search <query>')
        result = await searchUsers(args.join(' '))
        break
      case 'stats':
        result = await getSystemStats()
        break
      case 'help':
      default:
        console.log(`
Babylon CLI - Play prediction markets

COMMANDS:
  Account:
    whoami              Show your user ID and username
    balance             Show your balance and PnL
    positions [market]  List your open positions

  Markets:
    markets [type]      List markets (prediction|perpetuals|all)
    market <id>         Get market details

  Trading:
    buy <market> <YES|NO> <amount>   Buy shares
    sell <position> <shares>         Sell shares
    bet <market> <YES|NO> <amount>   Place a bet
    close <position>                 Close a position

  Social:
    feed [limit]        View social feed
    post <content>      Create a post
    profile <userId>    View user profile
    follow <userId>     Follow a user
    search <query>      Search users

  Stats:
    leaderboard [page] [size]   View leaderboard
    stats                       System statistics
`)
        process.exit(command === 'help' ? 0 : 1)
    }

    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
