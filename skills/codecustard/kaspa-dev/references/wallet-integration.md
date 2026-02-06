# Wallet Integration Guide

This guide covers integrating Kaspa into various wallet solutions including RainbowKit, OisyWallet, and custom wallet implementations.

## Wallet Adapter Pattern

The wallet adapter pattern provides a unified interface for different wallet types.

### TypeScript Interface

```typescript
interface KaspaWalletAdapter {
  // Connection
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean

  // Account
  getAddress(): Promise<string>
  getPublicKey(): Promise<string>
  getBalance(): Promise<bigint>

  // Signing
  signMessage(message: string): Promise<string>
  signTransaction(transaction: Transaction): Promise<Transaction>

  // Events
  on(event: 'connect' | 'disconnect' | 'accountChanged', callback: Function): void
  off(event: 'connect' | 'disconnect' | 'accountChanged', callback: Function): void
}
```

## Browser Extension Wallet

### Detecting Extension

```typescript
interface KaspaWindow {
  kaspa?: {
    isKaspaWallet: boolean
    connect: () => Promise<string[]>
    disconnect: () => Promise<void>
    getAddress: () => Promise<string>
    signMessage: (message: string) => Promise<string>
    signTransaction: (tx: any) => Promise<any>
    on: (event: string, callback: Function) => void
    off: (event: string, callback: Function) => void
  }
}

declare global {
  interface Window extends KaspaWindow {}
}

class BrowserExtensionAdapter implements KaspaWalletAdapter {
  private connected = false
  private address: string | null = null
  private listeners: Map<string, Function[]> = new Map()

  async connect(): Promise<void> {
    if (!window.kaspa) {
      throw new Error('Kaspa wallet extension not found')
    }

    const addresses = await window.kaspa.connect()
    this.address = addresses[0]
    this.connected = true

    // Setup event listeners
    window.kaspa.on('disconnect', this.handleDisconnect)
    window.kaspa.on('accountChanged', this.handleAccountChanged)
  }

  async disconnect(): Promise<void> {
    if (window.kaspa) {
      await window.kaspa.disconnect()
      window.kaspa.off('disconnect', this.handleDisconnect)
      window.kaspa.off('accountChanged', this.handleAccountChanged)
    }
    this.connected = false
    this.address = null
  }

  isConnected(): boolean {
    return this.connected
  }

  async getAddress(): Promise<string> {
    if (!this.address) {
      throw new Error('Wallet not connected')
    }
    return this.address
  }

  async getPublicKey(): Promise<string> {
    if (!window.kaspa) {
      throw new Error('Kaspa wallet extension not found')
    }
    // Implementation depends on wallet API
    return window.kaspa.getPublicKey?.() || ''
  }

  async getBalance(): Promise<bigint> {
    // Use RPC client to fetch balance
    const rpc = new RpcClient({
      url: 'wss://api.kaspa.org',
      network: NetworkType.Mainnet,
    })
    await rpc.connect()

    const response = await rpc.getBalanceByAddress({
      address: await this.getAddress(),
    })

    await rpc.disconnect()
    return response.balance
  }

  async signMessage(message: string): Promise<string> {
    if (!window.kaspa) {
      throw new Error('Kaspa wallet extension not found')
    }
    return window.kaspa.signMessage(message)
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!window.kaspa) {
      throw new Error('Kaspa wallet extension not found')
    }
    return window.kaspa.signTransaction(transaction)
  }

  on(event: 'connect' | 'disconnect' | 'accountChanged', callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: 'connect' | 'disconnect' | 'accountChanged', callback: Function): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private handleDisconnect = () => {
    this.connected = false
    this.address = null
    this.emit('disconnect')
  }

  private handleAccountChanged = (address: string) => {
    this.address = address
    this.emit('accountChanged', address)
  }

  private emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args))
    }
  }
}
```

## RainbowKit Integration

RainbowKit is a React library for wallet connection. Here's how to add Kaspa support:

### Custom Connector

