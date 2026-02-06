# Troubleshooting Guide

Common issues and solutions when integrating Trails.

## Quick Diagnostics

Before diving into specific issues, check these common problems:

1. **API Key**: Is `TRAILS_API_KEY` set correctly?
2. **Provider order**: Is `TrailsProvider` inside `WagmiProvider`?
3. **Modal rendered**: For headless, is `TrailsHookModal` in the tree?
4. **Wallet connected**: Is the user's wallet connected?
5. **Correct chain**: Is the user on a supported chain?

---

## Provider Issues

### Error: "TrailsProvider not found"

**Cause**: Component using Trails hooks is outside the provider.

**Solution**: Ensure `TrailsProvider` wraps your app:

```tsx
// ❌ Wrong
function App() {
  return (
    <div>
      <TrailsProvider>{/* ... */}</TrailsProvider>
      <ComponentUsingTrails /> {/* Outside provider! */}
    </div>
  )
}

// ✅ Correct
function App() {
  return (
    <TrailsProvider>
      <div>
        {/* ... */}
        <ComponentUsingTrails />
      </div>
    </TrailsProvider>
  )
}
```

### Error: "WagmiProvider not found"

**Cause**: `TrailsProvider` must be inside `WagmiProvider`.

**Solution**: Correct provider order:

```tsx
// ✅ Correct order
<WagmiProvider config={wagmiConfig}>
  <QueryClientProvider client={queryClient}>
    <TrailsProvider trailsApiKey="...">{children}</TrailsProvider>
  </QueryClientProvider>
</WagmiProvider>
```

### Error: "TrailsHookModal must be rendered"

**Cause**: Using Trails headless hooks without the modal component.

**Solution**: Add `TrailsHookModal` inside both providers:

```tsx
<WagmiProvider config={wagmiConfig}>
  <TrailsProvider trailsApiKey="...">
    <TrailsHookModal /> {/* Required for headless hooks */}
    {children}
  </TrailsProvider>
</WagmiProvider>
```

---

## API Key Issues

### Error: "Invalid API key" or 401 Unauthorized

**Causes**:

- Incorrect API key
- Key not set in environment
- Using server key on client (or vice versa)

**Solutions**:

1. Verify the key is set:

```bash
echo $TRAILS_API_KEY
# or for Next.js client
echo $NEXT_PUBLIC_TRAILS_API_KEY
```

2. Check key format:

```typescript
// API key should be a non-empty string
const apiKey = process.env.NEXT_PUBLIC_TRAILS_API_KEY
console.log('API Key exists:', !!apiKey)
console.log('API Key length:', apiKey?.length)
```

3. For Next.js, ensure correct prefix:

```
# .env.local
TRAILS_API_KEY=sk_...           # Server-side only
NEXT_PUBLIC_TRAILS_API_KEY=pk_... # Client-side (exposed)
```

---

## Chain & Token Issues

### Error: "Chain not supported"

**Cause**: Requested chain is not in Trails' supported list.

**Solution**: Check supported chains:

```typescript
import { getSupportedChains } from '@0xtrails/trails'

const chains = await getSupportedChains()
console.log(
  'Supported chains:',
  chains.map((c) => `${c.name} (${c.chainId})`),
)
```

### Error: "Token not supported"

**Cause**: Token address is incorrect or not supported on that chain.

**Solution**: Verify token support:

```typescript
import { getSupportedTokens } from '@0xtrails/trails'

const tokens = await getSupportedTokens({ chainId: 8453 })
const isSupported = tokens.some((t) => t.address.toLowerCase() === tokenAddress.toLowerCase())
console.log('Token supported:', isSupported)
```

### Error: "Route not found"

**Cause**: No viable path between source and destination.

**Possible reasons**:

- Liquidity unavailable
- Token pair not supported
- Amount too small or too large

**Solutions**:

1. Try a different token pair
2. Adjust the amount
3. Try a more common destination token (USDC, ETH)

---

## Transaction Issues

### Error: "Quote expired"

**Cause**: Quote was not committed in time (typically 30-60 seconds).

**Solution**:

- Commit immediately after quoting
- Implement retry logic:

```typescript
async function quoteWithRetry(params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const quote = await trails.quoteIntent(params)
      const intent = await trails.commitIntent({ quoteId: quote.quoteId })
      return intent
    } catch (error) {
      if (error.code === 'QUOTE_EXPIRED' && i < maxRetries - 1) {
        console.log('Quote expired, retrying...')
        continue
      }
      throw error
    }
  }
}
```

