/**
 * THE FLIP — Solana utilities
 * Connects to devnet and interacts with our deployed Anchor program.
 */
import * as anchor from '@coral-xyz/anchor'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import fs from 'fs'
import path from 'path'

export const DEVNET_URL = 'https://api.devnet.solana.com'
export const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
export const PROGRAM_ID = new PublicKey('7rSMKhD3ve2NcR4qdYK5xcbMHfGtEjTgoKCS5Mgx9ECX')
export const TOTAL_FLIPS = 14

const STATE_DIR = path.join(import.meta.dirname, '..', '..', 'state')
const WALLET_PATH = path.join(STATE_DIR, 'game-wallet.json')
const IDL_PATH = path.join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'the-flip-contract',
  'target',
  'idl',
  'the_flip.json',
)

export function getConnection() {
  return new Connection(DEVNET_URL, 'confirmed')
}

export function getUsdcMint() {
  return USDC_MINT
}

export function loadGameWallet() {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true })
  if (fs.existsSync(WALLET_PATH)) {
    const raw = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'))
    return Keypair.fromSecretKey(Uint8Array.from(raw))
  }
  // Also check ~/.config/solana/id.json
  const solanaWallet = path.join(process.env.HOME, '.config', 'solana', 'id.json')
  if (fs.existsSync(solanaWallet)) {
    const raw = JSON.parse(fs.readFileSync(solanaWallet, 'utf8'))
    return Keypair.fromSecretKey(Uint8Array.from(raw))
  }
  // Generate new
  const kp = Keypair.generate()
  fs.writeFileSync(WALLET_PATH, JSON.stringify(Array.from(kp.secretKey)))
  return kp
}

export function getProgram(wallet) {
  const connection = getConnection()
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    commitment: 'confirmed',
  })
  anchor.setProvider(provider)

  if (!fs.existsSync(IDL_PATH)) {
    throw new Error(
      'IDL not found at ' + IDL_PATH + '. Run anchor build in the-flip-contract first.',
    )
  }
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'))
  return new anchor.Program(idl, provider)
}

export function getGamePDA(authority) {
  return PublicKey.findProgramAddressSync([Buffer.from('game'), authority.toBuffer()], PROGRAM_ID)
}

export function getVaultPDA(authority) {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), authority.toBuffer()], PROGRAM_ID)
}

export function getTicketPDA(game, player, round) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ticket'), game.toBuffer(), player.toBuffer(), Buffer.from([round])],
    PROGRAM_ID,
  )
}

export async function getSolBalance(pubkey) {
  const conn = getConnection()
  const balance = await conn.getBalance(pubkey)
  return balance / 1e9
}

export function fmtUsdc(raw) {
  const n = typeof raw === 'number' ? raw : Number(raw.toString())
  return (n / 1_000_000).toFixed(6)
}

export function flipToStr(r) {
  return r === 1 ? 'H' : r === 2 ? 'T' : '?'
}

export function parsePredictions(str) {
  const s = str.toUpperCase()
  if (s.length !== 14) throw new Error('Must be exactly 14 predictions (H or T)')
  const result = []
  for (let i = 0; i < 14; i++) {
    const c = s[i]
    if (c === 'H') result.push(1)
    else if (c === 'T') result.push(2)
    else throw new Error('Invalid char: ' + c)
  }
  return result
}
