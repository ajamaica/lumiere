const {
  initiateDeveloperControlledWalletsClient,
} = require('@circle-fin/developer-controlled-wallets')
require('dotenv').config()

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET

const CIPHERTEXT =
  process.env.CIRCLE_CIPHERTEXT ||
  `PQ5iqmm/skPx94TGGonuupJKLPGtU+vmgNa10tAfNq16eZT+G+PXGbQFC3To5Uex7FGRWJ3uSgtKQAi1vFssfPUrltgn6X2AwF2xFkjydoBCRif2ow7F1jFSV/YfmakVpQRiXAFB6Gp5py0kugEhpgfHTVsjHaUN7nniFh+lJ61q23bkEpiW4aw0ZiItn3ffiWOMtgNOQ9YyNkyCKI40UGTO4UXJVH0k6U/V0qaaMMm0nDBx6CpcWpTtCObJhfJdqZNGGrHFYiCvos6b1qEj8YlxmJyUNbY6Go8eQK6F4jPImo0Jlo1qUj13cdgz5iwvARfUu4drsHU1jUPRDHfpakIc2GRYTw9xEbPqlP2J6e4uX3wT8RqxunuQydEfbdwqF3qhfWm/RnpftdP5YZN9L7s/AUJUSuGDNiIq7g2LapiKGWw/9B51X3ML1127mh34KvH3ACFw07FnLGT8ECt8p78nZjwjMCWZU5oCXKjmwtje0H/31ZUBdqked8R7CnpmGb/MqYbWJ2dto2ruiQy6GLqPM7mKzKu+C5+sHwY3PBpKQE89wZx4rnNXX8NykuEvmWHDZlSHM6QQ/n1XjszIwxEzyTucVwPUDa/zMLiNB8xfKA74WTFC2UPXpr6WrnqMMn3ahy6/sg7j1W74PrIH64DBJ/lGpbpsWskEOAszLSc=`

async function test() {
  console.log('=== Creating Wallet Set with Ciphertext ===\n')
  console.log('API Key:', CIRCLE_API_KEY?.substring(0, 30) + '...\n')

  try {
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: CIRCLE_API_KEY,
      entitySecret: ENTITY_SECRET,
    })

    console.log('Creating wallet set with ciphertext...')
    const result = await client.createWalletSet({
      name: 'KarmaBank Credit Pool',
      entitySecretCiphertext: CIPHERTEXT,
    })

    console.log('\n✅ SUCCESS!')
    console.log('Wallet Set ID:', result.data?.walletSet?.id)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data))
    }
  }
}

test()