```typescript
import { Connector } from 'wagmi'
import { kaspaWallet } from './kaspa-wallet'

export class KaspaConnector extends Connector {
  readonly id = 'kaspa'
  readonly name = 'Kaspa Wallet'
  readonly ready = true

  private provider: any = null

  async connect({ chainId }: { chainId?: number } = {}) {
    const provider = await this.getProvider()

    if (!provider) {
      throw new Error('Kaspa wallet not found')
    }

    const accounts = await provider.request({
      method: 'kaspa_requestAccounts',
    })

    const chain = await this.getChain()

    return {
      account: accounts[0],
      chain,
      provider,
    }
  }

  async disconnect() {
    const provider = await this.getProvider()
    if (provider) {
      await provider.request({ method: 'kaspa_disconnect' })
    }
  }

  async getAccount() {
    const provider = await this.getProvider()
    const accounts = await provider.request({
      method: 'kaspa_accounts',
    })
    return accounts[0]
  }

  async getChain() {
    return {
      id: 111111, // Kaspa chain ID
      name: 'Kaspa',
      network: 'kaspa',
      nativeCurrency: {
        name: 'Kaspa',
        symbol: 'KAS',
        decimals: 8,
      },
      rpcUrls: {
        default: 'wss://api.kaspa.org',
      },
    }
  }

  async getProvider() {
    if (this.provider) return this.provider

    if (typeof window !== 'undefined' && window.kaspa) {
      this.provider = window.kaspa
    }

    return this.provider
  }

  async isAuthorized() {
    try {
      const account = await this.getAccount()
      return !!account
    } catch {
      return false
    }
  }

  onAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      this.emit('disconnect')
    } else {
      this.emit('change', { account: accounts[0] })
    }
  }

  onChainChanged(chainId: number) {
    this.emit('change', { chain: { id: chainId } })
  }

  onDisconnect() {
    this.emit('disconnect')
  }
}
```

### RainbowKit Configuration

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { KaspaConnector } from './kaspa-connector'

const config = getDefaultConfig({
  appName: 'My Kaspa App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [
    {
      id: 111111,
      name: 'Kaspa',
      network: 'kaspa',
      nativeCurrency: {
        name: 'Kaspa',
        symbol: 'KAS',
        decimals: 8,
      },
      rpcUrls: {
        default: { http: ['https://api.kaspa.org'] },
      },
    },
  ],
  connectors: [new KaspaConnector()],
})
```

### React Hook

```typescript
import { useState, useEffect } from 'react'
import { KaspaWalletAdapter } from './types'

export function useKaspaWallet() {
  const [adapter] = useState(() => new BrowserExtensionAdapter())
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<bigint | null>(null)

  useEffect(() => {
    adapter.on('connect', () => setConnected(true))
    adapter.on('disconnect', () => {
      setConnected(false)
      setAddress(null)
      setBalance(null)
    })
    adapter.on('accountChanged', (addr: string) => setAddress(addr))

    return () => {
      adapter.off('connect', () => setConnected(true))
      adapter.off('disconnect', () => setConnected(false))
    }
  }, [adapter])

  const connect = async () => {
    await adapter.connect()
    const addr = await adapter.getAddress()
    setAddress(addr)
    setConnected(true)

    // Fetch balance
    const bal = await adapter.getBalance()
    setBalance(bal)
  }

  const disconnect = async () => {
    await adapter.disconnect()
  }

  const sendTransaction = async (recipient: string, amount: bigint) => {
    // Build and sign transaction
    // Implementation depends on your transaction building logic
  }

  return {
    connected,
    address,
    balance,
    connect,
    disconnect,
    sendTransaction,
    signMessage: adapter.signMessage.bind(adapter),
  }
}
```

## OisyWallet Integration

OisyWallet is an Internet Computer-based wallet. Integration requires cross-chain communication:

### IC Integration

```typescript
import { Actor, HttpAgent } from '@dfinity/agent'
import { idlFactory } from './kaspa.did'

class OisyKaspaAdapter implements KaspaWalletAdapter {
  private actor: any
  private connected = false

  async connect(): Promise<void> {
    const agent = new HttpAgent({ host: 'https://ic0.app' })

    this.actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: 'YOUR_CANISTER_ID',
    })

    // Authenticate with Internet Identity
    const authClient = await AuthClient.create()
    await authClient.login({
      identityProvider: 'https://identity.ic0.app',
    })

    this.connected = true
  }

  async getAddress(): Promise<string> {
    if (!this.connected) throw new Error('Not connected')
    return this.actor.get_kaspa_address()
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.connected) throw new Error('Not connected')
    return this.actor.sign_transaction(transaction)
  }

  // ... other methods
}
```

### Motoko Canister Interface

```motoko
import Kaspa "mo:kaspa";

