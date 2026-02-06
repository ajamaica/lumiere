#!/bin/bash
# Quick connectivity test for Etherlink RPC endpoints

echo "Testing Etherlink RPC connectivity..."
echo ""

# Test Mainnet
echo "=== Etherlink Mainnet (42793) ==="
MAINNET_RESULT=$(curl -s -X POST https://node.mainnet.etherlink.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}')
MAINNET_CHAIN=$(echo $MAINNET_RESULT | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
if [ "$MAINNET_CHAIN" = "0xa729" ]; then
  echo "✅ Mainnet RPC responding (chain ID: 0xa729 = 42793)"
  
  # Get latest block
  BLOCK=$(curl -s -X POST https://node.mainnet.etherlink.com \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
  BLOCK_DEC=$((BLOCK))
  echo "   Latest block: $BLOCK_DEC"
else
  echo "❌ Mainnet RPC not responding correctly"
  echo "   Response: $MAINNET_RESULT"
fi

echo ""

# Test Shadownet
echo "=== Etherlink Shadownet (127823) ==="
SHADOWNET_RESULT=$(curl -s -X POST https://node.shadownet.etherlink.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}')
SHADOWNET_CHAIN=$(echo $SHADOWNET_RESULT | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
if [ "$SHADOWNET_CHAIN" = "0x1f34f" ]; then
  echo "✅ Shadownet RPC responding (chain ID: 0x1f34f = 127823)"
  
  # Get latest block
  BLOCK=$(curl -s -X POST https://node.shadownet.etherlink.com \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
  BLOCK_DEC=$((BLOCK))
  echo "   Latest block: $BLOCK_DEC"
else
  echo "❌ Shadownet RPC not responding correctly"
  echo "   Response: $SHADOWNET_RESULT"
fi

echo ""
echo "Done!"
