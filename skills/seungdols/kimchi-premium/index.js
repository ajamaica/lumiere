const https = require('https')

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Request Timeout'))
    })
  })
}

async function main() {
  try {
    const [rateData, upbitData, binanceData] = await Promise.all([
      fetchJson('https://open.er-api.com/v6/latest/USD'),
      fetchJson('https://api.upbit.com/v1/ticker?markets=KRW-BTC'),
      fetchJson('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
    ])

    const exchangeRate = rateData.rates.KRW
    const upbitPriceKRW = upbitData[0].trade_price
    const binancePriceUSD = parseFloat(binanceData.price)

    const binancePriceKRW = binancePriceUSD * exchangeRate
    const premiumRate = ((upbitPriceKRW - binancePriceKRW) / binancePriceKRW) * 100
    const priceDiff = upbitPriceKRW - binancePriceKRW

    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toLocaleString(),
          exchange_rate: `${exchangeRate.toLocaleString()} KRW/USD`,
          upbit_btc: `${upbitPriceKRW.toLocaleString()} KRW`,
          binance_btc: `${binancePriceUSD.toLocaleString()} USD`,
          kimchi_premium: `${premiumRate.toFixed(2)}%`,
          price_diff: `${Math.floor(priceDiff).toLocaleString()} KRW`,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }))
  }
}

main()
