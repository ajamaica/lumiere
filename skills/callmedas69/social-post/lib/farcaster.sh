#!/bin/bash
# Farcaster posting library

FARCASTER_REPO="/home/phan_harry/.openclaw/workspace/skills/farcaster-agent/repo"
FARCASTER_CREDS="/home/phan_harry/.openclaw/farcaster-credentials.json"

# Post text-only to Farcaster
farcaster_post_text() {
  local text="$1"
  local parent_hash="$2"
  
  if [ ! -f "$FARCASTER_CREDS" ]; then
    echo "Error: Farcaster credentials not found at $FARCASTER_CREDS" >&2
    return 1
  fi
  
  local fid=$(jq -r '.fid' "$FARCASTER_CREDS")
  local private_key=$(jq -r '.custodyPrivateKey' "$FARCASTER_CREDS")
  local signer_key=$(jq -r '.signerPrivateKey' "$FARCASTER_CREDS")
  
  if [ -n "$parent_hash" ]; then
    # Post as reply (for threads) - inline node script with proper env
    cd "$FARCASTER_REPO" && PRIVATE_KEY="$private_key" SIGNER_PRIVATE_KEY="$signer_key" FID="$fid" PARENT_HASH="$parent_hash" node -e "
const { Wallet, JsonRpcProvider } = require('ethers');
const { makeCastAdd, NobleEd25519Signer, FarcasterNetwork, Message } = require('@farcaster/hub-nodejs');
const { submitMessage } = require('./src/x402');
const text = process.argv[1];
(async () => {
  const baseProvider = new JsonRpcProvider('https://mainnet.base.org');
  const wallet = new Wallet(process.env.PRIVATE_KEY, baseProvider);
  const signerBytes = Buffer.from(process.env.SIGNER_PRIVATE_KEY, 'hex');
  const signer = new NobleEd25519Signer(signerBytes);
  const fid = parseInt(process.env.FID);
  const parentHashBytes = Buffer.from(process.env.PARENT_HASH.replace('0x', ''), 'hex');
  const castResult = await makeCastAdd({ text, embeds: [], embedsDeprecated: [], mentions: [], mentionsPositions: [], parentCastId: { fid, hash: parentHashBytes } }, { fid, network: FarcasterNetwork.MAINNET }, signer);
  if (castResult.isErr()) throw new Error('Failed: ' + castResult.error);
  const cast = castResult.value;
  const hash = '0x' + Buffer.from(cast.hash).toString('hex');
  const messageBytes = Buffer.from(Message.encode(cast).finish());
  await submitMessage(wallet, messageBytes);
  await new Promise(r => setTimeout(r, 2000));
  console.log('Cast hash:', hash);
  console.log('URL: https://farcaster.xyz/~/conversations/' + hash);
})().catch(err => { console.error('Error:', err.message); process.exit(1); });
" "$text" 2>&1 | grep -E "(Cast hash|URL|Error)" | tail -2
  else
    cd "$FARCASTER_REPO" && \
    PRIVATE_KEY="$private_key" \
    SIGNER_PRIVATE_KEY="$signer_key" \
    FID="$fid" \
    npm run cast "$text" 2>&1 | grep -E "(Cast hash|URL|Error)" | tail -2
  fi
}

# Upload image to imgur (anonymous)
upload_to_imgur() {
  local image_path="$1"
  
  if [ ! -f "$image_path" ]; then
    echo "Error: Image not found at $image_path" >&2
    return 1
  fi
  
  # Try catbox.moe (no API key needed, reliable)
  local response=$(curl -s -F "reqtype=fileupload" -F "fileToUpload=@$image_path" https://catbox.moe/user/api.php)
  
  if [[ "$response" =~ ^https://files.catbox.moe/ ]]; then
    echo "$response"
    return 0
  fi
  
  # Fallback: try uguu.se
  response=$(curl -s -F "files[]=@$image_path" https://uguu.se/upload.php | jq -r '.files[0].url' 2>/dev/null)
  
  if [[ "$response" =~ ^https:// ]]; then
    echo "$response"
    return 0
  fi
  
  echo "Error: Failed to upload image" >&2
  return 1
}

# Post to Farcaster with image (using embeds)
farcaster_post_with_image() {
  local text="$1"
  local image_path="$2"
  local parent_hash="$3"
  
  if [ ! -f "$FARCASTER_CREDS" ]; then
    echo "Error: Farcaster credentials not found at $FARCASTER_CREDS" >&2
    return 1
  fi
  
  echo "Uploading image..." >&2
  local image_url=$(upload_to_imgur "$image_path")
  
  if [ $? -ne 0 ]; then
    echo "Failed to upload image for Farcaster" >&2
    return 1
  fi
  
  echo "Image uploaded: $image_url" >&2
  
  local fid=$(jq -r '.fid' "$FARCASTER_CREDS")
  local private_key=$(jq -r '.custodyPrivateKey' "$FARCASTER_CREDS")
  local signer_key=$(jq -r '.signerPrivateKey' "$FARCASTER_CREDS")
  
  # Post with image in embeds array
  cd "$FARCASTER_REPO" && PRIVATE_KEY="$private_key" SIGNER_PRIVATE_KEY="$signer_key" FID="$fid" IMAGE_URL="$image_url" PARENT_HASH="${parent_hash:-}" node -e "
const { Wallet, JsonRpcProvider } = require('ethers');
const { makeCastAdd, NobleEd25519Signer, FarcasterNetwork, Message } = require('@farcaster/hub-nodejs');
const { submitMessage } = require('./src/x402');
const text = process.argv[1];
(async () => {
  const baseProvider = new JsonRpcProvider('https://mainnet.base.org');
  const wallet = new Wallet(process.env.PRIVATE_KEY, baseProvider);
  const signerBytes = Buffer.from(process.env.SIGNER_PRIVATE_KEY, 'hex');
  const signer = new NobleEd25519Signer(signerBytes);
  const fid = parseInt(process.env.FID);
  const imageUrl = process.env.IMAGE_URL;
  
  const castBody = {
    text,
    embeds: [{ url: imageUrl }],
    embedsDeprecated: [],
    mentions: [],
    mentionsPositions: []
  };
  
  if (process.env.PARENT_HASH) {
    const parentHashBytes = Buffer.from(process.env.PARENT_HASH.replace('0x', ''), 'hex');
    castBody.parentCastId = { fid, hash: parentHashBytes };
  }
  
  const castResult = await makeCastAdd(castBody, { fid, network: FarcasterNetwork.MAINNET }, signer);
  if (castResult.isErr()) throw new Error('Failed: ' + castResult.error);
  const cast = castResult.value;
  const hash = '0x' + Buffer.from(cast.hash).toString('hex');
  const messageBytes = Buffer.from(Message.encode(cast).finish());
  await submitMessage(wallet, messageBytes);
  await new Promise(r => setTimeout(r, 2000));
  console.log('Cast hash:', hash);
  console.log('URL: https://farcaster.xyz/~/conversations/' + hash);
})().catch(err => { console.error('Error:', err.message); process.exit(1); });
" "$text" 2>&1 | grep -E "(Cast hash|URL|Error)" | tail -2
}