### Error: "Insufficient balance"

**Cause**: User doesn't have enough tokens for the trade.

**Solution**: Check balance before trading:

```typescript
import { useBalance } from 'wagmi'

const { data: balance } = useBalance({
  address: userAddress,
  token: sourceTokenAddress,
  chainId: sourceChainId,
})

const hasEnough = balance && BigInt(balance.value) >= BigInt(requiredAmount)
```

### Error: "User rejected transaction"

**Cause**: User declined the wallet signature.

**Solution**: Handle gracefully in UI:

```typescript
const { quote, isPending, isSuccess, error } = useQuote({ ...params });

if (error?.message?.includes('rejected')) {
  // Show user-friendly message
  return <p>Transaction cancelled. Click to try again.</p>;
}
```

### Transaction stuck / pending forever

**Causes**:

- Low gas price
- Network congestion
- RPC issues

**Solutions**:

1. Check transaction on block explorer
2. For stuck tx, may need to cancel/speed up in wallet
3. Implement timeout handling:

```typescript
const receipt = await trails.waitIntentReceipt({
  intentId: intent.intentId,
  timeout: 120000, // 2 minutes
})

// Handle timeout
if (!receipt) {
  console.log('Transaction taking longer than expected')
  // Poll manually or show status to user
}
```

---

## Calldata Issues

### Error: "Execution reverted"

**Causes**:

- Wrong function signature
- Incorrect arguments
- Contract state issue (paused, etc.)

**Debugging steps**:

1. Decode and verify calldata:

```typescript
import { decodeFunctionData } from 'viem'

const decoded = decodeFunctionData({
  abi: contractAbi,
  data: calldata,
})
console.log('Function:', decoded.functionName)
console.log('Args:', decoded.args)
```

2. Test the call directly (without Trails):

```typescript
import { createPublicClient, http } from 'viem'

const client = createPublicClient({ chain, transport: http() })

// Simulate the call
const result = await client.simulateContract({
  address: contractAddress,
  abi: contractAbi,
  functionName: 'deposit',
  args: [amount, receiver],
  account: userAddress,
})
```

### Placeholder not replaced

**Cause**: Using wrong placeholder value or in wrong context.

**Solution**: Use exact placeholder:

```typescript
// ✅ Correct placeholder
const PLACEHOLDER = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

// ❌ Wrong (missing leading 0x or wrong length)
const WRONG = BigInt('0xffffffff')
```

---

## Widget Issues

### Widget not rendering

**Causes**:

- Missing CSS
- Provider issues
- Import errors

**Solutions**:

1. Check browser console for errors
2. Verify imports:

```typescript
// Named import, not default
import { TrailsWidget } from '@0xtrails/trails'
```

3. Check if styles are loading (may need CSS import depending on bundler)

### Widget shows "No tokens available"

**Cause**: Token list failed to load or chain mismatch.

**Solution**: Check network and token fetch:

```typescript
const { data: tokens, error } = useSupportedTokens({ chainId })
if (error) console.error('Token fetch error:', error)
```

### Widget theming not applying

**Cause**: CSS variables not reaching the component.

**Solution**: Apply styles at the right level:

```tsx
// Method 1: Inline styles
<TrailsWidget
  style={{
    '--trails-primary': '#6366f1',
  } as React.CSSProperties}
/>

// Method 2: CSS file (must be loaded before component)
// In your global CSS:
:root {
  --trails-primary: #6366f1;
}
```

---

## Network & Performance Issues

### Slow quote responses

**Causes**:

- Network latency
- API rate limiting
- Complex routes

**Solutions**:

1. Implement loading states
2. Cache token lists (they don't change often)
3. Pre-fetch quotes on hover/focus

### Rate limiting (429 errors)

**Cause**: Too many API requests.

**Solutions**:

1. Implement request debouncing
2. Cache responses where appropriate
3. Use batch endpoints when available

```typescript
// Debounce quote requests
import { debounce } from 'lodash-es'

const debouncedQuote = debounce((params) => trails.quoteIntent(params), 500)
```

---

## Getting Help

If you can't resolve an issue:

1. **Search Trails Docs**: Use the MCP search tool

   ```
   SearchTrails: "your error message"
   ```

2. **Check API status**: [status.trails.build](https://status.trails.build)

3. **Collect debug info**:
   - API key (first 8 chars only)
   - Chain IDs and token addresses
   - Error message and stack trace
   - Transaction hash (if available)

4. **Contact support** with the above information
