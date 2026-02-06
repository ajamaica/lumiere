import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import bs58 from 'bs58'
import { keccak_256 } from 'js-sha3'
import nacl from 'tweetnacl'

export interface PoseidonConfig {
  apiUrl: string
  rpcUrl: string
  frontendUrl?: string
  burnerKey?: string
}

const DEFAULT_CONFIG: PoseidonConfig = {
  apiUrl: process.env.POSEIDON_API_URL || 'https://poseidon.cash',
  rpcUrl: process.env.POSEIDON_RPC_URL || 'https://api.mainnet-beta.solana.com',
  frontendUrl: process.env.POSEIDON_FRONTEND_URL || 'https://poseidon.cash',
  burnerKey: process.env.POSEIDON_BURNER_KEY,
}

const OTC_PROGRAM_ID = new PublicKey('AfiRReYhvykHhKXhwjhcsXFejHdxqYLk2QLWnjvvLKUN')

export interface TokenSlot {
  mint: string
  amount: number
  decimals: number
}

export interface TradeRoom {
  roomId: string
  status: string
  partyA: string
  partyB: string | null
  numericRoomId?: number
  partyAIdentityHash?: string
  partyAIdentitySecret?: string
  partyBIdentitySecret?: string
  partyAAmount?: number
  partyATokenMint?: string
  partyATokenDecimals?: number
  partyATokenSlots?: TokenSlot[]
  partyBAmount?: number
  partyBTokenMint?: string
  partyBTokenDecimals?: number
  partyBTokenSlots?: TokenSlot[]
  partyAFirstConfirm: boolean
  partyASecondConfirm: boolean
  partyBFirstConfirm: boolean
  partyBSecondConfirm: boolean
  partyAReceiveWallet?: string
  partyBReceiveWallet?: string
  partyALockupDuration: number | null
  partyBLockupDuration: number | null
  partyAProposedLockup?: number | null
  partyBProposedLockup?: number | null
  partyAAcceptsLockup?: boolean
  partyBAcceptsLockup?: boolean
  partyALockupEndTime?: number | null
  partyBLockupEndTime?: number | null
  partyAClaimed?: boolean
  partyBClaimed?: boolean
  executeTxSignature?: string
  cancelTxSignature?: string
  createdAt: number
  expiresAt: number
  lastActivity?: number
}

export interface RoomResult {
  success: boolean
  roomId?: string
  link?: string
  txSignature?: string
  error?: string
}

export interface JoinResult {
  success: boolean
  txSignature?: string
  error?: string
}

export interface OfferResult {
  success: boolean
  error?: string
  txSignature?: string
}

export interface ConfirmResult {
  success: boolean
  error?: string
}

export interface ExecuteResult {
  success: boolean
  txSignature?: string
  error?: string
}

// WebSocket Event Types
export type WebSocketEventType =
  | 'full-state'
  | 'join'
  | 'offer'
  | 'confirm'
  | 'lockup'
  | 'execute'
  | 'cancel'
  | 'terminated'
  | 'error'

export interface WebSocketEvent {
  type: WebSocketEventType
  roomId: string
  data: any
  timestamp: number
}

export type WebSocketEventHandler = (event: WebSocketEvent) => void

export interface WebSocketConnection {
  roomId: string
  ws: WebSocket
  handlers: Set<WebSocketEventHandler>
}

function generateIdentitySecret(): string {
  return bs58.encode(nacl.randomBytes(32))
}

function hashIdentity(secret: string): string {
  return keccak_256(secret)
}

function generateRoomId(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
}

function deriveRoomPDA(numericId: number, identityHash: string): [PublicKey, number] {
  const hashBuffer = Buffer.from(identityHash, 'hex')
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('trade_room'),
      Buffer.from(new BigUint64Array([BigInt(numericId)]).buffer),
      hashBuffer,
    ],
    OTC_PROGRAM_ID,
  )
}

function buildAuthMessage(
  roomId: string,
  timestamp: number,
  action: string = 'Authenticate',
): string {
  return `Poseidon OTC Trade Room

Room: ${roomId.slice(0, 8)}...${roomId.slice(-4)}
Action: ${action}

By signing, you confirm wallet ownership.
This signature is valid for this session.

[${roomId}:${timestamp}]`
}

export class PoseidonOTC {
  private config: PoseidonConfig
  private connection: Connection
  private wallet: Keypair | null = null

  constructor(config: Partial<PoseidonConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.connection = new Connection(this.config.rpcUrl, 'confirmed')

    if (this.config.burnerKey) {
      try {
        this.wallet = Keypair.fromSecretKey(bs58.decode(this.config.burnerKey))
      } catch {
        this.wallet = null
      }
    }
  }

  getWalletAddress(): string | null {
    return this.wallet?.publicKey.toBase58() || null
  }

  async getBalance(): Promise<{ sol: number }> {
    if (!this.wallet) throw new Error('No wallet configured')
    const lamports = await this.connection.getBalance(this.wallet.publicKey)
    return { sol: lamports / LAMPORTS_PER_SOL }
  }

  isAutonomous(): boolean {
    return this.wallet !== null
  }

  private sign(message: string): string {
    if (!this.wallet) throw new Error('No wallet configured')
    const bytes = new TextEncoder().encode(message)
    const sig = nacl.sign.detached(bytes, this.wallet.secretKey)
    return bs58.encode(sig)
  }

  private async authHeaders(roomId: string): Promise<Record<string, string>> {
    if (!this.wallet) return { 'Content-Type': 'application/json' }

    const ts = Date.now()
    const msg = buildAuthMessage(roomId, ts)
    const sig = this.sign(msg)

    return {
      'Content-Type': 'application/json',
      'X-Wallet': this.wallet.publicKey.toBase58(),
      'X-Signature': sig,
      'X-Timestamp': ts.toString(),
    }
  }

