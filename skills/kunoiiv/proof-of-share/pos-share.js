const fs = require('fs');
const crypto = require('crypto');

const content = process.argv[2] || 'Stub PoS.';
let nonce = 0;
const maxTries = 100000;
while (nonce < maxTries) {
  const hashInput = content + nonce + 'NovaEcho';
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  if (hash.startsWith('0000')) {
    const pos = { hash, nonce, input: hashInput.slice(0,50) + '...' };
    console.log(JSON.stringify(pos));
    process.exit(0);
  }
  nonce++;
}
console.log('PoW timeout');
New skills\pos\pos-verify.js, paste:
const fs = require('fs');
const crypto = require('crypto');

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.log('No share file.');
  process.exit(1);
}
const pos = JSON.parse(fs.readFileSync(file, 'utf8'));
const recomputed = crypto.createHash('sha256').update(pos.input + pos.nonce + 'NovaEcho').digest('hex');
console.log(recomputed === pos.hash ? 'Valid PoS!' : 'Tamper detected!');