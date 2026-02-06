# FAQ — Binance Skill

This FAQ covers common questions and solutions when using the Binance skill.

Q: How do I set up my API keys?
A: Create API keys in your Binance account (Account > API Management). Copy the API key and secret and either add them to your environment variables (e.g. export BINANCE_API_KEY and BINANCE_SECRET) or place them in a .env file generated from templates/.env.example. For security, never commit real keys to git.

Q: What's the difference between TESTNET and PRODUCTION?
A: TESTNET is a sandbox environment provided by Binance where you can test trading without real funds. Use TESTNET API keys and set TESTNET=true in your .env. Production (MAINNET) interacts with real assets — set TRADE_MODE="live" and use production keys.

Q: I get error -1021 (Timestamp outside recvWindow). What do I do?
A: This means your system clock is not synced. Sync system time (e.g., with ntp or systemd-timesyncd). Alternatively increase RECV_WINDOW in your .env or config.

Q: Error -2010 (Insufficient balance)
A: Your account doesn't have enough free balance for the order. Check available balances and consider reducing order size. If using margin/futures, ensure margin is allocated and leverage settings are correct.

Q: Orders rejected with -1013 (Invalid quantity)
A: The symbol has lot size filters. Query exchange info to see minQty, stepSize and adjust the quantity to valid increments.

Q: API key permissions and IP restrictions
A: Ensure your API key has the required permissions (e.g., Spot, Margin, Futures) enabled. If IP restrictions are set on the Binance dashboard, add your client IP or remove restrictions during testing.

Q: How do I test strategies safely?
A: Use TESTNET, paper trading mode (TRADE_MODE=paper), and the simulation options in config.yaml.example. Start small and enable require_confirmation in execution_checks.

Q: Websocket/streaming connection issues
A: Check network/firewall rules, ensure correct websocket URL (wss://stream.binance.com:9443), and increase timeouts for flaky networks. Reconnect logic should back off exponentially.

Q: Where to find official docs?
A: https://binance-docs.github.io/apidocs/

Q: I accidentally executed a trade. Can I cancel it?
A: Market orders execute immediately and cannot be cancelled. Limit orders can be cancelled using the Cancel Order endpoint. Check order status with Get Order before attempting cancel.

If you still have problems, open an issue or contact the maintainer with logs and the .env (without secrets).
