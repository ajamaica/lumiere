# Workflows

## Initial Setup (One-Time)

### 1. Get Your Wallet Ready

You need an Ethereum wallet with:

- A private key (for signing transactions)
- BREAD tokens (from the raise or Uniswap)
- ETH for gas (small amounts on Base)

```javascript
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'
import { base } from 'viem/chains'

const account = privateKeyToAccount('0x...')
const client = createWalletClient({
  account,
  chain: base,
  transport: http(),
})
```

### 2. Acquire BREAD

Get BREAD through:

- The initial raise at getbread.fun
- Trading on Uniswap (BREAD/ETH pool)

### 3. Verify Setup

Check your balances:

```javascript
const breadBalance = await publicClient.readContract({
  address: '0xAfcAF9e3c9360412cbAa8475ed85453170E75fD5',
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [account.address],
})

const ethBalance = await publicClient.getBalance({
  address: account.address,
})

console.log(`BREAD: ${formatEther(breadBalance)}`)
console.log(`ETH: ${formatEther(ethBalance)}`)
```

---

## Daily Participation Flow

### Morning: Scout Proposals

```javascript
const currentDay = await publicClient.readContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'getCurrentDay',
})

const proposalIds = await publicClient.readContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'getDailyProposals',
  args: [currentDay],
})

for (const id of proposalIds) {
  const proposal = await publicClient.readContract({
    address: bakeryAddress,
    abi: bakeryAbi,
    functionName: 'proposals',
    args: [id],
  })
  console.log(`#${id}: ${proposal.symbol} - ${proposal.name}`)
  console.log(`  ETH raised: ${formatEther(proposal.ethRaised)}`)
  console.log(`  Backers: ${proposal.uniqueBackers}`)
}
```

### Decide: Back or Propose

**If you see a good proposal → Back it**
**If you have a better idea → Propose your own**

### Evening: Check Results

After day ends, check the winner:

```javascript
const previousDay = currentDay - 1n
const winnerId = await publicClient.readContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'dailyWinner',
  args: [previousDay],
})

console.log(`Day ${previousDay} winner: Proposal #${winnerId}`)
```

---

## Propose a Token

### Step 1: Check Prerequisites

```javascript
// Competition active?
const day = await publicClient.readContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'getCurrentDay',
})
if (day === 0n) throw new Error('Competition not started')

// Have enough BREAD?
const fee = await publicClient.readContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'calculateProposalFee',
})

const balance = await publicClient.readContract({
  address: breadAddress,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [account.address],
})

if (balance < fee) {
  throw new Error(`Need ${formatEther(fee)} BREAD`)
}
```

### Step 2: Approve BREAD

```javascript
const approveTx = await walletClient.writeContract({
  address: breadAddress,
  abi: erc20Abi,
  functionName: 'approve',
  args: [bakeryAddress, fee],
})

await publicClient.waitForTransactionReceipt({ hash: approveTx })
```

### Step 3: Submit Proposal

```javascript
const proposeTx = await walletClient.writeContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'propose',
  args: [
    'MoonDog', // name
    'MDOG', // symbol
    'To the moon! 🚀🐕', // description
    'https://i.imgur.com/moondog.png', // imageUrl
  ],
})

const receipt = await publicClient.waitForTransactionReceipt({
  hash: proposeTx,
})

console.log('Proposal created!', receipt.transactionHash)
```

---

## Back a Proposal

### Step 1: Calculate Fee

```javascript
const ethAmount = parseEther('0.5') // Backing 0.5 ETH

const breadFee = await publicClient.readContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'calculateBackingFee',
  args: [ethAmount],
})

console.log(`Backing ${formatEther(ethAmount)} ETH costs ${formatEther(breadFee)} BREAD`)
```

### Step 2: Approve BREAD

```javascript
const approveTx = await walletClient.writeContract({
  address: breadAddress,
  abi: erc20Abi,
  functionName: 'approve',
  args: [bakeryAddress, breadFee],
})

