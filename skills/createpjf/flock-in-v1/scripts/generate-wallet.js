#!/usr/bin/env node
/**
 * Generate a new ETH wallet for FLock registration
 * Usage: node generate-wallet.js
 */

const { Wallet } = require('ethers')

const wallet = Wallet.createRandom()

console.log(
  JSON.stringify(
    {
      address: wallet.address,
      privateKey: wallet.privateKey,
    },
    null,
    2,
  ),
)