  async createRoom(
    options: {
      inviteCode?: string
      lockupDuration?: number
      expiresIn?: number
    } = {},
  ): Promise<RoomResult> {
    try {
      const identitySecret = generateIdentitySecret()
      const identityHash = hashIdentity(identitySecret)
      const numericId = generateRoomId()
      const [roomPDA] = deriveRoomPDA(numericId, identityHash)
      const roomId = roomPDA.toBase58()

      const body: Record<string, any> = {
        roomId,
        numericRoomId: numericId,
        partyAIdentitySecret: identitySecret,
        partyAIdentityHash: identityHash,
        expiresIn: options.expiresIn || 3600,
      }

      if (options.inviteCode) {
        body.inviteCodeHash = keccak_256(options.inviteCode)
      }

      if (options.lockupDuration) {
        body.lockupDuration = options.lockupDuration
      }

      if (this.wallet) {
        body.partyA = this.wallet.publicKey.toBase58()

        const txSig = await this.createRoomOnchain(numericId, identityHash, options)
        body.txSignature = txSig

        const res = await fetch(`${this.config.apiUrl}/api/trade-rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const err = (await res.json()) as { message?: string; error?: string }
          return { success: false, error: err.message || err.error || 'API error' }
        }

        return {
          success: true,
          roomId,
          link: `${this.config.frontendUrl}/trade-room/${roomId}`,
          txSignature: txSig,
        }
      }

      body.partyA = 'PENDING'

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to create room' }
      }

      return {
        success: true,
        roomId,
        link: `${this.config.frontendUrl}/trade-room/${roomId}`,
      }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  private async createRoomOnchain(
    numericId: number,
    identityHash: string,
    options: { inviteCode?: string; expiresIn?: number },
  ): Promise<string> {
    if (!this.wallet) throw new Error('No wallet')

    const discriminator = Buffer.from([186, 111, 137, 54, 4, 161, 218, 221])

    const roomIdBuf = Buffer.alloc(8)
    roomIdBuf.writeBigUInt64LE(BigInt(numericId))

    const hashBuf = Buffer.from(identityHash, 'hex')

    const inviteCodeBuf = options.inviteCode
      ? Buffer.concat([Buffer.from([1]), Buffer.from(keccak_256(options.inviteCode), 'hex')])
      : Buffer.from([0])

    const expiresBuf = Buffer.alloc(8)
    expiresBuf.writeBigInt64LE(BigInt(options.expiresIn || 3600))

    const data = Buffer.concat([discriminator, roomIdBuf, hashBuf, inviteCodeBuf, expiresBuf])

    const [roomPDA] = deriveRoomPDA(numericId, identityHash)

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: roomPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: OTC_PROGRAM_ID,
      data,
    })

    const tx = new Transaction().add(ix)
    return await sendAndConfirmTransaction(this.connection, tx, [this.wallet])
  }

  async getRoom(roomId: string): Promise<TradeRoom | null> {
    try {
      let url = `${this.config.apiUrl}/api/trade-rooms/${roomId}`

      if (this.wallet) {
        const ts = Date.now()
        const msg = buildAuthMessage(roomId, ts)
        const sig = this.sign(msg)
        url += `?wallet=${this.wallet.publicKey.toBase58()}&signature=${encodeURIComponent(sig)}&ts=${ts}`
      }

      const res = await fetch(url)
      if (!res.ok) return null

      return (await res.json()) as TradeRoom
    } catch {
      return null
    }
  }

  async getUserRooms(wallet?: string): Promise<TradeRoom[]> {
    try {
      const address = wallet || this.wallet?.publicKey.toBase58()
      if (!address) return []

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/user/${address}`)
      if (!res.ok) return []

      const data = (await res.json()) as { rooms: TradeRoom[] }
      return data.rooms || []
    } catch {
      return []
    }
  }

  getRoomLink(roomId: string): string {
    return `${this.config.frontendUrl}/trade-room/${roomId}`
  }

  async joinRoom(roomId: string, inviteCode?: string): Promise<JoinResult> {
    if (!this.wallet) {
      return {
        success: false,
        error: `Wallet required. Visit: ${this.getRoomLink(roomId)}`,
      }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }
      if (!room.numericRoomId || !room.partyAIdentityHash) {
        return { success: false, error: 'Room missing required data for on-chain join' }
      }
      if (room.partyB) {
        return { success: false, error: 'Room already has Party B' }
      }

      const identitySecret = generateIdentitySecret()
      const identityHash = hashIdentity(identitySecret)

      let txSignature: string
      try {
        txSignature = await this.joinRoomOnchain(
          room.numericRoomId,
          room.partyAIdentityHash,
          identityHash,
          inviteCode,
        )
        if (!txSignature) {
          return { success: false, error: 'On-chain join returned empty tx signature' }
        }
        console.log('[joinRoom] On-chain join tx:', txSignature)
      } catch (err: any) {
        console.error('[joinRoom] On-chain join error:', err)
        return { success: false, error: `On-chain join failed: ${err.message}` }
      }

      const ts = Date.now()
      const msg = buildAuthMessage(roomId, ts, 'Join as Party B')
      const sig = this.sign(msg)

      const body: Record<string, any> = {
        wallet: this.wallet.publicKey.toBase58(),
        partyB: this.wallet.publicKey.toBase58(),
        partyBIdentitySecret: identitySecret,
        txSignature,
        signature: sig,
        ts,
      }

      if (inviteCode) {
        body.inviteCode = inviteCode
      }

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to join' }
      }

      return { success: true, txSignature }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  private async joinRoomOnchain(
    numericRoomId: number,
    partyAIdentityHash: string,
    partyBIdentityHash: string,
    inviteCode?: string,
  ): Promise<string> {
    if (!this.wallet) throw new Error('No wallet')

    const discriminator = Buffer.from([110, 166, 248, 232, 70, 49, 186, 195])

    const roomIdBuf = Buffer.alloc(8)
    roomIdBuf.writeBigUInt64LE(BigInt(numericRoomId))

    const partyAHashBuf = Buffer.from(partyAIdentityHash, 'hex')
    const partyBHashBuf = Buffer.from(partyBIdentityHash, 'hex')

    let inviteCodeBuf: Buffer
    if (inviteCode) {
      const codeBytes = new TextEncoder().encode(inviteCode)
      const lenBuf = Buffer.alloc(4)
      lenBuf.writeUInt32LE(codeBytes.length)
      inviteCodeBuf = Buffer.concat([Buffer.from([1]), lenBuf, Buffer.from(codeBytes)])
    } else {
      inviteCodeBuf = Buffer.from([0])
    }

    const data = Buffer.concat([
      discriminator,
      roomIdBuf,
      partyAHashBuf,
      partyBHashBuf,
      inviteCodeBuf,
    ])

    const [roomPDA] = deriveRoomPDA(numericRoomId, partyAIdentityHash)

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: roomPDA, isSigner: false, isWritable: true },
      ],
      programId: OTC_PROGRAM_ID,
      data,
    })

    const tx = new Transaction().add(ix)
    return await sendAndConfirmTransaction(this.connection, tx, [this.wallet])
  }

  private async depositOnchain(
    numericRoomId: number,
    partyAIdentityHash: string,
    isPartyA: boolean,
    identitySecret: string,
    tokenMint: string,
    amount: number,
    slotIndex: number,
  ): Promise<string> {
    if (!this.wallet) throw new Error('No wallet')

    const RELAYER_PUBKEY = new PublicKey('8Ty6oaUGbauTp1ZwLNQ2ZCSvRXTC24waFvLD7ctiVnuv')
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')

    const mintPubkey = new PublicKey(tokenMint)
    const partyAHashBuf = Buffer.from(partyAIdentityHash, 'hex')
    const roomIdBuf = Buffer.alloc(8)
    roomIdBuf.writeBigUInt64LE(BigInt(numericRoomId))

    const [tradeRoomPDA] = deriveRoomPDA(numericRoomId, partyAIdentityHash)

    const [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_authority'), roomIdBuf, partyAHashBuf],
      OTC_PROGRAM_ID,
    )

    const [escrowTokenAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('room_escrow'),
        roomIdBuf,
        partyAHashBuf,
        mintPubkey.toBuffer(),
        Buffer.from([isPartyA ? 1 : 0]),
      ],
      OTC_PROGRAM_ID,
    )

    const tx = new Transaction()

    const escrowInfo = await this.connection.getAccountInfo(escrowTokenAccount)
    if (!escrowInfo) {
      const initDiscriminator = Buffer.from([70, 46, 40, 23, 6, 11, 81, 139])
      const initData = Buffer.concat([
        initDiscriminator,
        roomIdBuf,
        partyAHashBuf,
        Buffer.from([1]),
        Buffer.from([isPartyA ? 1 : 0]),
      ])

      const initIx = new TransactionInstruction({
        programId: OTC_PROGRAM_ID,
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: tradeRoomPDA, isSigner: false, isWritable: false },
          { pubkey: mintPubkey, isSigner: false, isWritable: false },
          { pubkey: escrowAuthority, isSigner: false, isWritable: false },
          { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          {
            pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
            isSigner: false,
            isWritable: false,
          },
        ],
        data: initData,
      })
      tx.add(initIx)
    }

    const {
      getAssociatedTokenAddressSync,
      createAssociatedTokenAccountIdempotentInstruction,
      createSyncNativeInstruction,
    } = await import('@solana/spl-token')
    const userATA = getAssociatedTokenAddressSync(mintPubkey, this.wallet.publicKey)

    if (mintPubkey.equals(WSOL_MINT)) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          this.wallet.publicKey,
          userATA,
          this.wallet.publicKey,
          WSOL_MINT,
        ),
      )
      tx.add(
        SystemProgram.transfer({
          fromPubkey: this.wallet.publicKey,
          toPubkey: userATA,
          lamports: amount,
        }),
      )
      tx.add(createSyncNativeInstruction(userATA))
    }

    const updateDiscriminator = Buffer.from([191, 70, 15, 66, 224, 2, 249, 223])
    const identitySecretBuf = Buffer.from(identitySecret, 'utf-8')
    const identitySecretLenBuf = Buffer.alloc(4)
    identitySecretLenBuf.writeUInt32LE(identitySecretBuf.length)

    const deltaBuf = Buffer.alloc(8)
    deltaBuf.writeBigInt64LE(BigInt(amount))

    const updateData = Buffer.concat([
      updateDiscriminator,
      roomIdBuf,
      partyAHashBuf,
      Buffer.from([isPartyA ? 1 : 0]),
      identitySecretLenBuf,
      identitySecretBuf,
      mintPubkey.toBuffer(),
      Buffer.from([slotIndex]),
      deltaBuf,
      Buffer.from([1]),
      Buffer.from([0]),
    ])

    const updateIx = new TransactionInstruction({
      programId: OTC_PROGRAM_ID,
      keys: [
        { pubkey: RELAYER_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: tradeRoomPDA, isSigner: false, isWritable: true },
        { pubkey: userATA, isSigner: false, isWritable: true },
        { pubkey: escrowAuthority, isSigner: false, isWritable: false },
        { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: RELAYER_PUBKEY, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: updateData,
    })
    tx.add(updateIx)

    return await sendAndConfirmTransaction(this.connection, tx, [this.wallet])
  }

  async updateOffer(
    roomId: string,
    tokens: { mint: string; amount: number; decimals: number }[],
  ): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }
      if (!room.numericRoomId || !room.partyAIdentityHash) {
        return { success: false, error: 'Room missing on-chain data' }
      }

      const isPartyA = room.partyA === this.wallet.publicKey.toBase58()
      const isPartyB = room.partyB === this.wallet.publicKey.toBase58()

      if (!isPartyA && !isPartyB) {
        return { success: false, error: 'Not a participant' }
      }

      const identitySecret = isPartyA ? room.partyAIdentitySecret : room.partyBIdentitySecret
      if (!identitySecret) {
        return { success: false, error: 'Missing identity secret' }
      }

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        const txSig = await this.depositOnchain(
          room.numericRoomId,
          room.partyAIdentityHash,
          isPartyA,
          identitySecret,
          token.mint,
          token.amount,
          i,
        )
        console.log(`[updateOffer] Deposited slot ${i}:`, txSig)
      }

      const ts = Date.now()
      const msg = buildAuthMessage(roomId, ts)
      const sig = this.sign(msg)

      const prefix = isPartyA ? 'partyA' : 'partyB'
      const body: Record<string, any> = {
        wallet: this.wallet.publicKey.toBase58(),
        signature: sig,
        ts,
      }

      tokens.forEach((t, i) => {
        body[`${prefix}TokenSlots`] = body[`${prefix}TokenSlots`] || []
        body[`${prefix}TokenSlots`].push({
          mint: t.mint,
          amount: t.amount,
          decimals: t.decimals,
        })
      })

      if (tokens.length === 1) {
        body[`${prefix}Amount`] = tokens[0].amount
        body[`${prefix}TokenMint`] = tokens[0].mint
        body[`${prefix}TokenDecimals`] = tokens[0].decimals
      }

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to update' }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  private async withdrawOnchain(
    numericRoomId: number,
    partyAIdentityHash: string,
    isPartyA: boolean,
    identitySecret: string,
    tokenMint: string,
    amount: number,
    slotIndex: number,
  ): Promise<string> {
    if (!this.wallet) throw new Error('No wallet')

    const RELAYER_PUBKEY = new PublicKey('8Ty6oaUGbauTp1ZwLNQ2ZCSvRXTC24waFvLD7ctiVnuv')
    const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

    const mintPubkey = new PublicKey(tokenMint)
    const partyAHashBuf = Buffer.from(partyAIdentityHash, 'hex')
    const roomIdBuf = Buffer.alloc(8)
    roomIdBuf.writeBigUInt64LE(BigInt(numericRoomId))

    const [tradeRoomPDA] = deriveRoomPDA(numericRoomId, partyAIdentityHash)

    const [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_authority'), roomIdBuf, partyAHashBuf],
      OTC_PROGRAM_ID,
    )

    const [escrowTokenAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('room_escrow'),
        roomIdBuf,
        partyAHashBuf,
        mintPubkey.toBuffer(),
        Buffer.from([isPartyA ? 1 : 0]),
      ],
      OTC_PROGRAM_ID,
    )

    // Query the escrow account to determine which token program owns it
    const escrowInfo = await this.connection.getAccountInfo(escrowTokenAccount)
    if (!escrowInfo) {
      throw new Error('Escrow account not found - nothing to withdraw')
    }
    // Use the account owner as the token program
    const tokenProgramId = escrowInfo.owner
    console.log('[withdrawOnchain] Using token program:', tokenProgramId.toBase58())

    const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
    const userATA = getAssociatedTokenAddressSync(
      mintPubkey,
      this.wallet.publicKey,
      false,
      tokenProgramId,
    )

    // update_offer discriminator with negative delta = withdraw
    const updateDiscriminator = Buffer.from([191, 70, 15, 66, 224, 2, 249, 223])
    const identitySecretBuf = Buffer.from(identitySecret, 'utf-8')
    const identitySecretLenBuf = Buffer.alloc(4)
    identitySecretLenBuf.writeUInt32LE(identitySecretBuf.length)

    // Negative delta = withdraw
    const deltaBuf = Buffer.alloc(8)
    deltaBuf.writeBigInt64LE(BigInt(-amount))

    // Determine token_standard from token program (1 = SPL Token, 2 = Token-2022)
    const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
    const tokenStandard = tokenProgramId.toBase58() === TOKEN_2022_PROGRAM_ID ? 2 : 1

    // UpdateOfferArgs: room_id, party_a_identity_hash, is_party_a, identity_secret, token_mint, slot_index, delta, token_standard, receive_account
    const updateData = Buffer.concat([
      updateDiscriminator,
      roomIdBuf, // room_id: u64
      partyAHashBuf, // party_a_identity_hash: [u8; 32]
      Buffer.from([isPartyA ? 1 : 0]), // is_party_a: bool
      identitySecretLenBuf, // identity_secret length prefix
      identitySecretBuf, // identity_secret data
      mintPubkey.toBuffer(), // token_mint: Pubkey
      Buffer.from([slotIndex]), // slot_index: u8
      deltaBuf, // delta: i64 (negative for withdraw)
      Buffer.from([tokenStandard]), // token_standard: u8 (1=SPL, 2=Token2022)
      Buffer.from([0]), // receive_account: Option<Pubkey> = None
    ])

    const ix = new TransactionInstruction({
      programId: OTC_PROGRAM_ID,
      keys: [
        { pubkey: RELAYER_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: tradeRoomPDA, isSigner: false, isWritable: true },
        { pubkey: userATA, isSigner: false, isWritable: true },
        { pubkey: escrowAuthority, isSigner: false, isWritable: false },
        { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: RELAYER_PUBKEY, isSigner: false, isWritable: true },
        { pubkey: tokenProgramId, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: updateData,
    })

    const tx = new Transaction().add(ix)
    return await sendAndConfirmTransaction(this.connection, tx, [this.wallet])
  }

  async withdrawFromOffer(
    roomId: string,
    tokens: { mint: string; amount: number; slotIndex: number }[],
  ): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }
      if (!room.numericRoomId || !room.partyAIdentityHash) {
        return { success: false, error: 'Room missing on-chain data' }
      }

      const isPartyA = room.partyA === this.wallet.publicKey.toBase58()
      const isPartyB = room.partyB === this.wallet.publicKey.toBase58()

      if (!isPartyA && !isPartyB) {
        return { success: false, error: 'Not a participant' }
      }

      const identitySecret = isPartyA ? room.partyAIdentitySecret : room.partyBIdentitySecret
      if (!identitySecret) {
        return { success: false, error: 'Missing identity secret' }
      }

      for (const token of tokens) {
        const txSig = await this.withdrawOnchain(
          room.numericRoomId,
          room.partyAIdentityHash,
          isPartyA,
          identitySecret,
          token.mint,
          token.amount,
          token.slotIndex,
        )
        console.log(`[withdrawFromOffer] Withdrew slot ${token.slotIndex}:`, txSig)
      }

      // Update API to reflect withdrawal
      const ts = Date.now()
      const msg = buildAuthMessage(roomId, ts)
      const sig = this.sign(msg)

      const prefix = isPartyA ? 'partyA' : 'partyB'
      const currentSlots = isPartyA ? room.partyATokenSlots || [] : room.partyBTokenSlots || []

      // Remove withdrawn tokens from slots
      const updatedSlots = currentSlots.filter(
        (slot: TokenSlot, idx: number) => !tokens.some((t) => t.slotIndex === idx),
      )

      const body: Record<string, any> = {
        wallet: this.wallet.publicKey.toBase58(),
        signature: sig,
        ts,
        [`${prefix}TokenSlots`]: updatedSlots,
      }

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to update' }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  private async confirmTradeOnchain(
    numericRoomId: number,
    partyAIdentityHash: string,
    isPartyA: boolean,
    identitySecret: string,
  ): Promise<string> {
    if (!this.wallet) throw new Error('No wallet')

    const RELAYER_PUBKEY = new PublicKey('8Ty6oaUGbauTp1ZwLNQ2ZCSvRXTC24waFvLD7ctiVnuv')

    // confirm_trade_room discriminator: [68, 224, 251, 46, 228, 54, 148, 30]
    const discriminator = Buffer.from([68, 224, 251, 46, 228, 54, 148, 30])

    const roomIdBuf = Buffer.alloc(8)
    roomIdBuf.writeBigUInt64LE(BigInt(numericRoomId))

    const partyAHashBuf = Buffer.from(partyAIdentityHash, 'hex')

    const identitySecretBuf = Buffer.from(identitySecret, 'utf-8')
    const identitySecretLenBuf = Buffer.alloc(4)
    identitySecretLenBuf.writeUInt32LE(identitySecretBuf.length)

    // ConfirmTradeArgs: room_id (u64), party_a_identity_hash ([u8;32]), is_party_a (bool), identity_secret (bytes)
    const data = Buffer.concat([
      discriminator,
      roomIdBuf,
      partyAHashBuf,
      Buffer.from([isPartyA ? 1 : 0]),
      identitySecretLenBuf,
      identitySecretBuf,
    ])

    const [roomPDA] = deriveRoomPDA(numericRoomId, partyAIdentityHash)

    const ix = new TransactionInstruction({
      programId: OTC_PROGRAM_ID,
      keys: [
        { pubkey: RELAYER_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: roomPDA, isSigner: false, isWritable: true },
      ],
      data,
    })

    const tx = new Transaction().add(ix)
    return await sendAndConfirmTransaction(this.connection, tx, [this.wallet])
  }

  async confirmTrade(roomId: string, stage: 'first' | 'second'): Promise<ConfirmResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }
      if (!room.numericRoomId || !room.partyAIdentityHash) {
        return { success: false, error: 'Room missing on-chain data' }
      }

      const isPartyA = room.partyA === this.wallet.publicKey.toBase58()
      const isPartyB = room.partyB === this.wallet.publicKey.toBase58()

      if (!isPartyA && !isPartyB) {
        return { success: false, error: 'Not a participant' }
      }

      const identitySecret = isPartyA ? room.partyAIdentitySecret : room.partyBIdentitySecret
      if (!identitySecret) {
        return { success: false, error: 'Missing identity secret' }
      }

      // On-chain confirm - both first and second confirm use same instruction
      // The program tracks confirmation state internally
      let txSignature: string | undefined
      try {
        txSignature = await this.confirmTradeOnchain(
          room.numericRoomId,
          room.partyAIdentityHash,
          isPartyA,
          identitySecret,
        )
        console.log(`[confirmTrade] On-chain confirm (${stage}):`, txSignature)
      } catch (err: any) {
        console.error('[confirmTrade] On-chain confirm error:', err)
        return { success: false, error: `On-chain confirm failed: ${err.message}` }
      }

      // Update API state
      const ts = Date.now()
      const msg = buildAuthMessage(roomId, ts)
      const sig = this.sign(msg)

      const prefix = isPartyA ? 'partyA' : 'partyB'
      const field = stage === 'first' ? `${prefix}FirstConfirm` : `${prefix}SecondConfirm`

      const body: Record<string, any> = {
        wallet: this.wallet.publicKey.toBase58(),
        signature: sig,
        ts,
        [field]: true,
        txSignature,
      }

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to confirm' }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async setLockup(roomId: string, durationSeconds: number): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }

      const isPartyA = room.partyA === this.wallet.publicKey.toBase58()
      const isPartyB = room.partyB === this.wallet.publicKey.toBase58()

      if (!isPartyA && !isPartyB) {
        return { success: false, error: 'Not a participant' }
      }

      const ts = Date.now()
      const msg = buildAuthMessage(roomId, ts)
      const sig = this.sign(msg)

      const field = isPartyA ? 'partyALockupDuration' : 'partyBLockupDuration'

      const body: Record<string, any> = {
        wallet: this.wallet.publicKey.toBase58(),
        signature: sig,
        ts,
        [field]: durationSeconds,
      }

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to set lockup' }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async cancelRoom(roomId: string): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }
      if (!room.numericRoomId || !room.partyAIdentityHash) {
        return { success: false, error: 'Room missing on-chain data' }
      }

      // Debug: log what slots we have
      console.log('[cancelRoom] Room data for slots:', {
        partyATokenSlots: room.partyATokenSlots,
        partyBTokenSlots: room.partyBTokenSlots,
        partyAAmount: (room as any).partyAAmount,
        partyBAmount: (room as any).partyBAmount,
        partyATokenMint: (room as any).partyATokenMint,
        partyBTokenMint: (room as any).partyBTokenMint,
      })

      const isPartyA = room.partyA === this.wallet.publicKey.toBase58()
      const isPartyB = room.partyB === this.wallet.publicKey.toBase58()

      if (!isPartyA && !isPartyB) {
        return { success: false, error: 'Not a participant' }
      }

      const identitySecret = isPartyA ? room.partyAIdentitySecret : room.partyBIdentitySecret
      if (!identitySecret) {
        return { success: false, error: 'Missing identity secret' }
      }

      // Build slot arrays for refund - need to provide token accounts for both parties
      const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
      const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

      // Native SOL mint (wSOL)
      const NATIVE_MINT = 'So11111111111111111111111111111111111111112'

      // Try to build slots from partyATokenSlots OR from legacy single-token fields
      let partyASlots: any[] = []
      if (room.partyATokenSlots && room.partyATokenSlots.length > 0) {
        partyASlots = room.partyATokenSlots.map((slot: TokenSlot, idx: number) => {
          const mintPubkey = new PublicKey(slot.mint)
          const partyAWallet = new PublicKey(room.partyA)
          const tokenAccount = getAssociatedTokenAddressSync(
            mintPubkey,
            partyAWallet,
            false,
            SPL_TOKEN_PROGRAM_ID,
          )
          const isWsol = slot.mint === NATIVE_MINT
          return {
            mint: slot.mint,
            tokenAccount: tokenAccount.toBase58(),
            amount: slot.amount,
            tokenStandard: 1,
            slotIndex: idx,
            // For wSOL: include userWallet so API can add it for native SOL unwrap
            ...(isWsol && { userWallet: room.partyA }),
          }
        })
      } else if ((room as any).partyATokenMint && (room as any).partyAAmount) {
        // Fallback to legacy single-token fields
        const mintPubkey = new PublicKey((room as any).partyATokenMint)
        const partyAWallet = new PublicKey(room.partyA)
        const tokenAccount = getAssociatedTokenAddressSync(
          mintPubkey,
          partyAWallet,
          false,
          SPL_TOKEN_PROGRAM_ID,
        )
        const isWsol = (room as any).partyATokenMint === NATIVE_MINT
        partyASlots = [
          {
            mint: (room as any).partyATokenMint,
            tokenAccount: tokenAccount.toBase58(),
            amount: (room as any).partyAAmount,
            tokenStandard: 1,
            slotIndex: 0,
            // For wSOL: include userWallet so API can add it for native SOL unwrap
            ...(isWsol && { userWallet: room.partyA }),
          },
        ]
      }

      let partyBSlots: any[] = []
      if (room.partyB) {
        if (room.partyBTokenSlots && room.partyBTokenSlots.length > 0) {
          partyBSlots = room.partyBTokenSlots.map((slot: TokenSlot, idx: number) => {
            const mintPubkey = new PublicKey(slot.mint)
            const partyBWallet = new PublicKey(room.partyB!)
            const tokenAccount = getAssociatedTokenAddressSync(
              mintPubkey,
              partyBWallet,
              false,
              SPL_TOKEN_PROGRAM_ID,
            )
            const isWsol = slot.mint === NATIVE_MINT
            return {
              mint: slot.mint,
              tokenAccount: tokenAccount.toBase58(),
              amount: slot.amount,
              tokenStandard: 1,
              slotIndex: idx,
              // For wSOL: include userWallet so API can add it for native SOL unwrap
              ...(isWsol && { userWallet: room.partyB }),
            }
          })
        } else if ((room as any).partyBTokenMint && (room as any).partyBAmount) {
          // Fallback to legacy single-token fields
          const mintPubkey = new PublicKey((room as any).partyBTokenMint)
          const partyBWallet = new PublicKey(room.partyB)
          const tokenAccount = getAssociatedTokenAddressSync(
            mintPubkey,
            partyBWallet,
            false,
            SPL_TOKEN_PROGRAM_ID,
          )
          const isWsol = (room as any).partyBTokenMint === NATIVE_MINT
          partyBSlots = [
            {
              mint: (room as any).partyBTokenMint,
              tokenAccount: tokenAccount.toBase58(),
              amount: (room as any).partyBAmount,
              tokenStandard: 1,
              slotIndex: 0,
              // For wSOL: include userWallet so API can add it for native SOL unwrap
              ...(isWsol && { userWallet: room.partyB }),
            },
          ]
        }
      }

      console.log('[cancelRoom] Calling cancel-onchain with:', {
        roomId,
        numericRoomId: room.numericRoomId,
        isPartyA,
        partyASlots: partyASlots.map((s) => ({
          mint: s.mint?.slice(0, 8),
          userWallet: s.userWallet?.slice(0, 8),
        })),
        partyBSlots: partyBSlots.map((s) => ({
          mint: s.mint?.slice(0, 8),
          userWallet: s.userWallet?.slice(0, 8),
        })),
      })

      // Send cancel request to the CORRECT endpoint: /cancel-onchain
      // The API will execute the on-chain cancel_trade_room using the relayer
      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/cancel-onchain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          numericRoomId: room.numericRoomId,
          partyAIdentityHash: room.partyAIdentityHash,
          partyAIdentitySecret: room.partyAIdentitySecret, // Needed for on-chain verification
          isPartyA,
          identitySecret,
          partyASlots,
          partyBSlots,
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to cancel' }
      }

      const result = (await res.json()) as { txSignature?: string }
      console.log('[cancelRoom] Cancel successful, tx:', result.txSignature)

      return { success: true, txSignature: result.txSignature }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  /**
   * Claim locked tokens after the lockup period has ended.
   * After a swap with lockup, each party can claim their received tokens once the lockup expires.
   *
   * @param roomId - The trade room ID
   * @returns Result with txSignature if successful
   */
  async claimLockedTokens(roomId: string): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }

      const isPartyA = room.partyA === this.wallet.publicKey.toBase58()
      const isPartyB = room.partyB === this.wallet.publicKey.toBase58()

      if (!isPartyA && !isPartyB) {
        return { success: false, error: 'Not a participant in this trade' }
      }

      // Check room is completed (swap executed)
      if (room.status !== 'completed') {
        return {
          success: false,
          error: `Cannot claim - room status is '${room.status}', must be 'completed'`,
        }
      }

      // Check if already claimed
      const alreadyClaimed = isPartyA ? room.partyAClaimed : room.partyBClaimed
      if (alreadyClaimed) {
        return { success: false, error: 'You have already claimed your tokens' }
      }

      // Get identity secret
      const identitySecret = isPartyA ? room.partyAIdentitySecret : room.partyBIdentitySecret
      if (!identitySecret) {
        return { success: false, error: 'Missing identity secret - cannot prove ownership' }
      }

      // When claiming, you receive the COUNTERPARTY's tokens
      // Party A deposited partyATokenSlots -> Party B claims these
      // Party B deposited partyBTokenSlots -> Party A claims these
      const slotsToReceive = isPartyA ? room.partyBTokenSlots : room.partyATokenSlots

      // Fallback to legacy single-token fields
      let tokenSlots: Array<{ mint: string; amount: number; tokenStandard: number }> = []

      if (slotsToReceive && slotsToReceive.length > 0) {
        tokenSlots = slotsToReceive.map((slot: TokenSlot) => ({
          mint: slot.mint,
          amount: slot.amount,
          tokenStandard: 1, // SPL Token
        }))
      } else {
        // Legacy fallback - Party A claims Party B's token, vice versa
        const legacyMint = isPartyA ? (room as any).partyBTokenMint : (room as any).partyATokenMint
        const legacyAmount = isPartyA ? (room as any).partyBAmount : (room as any).partyAAmount

        if (legacyMint && legacyAmount) {
          tokenSlots = [
            {
              mint: legacyMint,
              amount: legacyAmount,
              tokenStandard: 1,
            },
          ]
        } else {
          return { success: false, error: 'No token slots found to claim' }
        }
      }

      console.log('[claimLockedTokens] Claiming tokens:', {
        roomId,
        isPartyA,
        tokenSlots: tokenSlots.map((s) => ({ mint: s.mint.slice(0, 8), amount: s.amount })),
      })

      // Call the claim-locked API endpoint
      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/claim-locked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          numericRoomId: room.numericRoomId,
          partyAIdentityHash: room.partyAIdentityHash,
          isPartyA,
          identitySecret,
          tokenSlots,
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to claim tokens' }
      }

      const result = (await res.json()) as { txSignature?: string; signature?: string }
      const txSig = result.txSignature || result.signature
      console.log('[claimLockedTokens] Claim successful, tx:', txSig)

      return { success: true, txSignature: txSig }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  /**
   * Check if the current user can claim their locked tokens.
   * Returns info about lockup status and whether claiming is available.
   *
   * @param roomId - The trade room ID
   * @returns Lockup status info
   */
  async getLockupStatus(roomId: string): Promise<{
    canClaim: boolean
    lockupEndTime: number | null
    timeRemaining: number | null
    alreadyClaimed: boolean
    error?: string
  }> {
    try {
      const room = await this.getRoom(roomId)
      if (!room) {
        return {
          canClaim: false,
          lockupEndTime: null,
          timeRemaining: null,
          alreadyClaimed: false,
          error: 'Room not found',
        }
      }

      const isPartyA = this.wallet?.publicKey.toBase58() === room.partyA
      const isPartyB = this.wallet?.publicKey.toBase58() === room.partyB

      if (!isPartyA && !isPartyB) {
        return {
          canClaim: false,
          lockupEndTime: null,
          timeRemaining: null,
          alreadyClaimed: false,
          error: 'Not a participant',
        }
      }

      // Check if room is completed
      if (room.status !== 'completed') {
        return {
          canClaim: false,
          lockupEndTime: null,
          timeRemaining: null,
          alreadyClaimed: false,
          error: `Room status is '${room.status}'`,
        }
      }

      const lockupEndTime = isPartyA ? room.partyALockupEndTime : room.partyBLockupEndTime
      const alreadyClaimed = isPartyA
        ? (room.partyAClaimed ?? false)
        : (room.partyBClaimed ?? false)

      // If no lockup end time set, tokens are immediately available
      if (!lockupEndTime) {
        return {
          canClaim: !alreadyClaimed,
          lockupEndTime: null,
          timeRemaining: 0,
          alreadyClaimed,
        }
      }

      const now = Date.now()
      const endTimeMs = lockupEndTime * 1000 // Convert seconds to ms
      const timeRemaining = Math.max(0, endTimeMs - now)
      const canClaim = timeRemaining === 0 && !alreadyClaimed

      return {
        canClaim,
        lockupEndTime: endTimeMs,
        timeRemaining,
        alreadyClaimed,
      }
    } catch (e: any) {
      return {
        canClaim: false,
        lockupEndTime: null,
        timeRemaining: null,
        alreadyClaimed: false,
        error: e.message,
      }
    }
  }

  async declineOffer(roomId: string): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }

      const isPartyA = room.partyA === this.wallet.publicKey.toBase58()
      const isPartyB = room.partyB === this.wallet.publicKey.toBase58()

      if (!isPartyA && !isPartyB) {
        return { success: false, error: 'Not a participant' }
      }

      // Declining resets confirmations - counterparty must re-confirm
      const ts = Date.now()
      const msg = buildAuthMessage(roomId, ts)
      const sig = this.sign(msg)

      const prefix = isPartyA ? 'partyA' : 'partyB'

      const body: Record<string, any> = {
        wallet: this.wallet.publicKey.toBase58(),
        signature: sig,
        ts,
        [`${prefix}FirstConfirm`]: false,
        [`${prefix}SecondConfirm`]: false,
        declined: true,
      }

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to decline' }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async setReceiveWallet(roomId: string, receiveWallet: string): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }

      const isPartyA = room.partyA === this.wallet.publicKey.toBase58()
      const isPartyB = room.partyB === this.wallet.publicKey.toBase58()

      if (!isPartyA && !isPartyB) {
        return { success: false, error: 'Not a participant' }
      }

      const ts = Date.now()
      const msg = buildAuthMessage(roomId, ts)
      const sig = this.sign(msg)

      const field = isPartyA ? 'partyAReceiveWallet' : 'partyBReceiveWallet'

      const body: Record<string, any> = {
        wallet: this.wallet.publicKey.toBase58(),
        signature: sig,
        ts,
        [field]: receiveWallet,
      }

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to set receive wallet' }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  private async setLockupOnchain(
    numericRoomId: number,
    partyAIdentityHash: string,
    isPartyA: boolean,
    identitySecret: string,
    lockupDurationSeconds: number | null,
  ): Promise<string> {
    if (!this.wallet) throw new Error('No wallet')

    const partyAHashBuf = Buffer.from(partyAIdentityHash, 'hex')
    const roomIdBuf = Buffer.alloc(8)
    roomIdBuf.writeBigUInt64LE(BigInt(numericRoomId))

    const [tradeRoomPDA] = deriveRoomPDA(numericRoomId, partyAIdentityHash)

    // set_lockup discriminator: [44, 170, 189, 40, 128, 123, 252, 201]
    const discriminator = Buffer.from([44, 170, 189, 40, 128, 123, 252, 201])

    const identitySecretBuf = Buffer.from(identitySecret, 'utf-8')
    const identitySecretLenBuf = Buffer.alloc(4)
    identitySecretLenBuf.writeUInt32LE(identitySecretBuf.length)

    // lockup_duration is Option<i64>: 0 = None, 1 + i64 = Some(value)
    let lockupDurationBuf: Buffer
    if (lockupDurationSeconds === null) {
      lockupDurationBuf = Buffer.from([0]) // None
    } else {
      const valueBuf = Buffer.alloc(8)
      valueBuf.writeBigInt64LE(BigInt(lockupDurationSeconds))
      lockupDurationBuf = Buffer.concat([Buffer.from([1]), valueBuf]) // Some(value)
    }

    const data = Buffer.concat([
      discriminator,
      roomIdBuf, // room_id: u64
      partyAHashBuf, // party_a_identity_hash: [u8; 32]
      Buffer.from([isPartyA ? 1 : 0]), // is_party_a: bool
      identitySecretLenBuf, // identity_secret length
      identitySecretBuf, // identity_secret data
      lockupDurationBuf, // lockup_duration: Option<i64>
    ])

    const ix = new TransactionInstruction({
      programId: OTC_PROGRAM_ID,
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: tradeRoomPDA, isSigner: false, isWritable: true },
      ],
      data,
    })

    const tx = new Transaction().add(ix)
    return await sendAndConfirmTransaction(this.connection, tx, [this.wallet])
  }

  private async acceptLockupOnchain(
    numericRoomId: number,
    partyAIdentityHash: string,
    isPartyA: boolean,
    identitySecret: string,
  ): Promise<string> {
    if (!this.wallet) throw new Error('No wallet')

    const partyAHashBuf = Buffer.from(partyAIdentityHash, 'hex')
    const roomIdBuf = Buffer.alloc(8)
    roomIdBuf.writeBigUInt64LE(BigInt(numericRoomId))

    const [tradeRoomPDA] = deriveRoomPDA(numericRoomId, partyAIdentityHash)

    // accept_lockup discriminator: [147, 240, 36, 65, 182, 54, 94, 234]
    const discriminator = Buffer.from([147, 240, 36, 65, 182, 54, 94, 234])

    const identitySecretBuf = Buffer.from(identitySecret, 'utf-8')
    const identitySecretLenBuf = Buffer.alloc(4)
    identitySecretLenBuf.writeUInt32LE(identitySecretBuf.length)

    const data = Buffer.concat([
      discriminator,
      roomIdBuf, // room_id: u64
      partyAHashBuf, // party_a_identity_hash: [u8; 32]
      Buffer.from([isPartyA ? 1 : 0]), // is_party_a: bool
      identitySecretLenBuf, // identity_secret length
      identitySecretBuf, // identity_secret data
    ])

    const ix = new TransactionInstruction({
      programId: OTC_PROGRAM_ID,
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: tradeRoomPDA, isSigner: false, isWritable: true },
      ],
      data,
    })

    const tx = new Transaction().add(ix)
    return await sendAndConfirmTransaction(this.connection, tx, [this.wallet])
  }

  async acceptLockup(roomId: string): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }
      if (!room.numericRoomId || !room.partyAIdentityHash) {
        return { success: false, error: 'Room missing on-chain data' }
      }

      const isPartyA = room.partyA === this.wallet.publicKey.toBase58()
      const isPartyB = room.partyB === this.wallet.publicKey.toBase58()

      if (!isPartyA && !isPartyB) {
        return { success: false, error: 'Not a participant' }
      }

      const identitySecret = isPartyA ? room.partyAIdentitySecret : room.partyBIdentitySecret
      if (!identitySecret) {
        return { success: false, error: 'Missing identity secret' }
      }

      // Call on-chain accept_lockup instruction
      const txSig = await this.acceptLockupOnchain(
        room.numericRoomId,
        room.partyAIdentityHash,
        isPartyA,
        identitySecret,
      )
      console.log('[acceptLockup] On-chain accept tx:', txSig)

      // Also update API
      const ts = Date.now()
      const msg = buildAuthMessage(roomId, ts)
      const sig = this.sign(msg)

      const field = isPartyA ? 'partyAAcceptsLockup' : 'partyBAcceptsLockup'

      const body: Record<string, any> = {
        wallet: this.wallet.publicKey.toBase58(),
        signature: sig,
        ts,
        [field]: true,
      }

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to accept lockup' }
      }

      return { success: true, txSignature: txSig }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async proposeLockup(roomId: string, durationSeconds: number): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }
      if (!room.numericRoomId || !room.partyAIdentityHash) {
        return { success: false, error: 'Room missing on-chain data' }
      }

      const isPartyA = room.partyA === this.wallet.publicKey.toBase58()
      const isPartyB = room.partyB === this.wallet.publicKey.toBase58()

      if (!isPartyA && !isPartyB) {
        return { success: false, error: 'Not a participant' }
      }

      const identitySecret = isPartyA ? room.partyAIdentitySecret : room.partyBIdentitySecret
      if (!identitySecret) {
        return { success: false, error: 'Missing identity secret' }
      }

      // Call on-chain set_lockup instruction
      const txSig = await this.setLockupOnchain(
        room.numericRoomId,
        room.partyAIdentityHash,
        isPartyA,
        identitySecret,
        durationSeconds,
      )
      console.log('[proposeLockup] On-chain set_lockup tx:', txSig)

      // Also update API for UI visibility
      const ts = Date.now()
      const msg = buildAuthMessage(roomId, ts)
      const sig = this.sign(msg)

      const field = isPartyA ? 'partyAProposedLockup' : 'partyBProposedLockup'

      const body: Record<string, any> = {
        wallet: this.wallet.publicKey.toBase58(),
        signature: sig,
        ts,
        [field]: durationSeconds,
      }

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to propose lockup' }
      }

      return { success: true, txSignature: txSig }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async terminateRoom(roomId: string, reason?: string): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const ts = Date.now()
      const msg = buildAuthMessage(roomId, ts)
      const sig = this.sign(msg)

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterWallet: this.wallet.publicKey.toBase58(),
          signature: sig,
          ts,
          reason,
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to terminate' }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async addWitness(roomId: string, witnessWallet: string): Promise<OfferResult> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    try {
      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}/add-witness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterWallet: this.wallet.publicKey.toBase58(),
          witnessWallet,
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to add witness' }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async executeSwap(roomId: string): Promise<ExecuteResult> {
    try {
      const room = await this.getRoom(roomId)
      if (!room) return { success: false, error: 'Room not found' }
      if (!room.numericRoomId || !room.partyAIdentityHash) {
        return { success: false, error: 'Room missing on-chain data' }
      }

      // API returns executedPartyASlots/executedPartyBSlots or partyATokenSlots/partyBTokenSlots
      const roomAny = room as any
      const partyATokens =
        roomAny.executedPartyASlots || roomAny.partyATokenSlots || room.partyATokenSlots || []
      const partyBTokens =
        roomAny.executedPartyBSlots || roomAny.partyBTokenSlots || room.partyBTokenSlots || []

      console.log('[executeSwap] Party A tokens:', partyATokens)
      console.log('[executeSwap] Party B tokens:', partyBTokens)

      if (partyATokens.length === 0 && partyBTokens.length === 0) {
        return {
          success: false,
          error: 'No tokens deposited - both parties must deposit before executing',
        }
      }

      // Import spl-token for ATA derivation
      const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')

      // Party A's tokens go to Party B - derive Party B's ATA for each token
      const partyBOwner = new PublicKey(room.partyBReceiveWallet || room.partyB!)
      const partyASlots = partyATokens.map((s: TokenSlot) => {
        const mintPubkey = new PublicKey(s.mint)
        const recipientATA = getAssociatedTokenAddressSync(mintPubkey, partyBOwner)
        return {
          mint: s.mint,
          amount: s.amount,
          tokenStandard: s.mint === 'So11111111111111111111111111111111111111112' ? 1 : 2,
          recipientTokenAccount: recipientATA.toBase58(),
          recipientOwner: partyBOwner.toBase58(),
          decimals: s.decimals,
        }
      })

      // Party B's tokens go to Party A - derive Party A's ATA for each token
      const partyAOwner = new PublicKey(room.partyAReceiveWallet || room.partyA)
      const partyBSlots = partyBTokens.map((s: TokenSlot) => {
        const mintPubkey = new PublicKey(s.mint)
        const recipientATA = getAssociatedTokenAddressSync(mintPubkey, partyAOwner)
        return {
          mint: s.mint,
          amount: s.amount,
          tokenStandard: s.mint === 'So11111111111111111111111111111111111111112' ? 1 : 2,
          recipientTokenAccount: recipientATA.toBase58(),
          recipientOwner: partyAOwner.toBase58(),
          decimals: s.decimals,
        }
      })

      console.log('[executeSwap] Sending to API:', { partyASlots, partyBSlots })

      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/execute-swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          numericRoomId: room.numericRoomId,
          partyAIdentityHash: room.partyAIdentityHash,
          partyASlots,
          partyBSlots,
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to execute swap' }
      }

      const data = (await res.json()) as { signature?: string }
      return { success: true, txSignature: data.signature }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async markExecuted(roomId: string, txSignature: string): Promise<OfferResult> {
    try {
      const res = await fetch(`${this.config.apiUrl}/api/trade-rooms/${roomId}/mark-executed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txSignature }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { message?: string; error?: string }
        return { success: false, error: err.message || err.error || 'Failed to mark executed' }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  // ============ WebSocket Methods ============

  private wsConnections: Map<string, WebSocketConnection> = new Map()

  /**
   * Get the WebSocket URL for trade rooms
   */
  getWebSocketUrl(): string {
    const apiUrl = this.config.apiUrl
    const wsUrl = apiUrl.replace(/^http/, 'ws')
    return `${wsUrl}/ws/trade-room`
  }

  /**
   * Subscribe to real-time updates for a trade room.
   * Receives events: full-state, join, offer, confirm, lockup, execute, cancel, terminated, error
   *
   * @param roomId - The trade room ID to subscribe to
   * @param handler - Callback function for events
   * @returns Unsubscribe function
   */
  async subscribeToRoom(
    roomId: string,
    handler: WebSocketEventHandler,
  ): Promise<{ success: boolean; unsubscribe: () => void; error?: string }> {
    if (!this.wallet) {
      return {
        success: false,
        unsubscribe: () => {},
        error: 'Wallet required for WebSocket subscription',
      }
    }

    try {
      // Check if we already have a connection to this room
      let connection = this.wsConnections.get(roomId)

      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        // Add handler to existing connection
        connection.handlers.add(handler)
        return {
          success: true,
          unsubscribe: () => this.removeHandler(roomId, handler),
        }
      }

      // Create new WebSocket connection
      const wsUrl = this.getWebSocketUrl()
      const ws = new WebSocket(wsUrl)

      connection = {
        roomId,
        ws,
        handlers: new Set([handler]),
      }
      this.wsConnections.set(roomId, connection)

      return new Promise((resolve) => {
        ws.onopen = () => {
          // Send subscribe message with wallet signature
          const ts = Date.now()
          const msg = buildAuthMessage(roomId, ts)
          const sig = this.sign(msg)

          ws.send(
            JSON.stringify({
              type: 'subscribe',
              roomId,
              walletAddress: this.wallet!.publicKey.toBase58(),
              signature: sig,
              timestamp: ts,
            }),
          )

          resolve({
            success: true,
            unsubscribe: () => this.unsubscribeFromRoom(roomId, handler),
          })
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const wsEvent: WebSocketEvent = {
              type: data.type,
              roomId,
              data: data,
              timestamp: Date.now(),
            }

            // Dispatch to all handlers for this room
            const conn = this.wsConnections.get(roomId)
            if (conn) {
              conn.handlers.forEach((h) => h(wsEvent))
            }
          } catch (e) {
            console.error('[WebSocket] Failed to parse message:', e)
          }
        }

        ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error)
          const conn = this.wsConnections.get(roomId)
          if (conn) {
            conn.handlers.forEach((h) =>
              h({
                type: 'error',
                roomId,
                data: { error: 'WebSocket error' },
                timestamp: Date.now(),
              }),
            )
          }
        }

        ws.onclose = () => {
          this.wsConnections.delete(roomId)
        }

        // Timeout for connection
        setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close()
            resolve({
              success: false,
              unsubscribe: () => {},
              error: 'WebSocket connection timeout',
            })
          }
        }, 10000)
      })
    } catch (e: any) {
      return { success: false, unsubscribe: () => {}, error: e.message }
    }
  }

  /**
   * Unsubscribe from room updates
   */
  private unsubscribeFromRoom(roomId: string, handler: WebSocketEventHandler): void {
    const connection = this.wsConnections.get(roomId)
    if (!connection) return

    connection.handlers.delete(handler)

    // If no more handlers, close the connection
    if (connection.handlers.size === 0) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(
          JSON.stringify({
            type: 'unsubscribe',
            roomId,
          }),
        )
        connection.ws.close()
      }
      this.wsConnections.delete(roomId)
    }
  }

  /**
   * Remove a specific handler without closing connection
   */
  private removeHandler(roomId: string, handler: WebSocketEventHandler): void {
    const connection = this.wsConnections.get(roomId)
    if (connection) {
      connection.handlers.delete(handler)
    }
  }

  /**
   * Send an offer update via WebSocket (real-time)
   */
  async sendOfferViaWs(
    roomId: string,
    tokens: TokenSlot[],
  ): Promise<{ success: boolean; error?: string }> {
    const connection = this.wsConnections.get(roomId)
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return { success: false, error: 'Not connected to room' }
    }

    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    const ts = Date.now()
    const msg = buildAuthMessage(roomId, ts)
    const sig = this.sign(msg)

    connection.ws.send(
      JSON.stringify({
        type: 'update-offer',
        roomId,
        walletAddress: this.wallet.publicKey.toBase58(),
        signature: sig,
        timestamp: ts,
        tokens,
      }),
    )

    return { success: true }
  }

  /**
   * Send confirmation via WebSocket (real-time)
   */
  async sendConfirmViaWs(
    roomId: string,
    stage: 'first' | 'second',
  ): Promise<{ success: boolean; error?: string }> {
    const connection = this.wsConnections.get(roomId)
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return { success: false, error: 'Not connected to room' }
    }

    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    const ts = Date.now()
    const msg = buildAuthMessage(roomId, ts)
    const sig = this.sign(msg)

    connection.ws.send(
      JSON.stringify({
        type: 'confirm',
        roomId,
        walletAddress: this.wallet.publicKey.toBase58(),
        signature: sig,
        timestamp: ts,
        stage,
      }),
    )

    return { success: true }
  }

  /**
   * Propose lockup via WebSocket (real-time)
   */
  async sendLockupProposalViaWs(
    roomId: string,
    duration: number,
  ): Promise<{ success: boolean; error?: string }> {
    const connection = this.wsConnections.get(roomId)
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return { success: false, error: 'Not connected to room' }
    }

    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    const ts = Date.now()
    const msg = buildAuthMessage(roomId, ts)
    const sig = this.sign(msg)

    connection.ws.send(
      JSON.stringify({
        type: 'propose-lockup',
        roomId,
        walletAddress: this.wallet.publicKey.toBase58(),
        signature: sig,
        timestamp: ts,
        duration,
      }),
    )

    return { success: true }
  }

  /**
   * Accept lockup via WebSocket (real-time)
   */
  async sendAcceptLockupViaWs(roomId: string): Promise<{ success: boolean; error?: string }> {
    const connection = this.wsConnections.get(roomId)
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return { success: false, error: 'Not connected to room' }
    }

    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    const ts = Date.now()
    const msg = buildAuthMessage(roomId, ts)
    const sig = this.sign(msg)

    connection.ws.send(
      JSON.stringify({
        type: 'accept-lockup',
        roomId,
        walletAddress: this.wallet.publicKey.toBase58(),
        signature: sig,
        timestamp: ts,
      }),
    )

    return { success: true }
  }

  /**
   * Request swap execution via WebSocket (real-time)
   */
  async sendExecuteViaWs(roomId: string): Promise<{ success: boolean; error?: string }> {
    const connection = this.wsConnections.get(roomId)
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return { success: false, error: 'Not connected to room' }
    }

    if (!this.wallet) {
      return { success: false, error: 'Wallet required' }
    }

    const ts = Date.now()
    const msg = buildAuthMessage(roomId, ts)
    const sig = this.sign(msg)

    connection.ws.send(
      JSON.stringify({
        type: 'execute',
        roomId,
        walletAddress: this.wallet.publicKey.toBase58(),
        signature: sig,
        timestamp: ts,
      }),
    )

    return { success: true }
  }

  /**
   * Close all WebSocket connections
   */
  closeAllConnections(): void {
    for (const [roomId, connection] of this.wsConnections) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({ type: 'unsubscribe', roomId }))
        connection.ws.close()
      }
    }
    this.wsConnections.clear()
  }

  /**
   * Check if connected to a room via WebSocket
   */
  isConnectedToRoom(roomId: string): boolean {
    const connection = this.wsConnections.get(roomId)
    return connection !== undefined && connection.ws.readyState === WebSocket.OPEN
  }
}

export const skill = {
  name: 'poseidon-otc',
  description: 'Trustless P2P token swaps on Solana',
  version: '1.0.0',
  author: 'Poseidon Cash',

  config: {
    apiUrl: {
      type: 'string',
      description: 'Poseidon API endpoint',
      default: 'https://api.poseidon.cash',
    },
    rpcUrl: {
      type: 'string',
      description: 'Solana RPC endpoint',
      default: 'https://api.mainnet-beta.solana.com',
    },
    burnerKey: {
      type: 'string',
      description: 'Base58 private key for autonomous execution',
      secret: true,
    },
  },

  actions: {
    createRoom: {
      description: 'Create a new P2P trade room',
      parameters: {
        inviteCode: {
          type: 'string',
          description: 'Optional invite code for private rooms',
          optional: true,
        },
        lockupDuration: {
          type: 'number',
          description: 'Lock counterparty tokens (seconds)',
          optional: true,
        },
        expiresIn: { type: 'number', description: 'Room expiry time in seconds', optional: true },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.createRoom(params)
      },
    },

    getRoom: {
      description: 'Get trade room details',
      parameters: {
        roomId: { type: 'string', description: 'Room ID or full link' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        const id = params.roomId.includes('/trade-room/')
          ? params.roomId.split('/trade-room/')[1].split('?')[0]
          : params.roomId
        const room = await client.getRoom(id)
        return room || { error: 'Room not found' }
      },
    },

    getUserRooms: {
      description: 'Get all rooms for a wallet',
      parameters: {
        wallet: {
          type: 'string',
          description: 'Wallet address (optional if burner configured)',
          optional: true,
        },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.getUserRooms(params.wallet)
      },
    },

    joinRoom: {
      description: 'Join a trade room as counterparty',
      parameters: {
        roomId: { type: 'string', description: 'Room ID or full link' },
        inviteCode: { type: 'string', description: 'Invite code if required', optional: true },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        const id = params.roomId.includes('/trade-room/')
          ? params.roomId.split('/trade-room/')[1].split('?')[0]
          : params.roomId
        return client.joinRoom(id, params.inviteCode)
      },
    },

    updateOffer: {
      description: 'Set tokens to offer in the trade',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
        tokens: {
          type: 'array',
          description: 'Array of {mint, amount, decimals}',
          items: { type: 'object' },
        },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.updateOffer(params.roomId, params.tokens)
      },
    },

    confirm: {
      description: 'Confirm trade (first or second stage)',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
        stage: { type: 'string', description: 'first or second' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.confirmTrade(params.roomId, params.stage)
      },
    },

    setLockup: {
      description: 'Set lockup duration on counterparty tokens',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
        duration: { type: 'number', description: 'Lockup duration in seconds' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.setLockup(params.roomId, params.duration)
      },
    },

    cancel: {
      description: 'Cancel room and refund deposits',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.cancelRoom(params.roomId)
      },
    },

    decline: {
      description: 'Decline current offer (resets confirmations, keeps deposits)',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.declineOffer(params.roomId)
      },
    },

    withdraw: {
      description: 'Withdraw deposited tokens from your offer (before confirmation)',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
        tokens: {
          type: 'array',
          description: 'Array of {mint, amount, slotIndex} to withdraw',
          items: { type: 'object' },
        },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.withdrawFromOffer(params.roomId, params.tokens)
      },
    },

    setReceiveWallet: {
      description: 'Set a different wallet to receive tokens (privacy feature)',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
        receiveWallet: { type: 'string', description: 'Wallet address to receive tokens' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.setReceiveWallet(params.roomId, params.receiveWallet)
      },
    },

    acceptLockup: {
      description: 'Accept the lockup duration set by counterparty',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.acceptLockup(params.roomId)
      },
    },

    proposeLockup: {
      description: 'Propose a lockup duration (visible to counterparty before confirmation)',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
        duration: { type: 'number', description: 'Lockup duration in seconds' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.proposeLockup(params.roomId, params.duration)
      },
    },

    terminate: {
      description: 'Terminate room and close all connections',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
        reason: { type: 'string', description: 'Termination reason', optional: true },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.terminateRoom(params.roomId, params.reason)
      },
    },

    addWitness: {
      description: 'Add a witness to observe the trade (Party A only)',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
        witnessWallet: { type: 'string', description: 'Witness wallet address' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.addWitness(params.roomId, params.witnessWallet)
      },
    },

    getLink: {
      description: 'Get shareable link to a room',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return { link: client.getRoomLink(params.roomId) }
      },
    },

    execute: {
      description: 'Execute the swap after both parties confirm',
      parameters: {
        roomId: { type: 'string', description: 'Room ID' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return client.executeSwap(params.roomId)
      },
    },

    getBalance: {
      description: 'Check burner wallet SOL balance',
      parameters: {},
      handler: async (_: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        if (!client.isAutonomous()) return { error: 'No burner wallet' }
        const balance = await client.getBalance()
        return { wallet: client.getWalletAddress(), ...balance }
      },
    },

    status: {
      description: 'Check skill mode and wallet',
      parameters: {},
      handler: async (_: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return {
          autonomous: client.isAutonomous(),
          wallet: client.getWalletAddress(),
          mode: client.isAutonomous() ? 'burner' : 'link',
          api: config.apiUrl,
          wsUrl: client.getWebSocketUrl(),
        }
      },
    },

    // ============ WebSocket Actions ============

    getWebSocketUrl: {
      description: 'Get the WebSocket URL for real-time trade room updates',
      parameters: {},
      handler: async (_: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        return { wsUrl: client.getWebSocketUrl() }
      },
    },

    subscribeInfo: {
      description: 'Get information on how to subscribe to real-time room updates via WebSocket',
      parameters: {
        roomId: { type: 'string', description: 'Room ID to subscribe to' },
      },
      handler: async (params: any, config: PoseidonConfig) => {
        const client = new PoseidonOTC(config)
        if (!client.isAutonomous()) {
          return { error: 'Wallet required for WebSocket subscription' }
        }
        return {
          wsUrl: client.getWebSocketUrl(),
          roomId: params.roomId,
          wallet: client.getWalletAddress(),
          instructions:
            'Connect to wsUrl, send subscribe message with roomId, walletAddress, and signature',
          incomingEvents: [
            'full-state',
            'join',
            'offer',
            'confirm',
            'lockup',
            'execute',
            'cancel',
            'terminated',
            'error',
          ],
          outgoingMessages: [
            'subscribe',
            'unsubscribe',
            'update-offer',
            'confirm',
            'set-lockup',
            'accept-lockup',
            'propose-lockup',
            'execute',
          ],
        }
      },
    },
  },

  examples: [
    {
      prompt: 'Create an OTC trade room',
      action: 'createRoom',
      params: {},
    },
    {
      prompt: 'Create a private OTC room with invite code "secret123"',
      action: 'createRoom',
      params: { inviteCode: 'secret123' },
    },
    {
      prompt: 'Check trade room XYZ status',
      action: 'getRoom',
      params: { roomId: 'XYZ' },
    },
    {
      prompt: 'Join the trade at poseidon.cash/trade-room/ABC',
      action: 'joinRoom',
      params: { roomId: 'ABC' },
    },
    {
      prompt: 'Offer 100 USDC in room ABC',
      action: 'updateOffer',
      params: {
        roomId: 'ABC',
        tokens: [
          { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 100000000, decimals: 6 },
        ],
      },
    },
    {
      prompt: 'Confirm the trade in room ABC',
      action: 'confirm',
      params: { roomId: 'ABC', stage: 'first' },
    },
    {
      prompt: 'Lock counterparty tokens for 1 hour in room ABC',
      action: 'setLockup',
      params: { roomId: 'ABC', duration: 3600 },
    },
    {
      prompt: 'Cancel trade room ABC',
      action: 'cancel',
      params: { roomId: 'ABC' },
    },
    {
      prompt: 'Decline the current offer in room ABC',
      action: 'decline',
      params: { roomId: 'ABC' },
    },
    {
      prompt: 'Withdraw my USDC from room ABC',
      action: 'withdraw',
      params: {
        roomId: 'ABC',
        tokens: [
          { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 100000000, slotIndex: 0 },
        ],
      },
    },
    {
      prompt: 'Set my receive wallet to a cold wallet',
      action: 'setReceiveWallet',
      params: { roomId: 'ABC', receiveWallet: 'ColdWallet111...' },
    },
    {
      prompt: 'Accept the lockup in room ABC',
      action: 'acceptLockup',
      params: { roomId: 'ABC' },
    },
    {
      prompt: 'Add my friend as a witness to this trade',
      action: 'addWitness',
      params: { roomId: 'ABC', witnessWallet: 'Friend111...' },
    },
    {
      prompt: 'Get my active trades',
      action: 'getUserRooms',
      params: {},
    },
    {
      prompt: 'Execute the swap in room ABC',
      action: 'execute',
      params: { roomId: 'ABC' },
    },
    {
      prompt: 'Get WebSocket URL for real-time updates',
      action: 'getWebSocketUrl',
      params: {},
    },
    {
      prompt: 'How do I subscribe to room updates in real-time?',
      action: 'subscribeInfo',
      params: { roomId: 'ABC' },
    },
  ],
}

export default skill
