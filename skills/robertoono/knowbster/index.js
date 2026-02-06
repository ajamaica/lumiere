// Example: Using Knowbster from an AI Agent
const { ethers } = require('ethers')
const axios = require('axios')

// Configuration
const KNOWBSTER_API = 'https://knowbster.com/api'
const CONTRACT_ADDRESS = '0x7cAcb4f7c1d1293DE6346cAde3D27DD68Def6cDA'
const BASE_RPC = 'https://mainnet.base.org'

// Simplified ABI
const ABI = [
  'function purchaseKnowledge(uint256 tokenId) payable',
  'function getKnowledge(uint256 tokenId) view returns (tuple(address seller, string uri, uint256 price, uint8 category, bool isActive, uint256 positiveValidations, uint256 negativeValidations, string jurisdiction, string language))',
]

class KnowbsterClient {
  constructor(privateKey) {
    this.provider = new ethers.JsonRpcProvider(BASE_RPC)
    this.signer = new ethers.Wallet(privateKey, this.provider)
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, this.signer)
  }

  // Browse available knowledge
  async browse(category = null) {
    const url = category
      ? `${KNOWBSTER_API}/knowledge?category=${category}`
      : `${KNOWBSTER_API}/knowledge`

    const response = await axios.get(url)
    return response.data
  }

  // Get specific knowledge details
  async getDetails(tokenId) {
    const response = await axios.get(`${KNOWBSTER_API}/knowledge/${tokenId}`)
    return response.data
  }

  // Purchase knowledge
  async purchase(tokenId) {
    const knowledge = await this.contract.getKnowledge(tokenId)

    if (!knowledge.isActive) {
      throw new Error('Knowledge is not for sale')
    }

    const tx = await this.contract.purchaseKnowledge(tokenId, {
      value: knowledge.price,
      gasLimit: 300000,
    })

    const receipt = await tx.wait()
    console.log(`✅ Purchased knowledge #${tokenId}`)
    console.log(`Transaction: ${receipt.transactionHash}`)

    return receipt
  }

  // Fetch content from IPFS
  async fetchContent(ipfsUri) {
    const ipfsHash = ipfsUri.replace('ipfs://', '')
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`)
    return response.data
  }
}

// Example usage
async function main() {
  // Initialize client (use your private key)
  const client = new KnowbsterClient(process.env.PRIVATE_KEY)

  try {
    // Browse technology knowledge
    console.log('🔍 Browsing available knowledge...')
    const items = await client.browse('TECHNOLOGY')
    console.log(`Found ${items.length} knowledge items`)

    if (items.length > 0) {
      // Get details of first item
      const item = items[0]
      console.log(`\n📚 Knowledge: ${item.metadata?.title || 'Untitled'}`)
      console.log(`Price: ${item.price} ETH`)
      console.log(`Validation: ${item.validationRate}% positive`)

      // Purchase if interested (uncomment to execute)
      // const receipt = await client.purchase(item.tokenId);
      // const content = await client.fetchContent(item.uri);
      // console.log('Content:', content);
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { KnowbsterClient }
