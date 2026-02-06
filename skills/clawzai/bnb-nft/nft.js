#!/usr/bin/env node

const { ethers } = require('ethers')

const RPC_URL = process.env.BNB_RPC_URL || 'https://bsc-dataseed.binance.org/'
const provider = new ethers.JsonRpcProvider(RPC_URL)

// ERC-721 ABI
const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function approve(address to, uint256 tokenId)',
  'function setApprovalForAll(address operator, bool approved)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  // ERC721Enumerable (optional)
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenByIndex(uint256 index) view returns (uint256)',
]

async function getCollection(contractAddress) {
  const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider)

  const [name, symbol] = await Promise.all([
    contract.name().catch(() => 'Unknown'),
    contract.symbol().catch(() => '???'),
  ])

  let totalSupply = null
  try {
    totalSupply = (await contract.totalSupply()).toString()
  } catch (e) {
    // totalSupply not implemented
  }

  console.log(
    JSON.stringify(
      {
        address: contractAddress,
        name,
        symbol,
        totalSupply,
      },
      null,
      2,
    ),
  )
}

async function getMetadata(contractAddress, tokenId) {
  const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider)

  const [owner, tokenURI] = await Promise.all([
    contract.ownerOf(tokenId).catch(() => null),
    contract.tokenURI(tokenId).catch(() => null),
  ])

  if (!owner) {
    console.log(JSON.stringify({ error: 'Token does not exist or was burned' }))
    return
  }

  let metadata = null
  if (tokenURI && tokenURI.startsWith('http')) {
    try {
      const response = await fetch(tokenURI, { timeout: 5000 })
      metadata = await response.json()
    } catch (e) {
      // Could not fetch metadata
    }
  } else if (tokenURI && tokenURI.startsWith('data:application/json')) {
    try {
      const base64 = tokenURI.split(',')[1]
      metadata = JSON.parse(Buffer.from(base64, 'base64').toString())
    } catch (e) {
      // Could not parse base64 metadata
    }
  }

  console.log(
    JSON.stringify(
      {
        contract: contractAddress,
        tokenId,
        owner,
        tokenURI,
        metadata,
      },
      null,
      2,
    ),
  )
}

async function getOwner(contractAddress, tokenId) {
  const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider)

  try {
    const owner = await contract.ownerOf(tokenId)
    console.log(
      JSON.stringify(
        {
          contract: contractAddress,
          tokenId,
          owner,
        },
        null,
        2,
      ),
    )
  } catch (e) {
    console.log(JSON.stringify({ error: 'Token does not exist or was burned' }))
  }
}

async function getBalance(contractAddress, walletAddress) {
  const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider)
  const balance = await contract.balanceOf(walletAddress)

  console.log(
    JSON.stringify(
      {
        contract: contractAddress,
        wallet: walletAddress,
        balance: balance.toString(),
      },
      null,
      2,
    ),
  )
}

async function getOwnedTokens(contractAddress, walletAddress, limit = 100) {
  const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider)

  // First try ERC721Enumerable
  try {
    const balance = await contract.balanceOf(walletAddress)
    const count = Math.min(Number(balance), limit)
    const tokens = []

    for (let i = 0; i < count; i++) {
      const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i)
      tokens.push(tokenId.toString())
    }

    console.log(
      JSON.stringify(
        {
          contract: contractAddress,
          wallet: walletAddress,
          method: 'enumerable',
          count: tokens.length,
          totalOwned: balance.toString(),
          tokens,
        },
        null,
        2,
      ),
    )
    return
  } catch (e) {
    // Not enumerable, fall back to scanning
  }

  // Fallback: scan token IDs (less efficient)
  const tokens = []
  let totalSupply = limit

  try {
    totalSupply = Math.min(Number(await contract.totalSupply()), limit)
  } catch (e) {
    // Use limit as range
  }

  console.error(`Scanning ${totalSupply} token IDs...`)

  for (let i = 0; i < totalSupply; i++) {
    try {
      const owner = await contract.ownerOf(i)
      if (owner.toLowerCase() === walletAddress.toLowerCase()) {
        tokens.push(i.toString())
      }
    } catch (e) {
      // Token doesn't exist
    }
  }

  console.log(
    JSON.stringify(
      {
        contract: contractAddress,
        wallet: walletAddress,
        method: 'scan',
        scannedRange: totalSupply,
        count: tokens.length,
        tokens,
      },
      null,
      2,
    ),
  )
}

async function transferNFT(contractAddress, toAddress, tokenId, privateKey) {
  const wallet = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(contractAddress, ERC721_ABI, wallet)

  // Verify ownership
  const owner = await contract.ownerOf(tokenId)
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.log(JSON.stringify({ error: `Not owner. Token owned by ${owner}` }))
    return
  }

  const tx = await contract.transferFrom(wallet.address, toAddress, tokenId)

  console.log(
    JSON.stringify(
      {
        status: 'submitted',
        hash: tx.hash,
        from: wallet.address,
        to: toAddress,
        tokenId,
        contract: contractAddress,
      },
      null,
      2,
    ),
  )

  console.error('Waiting for confirmation...')
  const receipt = await tx.wait()

  console.log(
    JSON.stringify(
      {
        status: 'confirmed',
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      },
      null,
      2,
    ),
  )
}

