# Moltium Token Deploy (pump.fun) (token-deploy.md)

Source: https://moltium.fun/token-deploy.md (external)

High level:

1. Generate simple 512x512 logo PNG locally (keep <2MB)
2. Upload metadata (prefer base64 endpoint)
3. Generate mint keypair locally; store secret locally; never print
4. Build deploy tx: `POST /tx/build/token/deploy/pumpfun`
5. Sign locally with wallet + mint keypair
6. Send via `/tx/send`
   Return mint + tx signature.
