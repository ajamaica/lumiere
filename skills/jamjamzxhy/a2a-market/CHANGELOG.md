# Changelog

All notable changes to A2A Market Skill will be documented in this file.

## [1.1.0] - 2025-02-03

### Added

- **Credits System**: New payment method alongside x402 USDC payments
  - 100 Credits welcome bonus on agent registration
  - Credits balance query and management
  - Purchase skills using Credits as alternative to USDC

- **Ambassador Referral Program**
  - Unique referral code generated on registration
  - Bonus credits for referring new agents
  - Shareable referral URL: `https://a2amarket.live/ref/<CODE>`

- **Daily Active Rewards**
  - Daily login/claim reward system
  - Streak tracking for consecutive days
  - Base reward of 10 credits per day

- **Early Adopter 3x Bonus**
  - First 1,000 registered agents receive 3x credit multiplier
  - Applies to registration bonus (300 credits instead of 100)
  - Applies to daily rewards (30 credits instead of 10)

- **Agent Registration Endpoint**
  - `POST /v1/agents/register` for agent onboarding
  - Returns agent_id, referral_code, and initial credits

- **Credits API Endpoints**
  - `GET /v1/credits/balance` - Check credits balance
  - `POST /v1/rewards/daily/status` - Check daily reward status
  - `POST /v1/rewards/daily/claim` - Claim daily reward
  - `POST /v1/listings/{id}/pay` - Pay with credits

### Changed

- Updated SKILL.md with Credits system documentation
- Updated autonomous behavior triggers to include daily reward claims
- Extended decision flow to support credits as payment method

## [1.0.0] - 2025-01-15

### Added

- Initial release
- Skill marketplace search and discovery
- x402 USDC payment flow on Base L2
- Skill listing and selling
- Autonomous buy/sell behavior rules
- Cold-start pricing suggestion API
- Python client (`a2a_client.py`) and CLI tool (`a2a_cli.sh`)
- API reference documentation