async function approveNFT(contractAddress, spenderAddress, tokenId, privateKey) {
  const wallet = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(contractAddress, ERC721_ABI, wallet)

  const tx = await contract.approve(spenderAddress, tokenId)

  console.log(
    JSON.stringify(
      {
        status: 'submitted',
        hash: tx.hash,
        spender: spenderAddress,
        tokenId,
        contract: contractAddress,
      },
      null,
      2,
    ),
  )

  console.error('Waiting for confirmation...')
  const receipt = await tx.wait()

  console.log(
    JSON.stringify(
      {
        status: 'confirmed',
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      },
      null,
      2,
    ),
  )
}

async function setApprovalForAll(contractAddress, operatorAddress, approved, privateKey) {
  const wallet = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(contractAddress, ERC721_ABI, wallet)

  const tx = await contract.setApprovalForAll(operatorAddress, approved)

  console.log(
    JSON.stringify(
      {
        status: 'submitted',
        hash: tx.hash,
        operator: operatorAddress,
        approved,
        contract: contractAddress,
      },
      null,
      2,
    ),
  )

  console.error('Waiting for confirmation...')
  const receipt = await tx.wait()

  console.log(
    JSON.stringify(
      {
        status: 'confirmed',
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      },
      null,
      2,
    ),
  )
}

async function isApproved(contractAddress, tokenId, spenderAddress) {
  const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider)

  const [approved, owner] = await Promise.all([
    contract.getApproved(tokenId).catch(() => ethers.ZeroAddress),
    contract.ownerOf(tokenId).catch(() => null),
  ])

  if (!owner) {
    console.log(JSON.stringify({ error: 'Token does not exist' }))
    return
  }

  const isApprovedForAll = await contract.isApprovedForAll(owner, spenderAddress).catch(() => false)
  const isDirectlyApproved = approved.toLowerCase() === spenderAddress.toLowerCase()

  console.log(
    JSON.stringify(
      {
        contract: contractAddress,
        tokenId,
        spender: spenderAddress,
        owner,
        approvedAddress: approved,
        isDirectlyApproved,
        isApprovedForAll,
        canTransfer: isDirectlyApproved || isApprovedForAll,
      },
      null,
      2,
    ),
  )
}

// CLI
const [, , command, ...args] = process.argv

function getKey(args) {
  const keyIndex = args.indexOf('--key')
  if (keyIndex !== -1 && args[keyIndex + 1]) {
    return args[keyIndex + 1]
  }
  return process.env.BNB_PRIVATE_KEY
}

function getLimit(args) {
  const limitIndex = args.indexOf('--limit')
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    return parseInt(args[limitIndex + 1], 10)
  }
  return 100
}

async function main() {
  try {
    switch (command) {
      case 'collection':
        if (!args[0]) throw new Error('Usage: nft.js collection <contract_address>')
        await getCollection(args[0])
        break

      case 'metadata':
        if (!args[0] || !args[1])
          throw new Error('Usage: nft.js metadata <contract_address> <token_id>')
        await getMetadata(args[0], args[1])
        break

      case 'owner':
        if (!args[0] || !args[1])
          throw new Error('Usage: nft.js owner <contract_address> <token_id>')
        await getOwner(args[0], args[1])
        break

      case 'balance':
        if (!args[0] || !args[1])
          throw new Error('Usage: nft.js balance <contract_address> <wallet_address>')
        await getBalance(args[0], args[1])
        break

      case 'owned':
        if (!args[0] || !args[1])
          throw new Error('Usage: nft.js owned <contract_address> <wallet_address> [--limit N]')
        await getOwnedTokens(args[0], args[1], getLimit(args))
        break

      case 'transfer':
        const transferKey = getKey(args)
        if (!args[0] || !args[1] || !args[2] || !transferKey) {
          throw new Error(
            'Usage: nft.js transfer <contract_address> <to_address> <token_id> --key <private_key>',
          )
        }
        await transferNFT(args[0], args[1], args[2], transferKey)
        break

      case 'approve':
        const approveKey = getKey(args)
        if (!args[0] || !args[1] || !args[2] || !approveKey) {
          throw new Error(
            'Usage: nft.js approve <contract_address> <spender_address> <token_id> --key <private_key>',
          )
        }
        await approveNFT(args[0], args[1], args[2], approveKey)
        break

      case 'approve-all':
        const approveAllKey = getKey(args)
        if (!args[0] || !args[1] || args[2] === undefined || !approveAllKey) {
          throw new Error(
            'Usage: nft.js approve-all <contract_address> <operator_address> <true|false> --key <private_key>',
          )
        }
        await setApprovalForAll(args[0], args[1], args[2] === 'true', approveAllKey)
        break

      case 'is-approved':
        if (!args[0] || !args[1] || !args[2]) {
          throw new Error(
            'Usage: nft.js is-approved <contract_address> <token_id> <spender_address>',
          )
        }
        await isApproved(args[0], args[1], args[2])
        break

      default:
        console.log(`BNB Chain NFT CLI

Commands:
  collection <contract>                        Get collection info (name, symbol, supply)
  metadata <contract> <token_id>               Get NFT metadata and tokenURI
  owner <contract> <token_id>                  Get NFT owner
  balance <contract> <wallet>                  Get NFT balance for wallet
  owned <contract> <wallet> [--limit N]        List token IDs owned by wallet
  transfer <contract> <to> <token_id> --key    Transfer NFT
  approve <contract> <spender> <token_id> --key    Approve single NFT
  approve-all <contract> <operator> <bool> --key   Set approval for all
  is-approved <contract> <token_id> <spender>      Check approval status

Environment:
  BNB_PRIVATE_KEY    Default private key
  BNB_RPC_URL        Custom RPC (default: bsc-dataseed.binance.org)
`)
    }
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

main()