await publicClient.waitForTransactionReceipt({ hash: approveTx })
```

### Step 3: Back with ETH

```javascript
const backTx = await walletClient.writeContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'backProposal',
  args: [proposalId],
  value: ethAmount, // Include ETH value
})

await publicClient.waitForTransactionReceipt({ hash: backTx })
console.log('Backed proposal!', backTx)
```

---

## After Settlement

### Claim Tokens (If You Backed the Winner)

```javascript
const proposal = await publicClient.readContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'proposals',
  args: [proposalId],
})

if (!proposal.launched) {
  throw new Error('Token not launched yet')
}

const backing = await publicClient.readContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'backings',
  args: [proposalId, account.address],
})

if (backing.claimed) {
  throw new Error('Already claimed')
}

const claimTx = await walletClient.writeContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'claimTokens',
  args: [proposalId],
})

await publicClient.waitForTransactionReceipt({ hash: claimTx })
console.log('Tokens claimed!')
```

### Claim Refund (If You Backed a Loser)

```javascript
const dayWinner = await publicClient.readContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'dailyWinner',
  args: [proposal.dayNumber],
})

if (dayWinner === proposalId) {
  throw new Error('This proposal won - claim tokens instead')
}

const refundTx = await walletClient.writeContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'claimRefund',
  args: [proposalId],
})

await publicClient.waitForTransactionReceipt({ hash: refundTx })
console.log('Refund claimed!')
```

---

## Monitoring

### Track Your Backings

```javascript
// Get all proposals you've backed
const myBackings = []
const totalProposals = await publicClient.readContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'proposalCount',
})

for (let i = 1n; i <= totalProposals; i++) {
  const backing = await publicClient.readContract({
    address: bakeryAddress,
    abi: bakeryAbi,
    functionName: 'backings',
    args: [i, account.address],
  })

  if (backing.ethAmount > 0n) {
    const proposal = await publicClient.readContract({
      address: bakeryAddress,
      abi: bakeryAbi,
      functionName: 'proposals',
      args: [i],
    })

    let status = 'PENDING'
    if (proposal.settled) {
      const winner = await publicClient.readContract({
        address: bakeryAddress,
        abi: bakeryAbi,
        functionName: 'dailyWinner',
        args: [proposal.dayNumber],
      })
      status = winner === i ? 'WON' : 'LOST'
    }

    myBackings.push({ proposalId: i, proposal, backing, status })
  }
}
```

### Check Unclaimed Rewards

```javascript
const unclaimed = myBackings.filter((b) => b.proposal.settled && !b.backing.claimed)

for (const { proposalId, status } of unclaimed) {
  if (status === 'WON') {
    console.log(`Proposal #${proposalId}: Claim tokens!`)
  } else {
    console.log(`Proposal #${proposalId}: Claim ETH refund (95% returned)`)
  }
}
```

---

## Error Handling

### Common Reverts

```javascript
try {
  await walletClient.writeContract({
    /* ... */
  })
} catch (error) {
  const message = error.message

  if (message.includes('Insufficient BREAD')) {
    console.error('Not enough BREAD tokens')
  } else if (message.includes('Below minimum backing')) {
    console.error('Must back at least 0.01 ETH')
  } else if (message.includes('Above maximum backing')) {
    console.error('Max 1 ETH per backing')
  } else if (message.includes('Proposal already exists')) {
    console.error('You already proposed today')
  } else if (message.includes('Competition not active')) {
    console.error('Daily competition not started yet')
  } else {
    console.error('Transaction failed:', message)
  }
}
```

### Gas Estimation

```javascript
// Estimate gas before executing
const gasEstimate = await publicClient.estimateContractGas({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'backProposal',
  args: [proposalId],
  value: ethAmount,
  account,
})

// Add 20% buffer
const gasLimit = (gasEstimate * 120n) / 100n

// Execute with custom gas limit
await walletClient.writeContract({
  address: bakeryAddress,
  abi: bakeryAbi,
  functionName: 'backProposal',
  args: [proposalId],
  value: ethAmount,
  gas: gasLimit,
})
```
