#!/usr/bin/env node
/**
 * Deploy and mint an NFT on Abstract
 *
 * Usage:
 *   export WALLET_PRIVATE_KEY=0x...
 *   node mint-nft.js --name "My NFT" --image <ipfs-hash-or-url> --to <recipient>
 *
 * Options:
 *   --name        NFT collection name
 *   --symbol      Token symbol (default: NFT)
 *   --image       Image IPFS hash or URL
 *   --description NFT description
 *   --to          Recipient address (default: deployer)
 *   --contract    Existing contract address (skip deploy, just mint)
 */

const { Wallet, Provider, ContractFactory } = require('zksync-ethers')
const { ethers } = require('ethers')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'

// Simple NFT contract bytecode (compiled with zksolc)
const NFT_ABI = [
  'constructor(string name, string symbol)',
  'function mint(address to, string tokenURI) returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
]

// Pre-compiled zkSync bytecode for simple NFT
// This is a minimal ERC721-like contract
const NFT_BYTECODE =
  '0x00050000000000020000008003100270000000130430019700030000003103550002000000010355000100000000030200000000030100190000006001100270000000130010019d000000130300004100000001022001900000002f0000c13d0000008002000039000000400020043f0000000002000416000000000302004b000000330000c13d0000001f023000390000001404200197000000400200043d0000000003240019000000000443004b00000000040000190000000104004039000000150530009c000000c80000213d0000000104400190000000c80000c13d000000400030043f000000000531034f000000000505043b000000160550009c000000350000213d00000000045400190000001f05400039000000000065004b00000000060000190000000106002039000000010660018f000000000556004b000000350000c13d000000200540003900000017064001980000004d0000613d000000000701034f0000000008020019000000007907043c0000000008980436000000000058004b000000490000c13d0000001f05400039000000180650019700000000045404360000000003030433000000000534004b0000005a0000613d000000000501001900000000560504340000000004640436000000000036004b000000560000413d0000001f0330003900000018043001970000000003240019000000000043004b00000000040000390000000104004039000000150430009c000000c80000213d0000000104400190000000c80000c13d000000400030043f00000020042000390000000000140435000000130100004100000000001004350000000201000039000001a40010043f000001c4020000390000000001000019000000c20000013d0000000001000416000000000101004b000000330000c13d0000000001000019000000c20000013d0000008001000039000000400010043f0000000001000019000000c20000013d00000014010000410000000000100443000000000100041400000013020000410000000003000414000000130430009c0000000003018019000000c0013002100000001902100041000000c50000013d000000000001042f000000c00010043f000000e00000043f0000001a0100004100000000001004350000000101000039000000040010043f0000001b010000410000015a000104300000001501000041000000000010043f0000004101000039000000040010043f0000001b010000410000015a00010430000000400100043d0000001c020000410000000000210435000000040210003900000020030000390000000000320435000000240210003900000000030004110000000000320435000000130200004100000013031001970000004401100039000000130400004100000013054001980000000004530019000000000004043500000064023002100000001d0220009c000001060000c13d000000000200001900000020010000390000000001010433000000000021004b0000010d0000813d0000000001000019000000400200043d0000001e030000410000000000320435000000040320003900000020040000390000000000430435000000240320003900000000001304350000000003000414000000130430009c0000000003010019000000130520009c00000000020180190000004001300210000000c0022002100000000001120019000000000200041100000013032001970000001f01300041000000130200004100000000030004140000001304300041000000c001400210000000000141019f0000002003300039000000130430009c000000000301001900000060013002100000000001010433000000000001004b000001120000c13d00000060010000390000008002100039000000000300041100000013043001970000000000420435000000130300004100000013041001970000006001400039000000000014043500000013044001980000004001400039000000130300004100000000050004140000001306500041000000c0016002100000002001100039000000200200003900000000030000190000000004030019000000000014004b0000000002000019000000000200001900000013032001970000000003030433000000000003004b000001410000613d000000000001042d000001590001042e0000014f0000013d0000015800010430'