actor {
  stable var kaspaAddress : Text = "";

  public func getKaspaAddress() : async Text {
    if (kaspaAddress == "") {
      kaspaAddress := await Kaspa.generateAddress();
    };
    kaspaAddress
  };

  public func signTransaction(tx : Kaspa.Transaction) : async Kaspa.SignedTransaction {
    await Kaspa.sign(tx, kaspaAddress)
  };

  public func getBalance() : async Nat64 {
    await Kaspa.getBalance(kaspaAddress)
  };
}
```

## Hardware Wallet Integration

### Ledger Integration

```typescript
import TransportWebUSB from '@ledgerhq/hw-transport-webusb'
import KaspaApp from '@ledgerhq/hw-app-kaspa'

class LedgerAdapter implements KaspaWalletAdapter {
  private transport: any
  private app: any
  private connected = false
  private path = "44'/111111'/0'/0/0"

  async connect(): Promise<void> {
    this.transport = await TransportWebUSB.create()
    this.app = new KaspaApp(this.transport)
    this.connected = true
  }

  async getAddress(): Promise<string> {
    const result = await this.app.getAddress(this.path)
    return result.address
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    const signature = await this.app.signTransaction(this.path, transaction.serialize())

    // Apply signature to transaction
    transaction.inputs[0].signatureScript = signature
    return transaction
  }

  async disconnect(): Promise<void> {
    await this.transport.close()
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  // ... other methods
}
```

## Wallet UI Components

### React Connect Button

```tsx
import React from 'react'
import { useKaspaWallet } from './useKaspaWallet'

export const KaspaConnectButton: React.FC = () => {
  const { connected, address, connect, disconnect } = useKaspaWallet()

  if (connected) {
    return (
      <button onClick={disconnect}>
        {address?.slice(0, 6)}...{address?.slice(-4)} (Disconnect)
      </button>
    )
  }

  return <button onClick={connect}>Connect Kaspa Wallet</button>
}
```

### Balance Display

```tsx
import React, { useEffect, useState } from 'react'
import { useKaspaWallet } from './useKaspaWallet'

export const KaspaBalance: React.FC = () => {
  const { connected, address } = useKaspaWallet()
  const [balance, setBalance] = useState<bigint | null>(null)

  useEffect(() => {
    if (connected && address) {
      fetchBalance()
    }
  }, [connected, address])

  const fetchBalance = async () => {
    const rpc = new RpcClient({
      url: 'wss://api.kaspa.org',
      network: NetworkType.Mainnet,
    })
    await rpc.connect()

    const response = await rpc.getBalanceByAddress({ address })
    setBalance(response.balance)

    await rpc.disconnect()
  }

  if (!connected) return null

  return <div>Balance: {balance ? `${Number(balance) / 100000000} KAS` : 'Loading...'}</div>
}
```

## Security Best Practices

1. **Never store private keys** in browser storage
2. **Use secure communication** (HTTPS/WSS)
3. **Validate all addresses** before transactions
4. **Implement transaction confirmation** dialogs
5. **Use Content Security Policy** headers
6. **Audit dependencies** regularly
7. **Test on testnet** before mainnet

## Error Handling

```typescript
class WalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error,
  ) {
    super(message)
    this.name = 'WalletError'
  }
}

// Usage
async function safeConnect(adapter: KaspaWalletAdapter) {
  try {
    await adapter.connect()
  } catch (error) {
    if (error.message.includes('not found')) {
      throw new WalletError('Kaspa wallet extension not installed', 'WALLET_NOT_FOUND', error)
    }
    throw new WalletError('Failed to connect wallet', 'CONNECTION_FAILED', error)
  }
}
```

## Resources

- **RainbowKit Docs**: https://www.rainbowkit.com/
- **Wagmi Docs**: https://wagmi.sh/
- **Internet Computer**: https://internetcomputer.org/
- **Ledger Docs**: https://developers.ledger.com/
- **Kaspa GitHub**: https://github.com/kaspanet
