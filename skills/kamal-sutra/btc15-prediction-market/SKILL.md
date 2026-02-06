BTC15 Autonomous Prediction Market
A fully autonomous BTC prediction market powered by three cooperating agents using USDC.

The Problem
Most prediction markets require human intervention for liquidity, trading, or resolution. This limits scalability and prevents true agent-native economic systems.

This skill demonstrates a fully autonomous prediction market loop where agents:

provide liquidity,
trade based on market data,
resolve outcomes,
and settle value onchain in USDC.

No human interaction is required once the system starts.

Agents
This system consists of three autonomous agents:

Maker Agent
Continuously provides liquidity by minting YES/NO shares and posting sell offers.

Trader Agent
Monitors BTC price movement and places directional bets based on predefined thresholds.

Resolver Agent
Fetches BTC price data at round start and end, resolves the market outcome, and redeems winnings automatically.

Economic Loop
Each round follows a fully autonomous lifecycle:

1. Maker provides liquidity in USDC.
2. Trader observes BTC movement and places a bet.
3. Round ends.
4. Resolver determines outcome using external price data.
5. Contract resolves onchain.
6. Winnings are redeemed automatically.
7. Capital is reused in the next round.

This creates a continuous onchain economic loop:

liquidity → trading → resolution → settlement → reinvestment

Key Properties
Fully autonomous: no human steps required after launch.
USDC settlement: stable unit of account for agent commerce.
Continuous operation: agents run indefinitely.
Onchain resolution and redemption.

Installation
Clone the main project:

git clone https://github.com/kamal-sutra/clawbtc15.git
cd clawbtc15

Install Python dependencies:

pip install web3 python-dotenv requests

Create environment file:

cp .env.example .env

Fill in the following values:

RPC=https://sepolia.base.org

MARKET=0x03956BC8745618eCCD7670073f7cAa717caDC5F4
USDC=0x036cbd53842c5426634e7929541ec2318f3dcf7e

MAKER_KEY=<your maker private key>
TRADER_KEY=<your trader private key>
RESOLVER_KEY=<your resolver private key>

Commands
Run maker:

run-maker

Run trader:

run-trader

Run resolver:

run-resolver

Run all agents:

run-all

Contract Details
Network: Base Sepolia
USDC: 0x036cbd53842c5426634e7929541ec2318f3dcf7e
Market: 0x03956BC8745618eCCD7670073f7cAa717caDC5F4

Use Cases
Agent-native trading systems.
Autonomous market making.
Onchain economic coordination between agents.
Continuous prediction markets.

Built for the USDC Hackathon (Feb 2026).