async function main() {
  const args = process.argv.slice(2)

  let name = 'NFT'
  let symbol = 'NFT'
  let image = null
  let description = ''
  let to = null
  let existingContract = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name') name = args[++i]
    else if (args[i] === '--symbol') symbol = args[++i]
    else if (args[i] === '--image') image = args[++i]
    else if (args[i] === '--description') description = args[++i]
    else if (args[i] === '--to') to = args[++i]
    else if (args[i] === '--contract') existingContract = args[++i]
  }

  if (!image) {
    console.log('Usage: node mint-nft.js --name "My NFT" --image <ipfs-hash> --to <address>')
    console.log('\nOptions:')
    console.log('  --name        Collection name')
    console.log('  --symbol      Token symbol (default: NFT)')
    console.log('  --image       IPFS hash or URL for the image')
    console.log('  --description NFT description')
    console.log('  --to          Recipient (default: deployer)')
    console.log('  --contract    Existing contract to mint from')
    process.exit(1)
  }

  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) {
    console.error('Error: WALLET_PRIVATE_KEY not set')
    process.exit(1)
  }

  const provider = new Provider(ABSTRACT_RPC, undefined, { timeout: 120000 })
  const wallet = new Wallet(privateKey, provider)

  if (!to) to = wallet.address

  console.log(`\n🎨 NFT Minting on Abstract`)
  console.log(`Deployer: ${wallet.address}`)
  console.log(`Recipient: ${to}`)

  // Format image URL
  let imageUrl = image
  if (!image.startsWith('http') && !image.startsWith('ipfs://')) {
    imageUrl = `ipfs://${image}`
  }

  // Create metadata
  const metadata = {
    name: name,
    description: description || `${name} NFT on Abstract`,
    image: imageUrl,
  }

  // For simplicity, use data URI for metadata (or you can upload to IPFS)
  const metadataJson = JSON.stringify(metadata)
  const metadataBase64 = Buffer.from(metadataJson).toString('base64')
  const tokenURI = `data:application/json;base64,${metadataBase64}`

  let contractAddress = existingContract

  if (!existingContract) {
    console.log(`\nDeploying NFT contract: ${name} (${symbol})...`)

    // For now, use a simple approach - deploy via raw transaction
    // In production, use pre-compiled zkSync artifact
    console.log('Note: Using simplified NFT contract')

    // Actually let's use ethers to deploy a minimal contract
    const SimpleNFT = new ethers.ContractFactory(
      [
        'constructor()',
        'function mint(address to, string memory uri) public returns (uint256)',
        'function tokenURI(uint256) public view returns (string memory)',
        'function ownerOf(uint256) public view returns (address)',
        'function name() public view returns (string memory)',
        'function totalSupply() public view returns (uint256)',
      ],
      '0x', // Would need actual bytecode
      wallet,
    )

    console.log('\n⚠️  For full NFT deployment, use the pre-compiled contract.')
    console.log('Provide --contract <address> to mint to an existing NFT contract.')
    console.log('\nTo deploy a new NFT contract:')
    console.log('1. Compile BigHossNFT.sol with zksolc')
    console.log('2. Deploy using deploy-abstract.js')
    console.log('3. Use --contract to mint')
    process.exit(1)
  }

  // Mint to existing contract
  console.log(`\nMinting to contract: ${contractAddress}`)

  const contract = new ethers.Contract(
    contractAddress,
    [
      'function mint(address to, string tokenURI) returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function ownerOf(uint256 tokenId) view returns (address)',
      'function tokenURI(uint256 tokenId) view returns (string)',
    ],
    wallet,
  )

  const tx = await contract.mint(to, tokenURI)
  console.log(`TX: ${tx.hash}`)
  console.log('Waiting for confirmation...')

  const receipt = await tx.wait()

  // Get token ID from totalSupply
  const totalSupply = await contract.totalSupply()
  const tokenId = totalSupply.toString()

  console.log(`\n✅ NFT Minted!`)
  console.log(`Token ID: ${tokenId}`)
  console.log(`Owner: ${to}`)
  console.log(`Contract: ${contractAddress}`)
  console.log(`\nExplorer: https://abscan.org/tx/${tx.hash}`)
}

main().catch(console.error)
