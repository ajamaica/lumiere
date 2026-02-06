/**
 * Mock for @sodax/sdk
 */

export class Sodax {
  static initialize = jest.fn().mockResolvedValue(undefined)

  swaps = {
    getQuote: jest.fn(),
    executeSwap: jest.fn(),
    cancelIntent: jest.fn(),
  }

  bridge = {
    getBridgeableTokens: jest.fn(),
    bridge: jest.fn(),
  }

  moneyMarket = {
    supply: jest.fn(),
    withdraw: jest.fn(),
    borrow: jest.fn(),
    repay: jest.fn(),
    getUserAccountDataOnSpoke: jest.fn(),
  }
}

export const Intent = {}
