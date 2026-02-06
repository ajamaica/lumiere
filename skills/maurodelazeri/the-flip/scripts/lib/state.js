/**
 * THE FLIP — State management (reads from on-chain)
 * No more JSON files — all state lives on-chain.
 */
import {
  flipToStr,
  fmtUsdc,
  getGamePDA,
  getProgram,
  loadGameWallet,
  TOTAL_FLIPS,
} from './solana.js'

export async function getGameState() {
  const wallet = loadGameWallet()
  const program = getProgram(wallet)
  const [gamePDA] = getGamePDA(wallet.publicKey)

  try {
    return await program.account.game.fetch(gamePDA)
  } catch {
    return null
  }
}

export function printGameStatus(game) {
  console.log('=== THE FLIP - On-Chain Game Status ===')
  console.log('Authority:     ' + game.authority.toBase58())
  console.log('Vault:         ' + game.vault.toBase58())
  console.log('Round:         ' + game.round)
  console.log('')
  console.log('Entries:       ' + game.totalEntries)
  console.log('Alive:         ' + game.ticketsAlive)
  console.log('Accepting:     ' + game.acceptingEntries)
  console.log('Game over:     ' + game.gameOver)
  console.log('')
  console.log('Flips:         ' + game.currentFlip + '/' + TOTAL_FLIPS)
  if (game.currentFlip > 0) {
    const results = game.flipResults
      .slice(0, game.currentFlip)
      .map((r, i) => '#' + (i + 1) + ':' + flipToStr(r))
      .join('  ')
    console.log('Results:       ' + results)
  }
  console.log('')
  console.log('Jackpot pool:  ' + fmtUsdc(game.jackpotPool) + ' USDC')
  console.log('Operator pool: ' + fmtUsdc(game.operatorPool) + ' USDC')
  console.log('='.repeat(40))
}

// Legacy compatibility — these are no-ops now since state is on-chain
export function initGameState() {
  return null
}
export function saveGameState() {
  return null
}
