/**
 * Working Solana Actions endpoints - tested from server environment
 */

export const TOKENS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  PYUSD: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
}

export function resolveMint(symbolOrMint: string): string {
  return TOKENS[symbolOrMint.toUpperCase()] || symbolOrMint
}

export const JUPITER = {
  // GET endpoint for metadata (uses symbol format like SOL-USDC)
  getSwapMetadata: (inputSymbol: string, outputSymbol: string) =>
    `https://worker.jup.ag/blinks/swap/${inputSymbol}-${outputSymbol}`,

  // POST endpoint for transaction (uses full mint addresses)
  postSwapTx: (inputMint: string, outputMint: string, amount: string) =>
    `https://worker.jup.ag/blinks/swap/${inputMint}/${outputMint}/${amount}`,
}

export const RAYDIUM = {
  getSwapMetadata: () => 'https://share.raydium.io/dialect/actions/swap/info',

  postSwapTx: (outputMint: string, amount: string) =>
    `https://share.raydium.io/dialect/actions/swap/tx?outputMint=${outputMint}&amount=${amount}`,
}

// Actions client
export interface ActionMetadata {
  icon: string
  label: string
  title: string
  description: string
  links?: {
    actions: Array<{
      label: string
      href: string
      parameters?: Array<{ name: string; label: string }>
    }>
  }
}

export interface ActionTransaction {
  transaction: string // base64 encoded
  message?: string
}

export async function getActionMetadata(url: string): Promise<ActionMetadata> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function postAction(url: string, account: string): Promise<ActionTransaction> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST ${url} failed: ${res.status} - ${text}`)
  }
  return res.json()
}
