# Robonet MCP Tools Catalog

This file contains the complete reference for all 24 MCP tools organized by category.

## Data Access Tools (8 tools)

Fast, low-cost tools for browsing data. Execution time: <1s.

### `get_all_strategies`

Returns list of all your trading strategies with metadata.

- **include_latest_backtest** (optional, boolean): Include latest backtest results
- **Returns**: List of strategies with names, components, and optionally backtest summaries
- **Pricing**: $0.001

### `get_strategy_code`

Returns Python source code for a specified trading strategy.

- **strategy_name** (required, string): Name of the strategy
- **Returns**: Python source code
- **Pricing**: Free

### `get_strategy_versions`

Returns version history and metadata for a strategy lineage.

- **base_strategy_name** (required, string): Base name without version suffixes
- **Returns**: List of all versions with creation dates and modification history
- **Pricing**: $0.001

### `get_all_symbols`

Returns list of tracked trading symbols from Hyperliquid Perpetual.

- **exchange** (optional, string): Filter by exchange name
- **active_only** (optional, boolean): Only return active symbols (default: true)
- **Returns**: List of symbols with exchange, symbol name, active status, backfill status
- **Pricing**: $0.001

### `get_all_technical_indicators`

Returns list of 170+ technical indicators available in Jesse framework.

- **category** (optional, string): Filter by category (momentum, trend, volatility, volume, overlap, oscillators, cycle, all)
- **Returns**: List of indicators with names, categories, and parameters
- **Pricing**: $0.001

### `get_allora_topics`

Returns list of Allora Network price prediction topics with metadata.

- **Parameters**: None
- **Returns**: List of topics with asset names, network IDs, and prediction horizons
- **Pricing**: $0.001

### `get_data_availability`

Check available data ranges for crypto symbols and Polymarket prediction markets.

- **data_type** (optional, string): Type of data (crypto, polymarket, all)
- **symbols** (optional, array): Specific crypto symbols
- **exchange** (optional, string): Filter crypto by exchange
- **asset** (optional, string): Filter Polymarket by asset
- **include_resolved** (optional, boolean): Include resolved Polymarket markets
- **only_with_data** (optional, boolean): Only show items with available data
- **Returns**: Data availability with date ranges, candle counts, backfill status
- **Pricing**: $0.001

### `get_latest_backtest_results`

Returns recent backtest results from the database with performance metrics.

- **strategy_name** (optional, string): Filter by strategy name
- **limit** (optional, integer, 1-100): Number of results (default: 10)
- **include_equity_curve** (optional, boolean): Include equity curve timeseries
- **equity_curve_max_points** (optional, integer, 50-1000): Maximum points for equity curve
- **Returns**: List of backtest records with metrics
- **Pricing**: Free

---

## AI-Powered Strategy Tools (6 tools)

Tools that use AI agents to generate, optimize, and enhance trading strategies. Execution time: 20-60s.

### `create_strategy`

Generate complete trading strategy code with AI based on requirements.

- **strategy_name** (required, string): Name for the new strategy
- **description** (required, string): Detailed requirements including entry/exit logic, risk management, indicators
- **Returns**: Complete Python strategy code with entry/exit logic, position sizing, risk management
- **Pricing**: Real LLM cost + margin (max $4.50)
- **Execution Time**: ~30-60s

### `generate_ideas`

Creates innovative strategy concepts based on current Hyperliquid market data.

- **strategy_count** (optional, integer, 1-10): Number of strategy ideas (default: 1)
- **Returns**: List of strategy concepts with descriptions of market conditions, logic, and rationale
- **Pricing**: Real LLM cost + margin (max $1.00)
- **Execution Time**: ~20-40s

### `optimize_strategy`

Analyzes and improves strategy parameters using backtesting data and AI.

- **strategy_name** (required, string): Name of the strategy to optimize
- **start_date** (required, string): Start date in YYYY-MM-DD format
- **end_date** (required, string): End date in YYYY-MM-DD format
- **symbol** (required, string): Trading pair
- **timeframe** (required, string): Timeframe (1m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d)
- **Returns**: Optimized strategy version with improved parameters and performance comparison
- **Pricing**: Real LLM cost + margin (max $4.00)
- **Execution Time**: ~30-60s

### `enhance_with_allora`

Adds machine learning price predictions from Allora Network to strategy logic.

- **strategy_name** (required, string): Name of the strategy to enhance
- **symbol** (required, string): Trading pair
- **timeframe** (required, string): Timeframe
- **start_date** (required, string): Start date for comparison backtest
- **end_date** (required, string): End date for comparison backtest
- **Returns**: Enhanced strategy version with ML signals integrated, plus before/after performance comparison
- **Pricing**: Real LLM cost + margin (max $2.50)
- **Execution Time**: ~30-60s

### `refine_strategy`

Apply iterative refinements to existing strategies with AI code editing.

- **strategy_name** (required, string): Strategy to refine (any version)
- **changes_description** (required, string): What changes you want to make
- **mode** (required, string): "new" (create new version) or "replace" (overwrite existing)
- **Returns**: Refined strategy code with automatic validation and safety checks
- **Pricing**: Real LLM cost + margin (max $3.00)
- **Execution Time**: ~20-30s

### `create_prediction_market_strategy`

Generate Polymarket strategy code with YES/NO token trading logic.

- **strategy_name** (required, string): Name for the strategy
- **description** (required, string): Detailed requirements for YES/NO token logic and thresholds
- **Returns**: Complete PolymarketStrategy code with should_buy_yes(), should_buy_no(), go_yes(), go_no() methods
- **Pricing**: Real LLM cost + margin (max $4.50)
- **Execution Time**: ~30-60s

---

## Backtesting Tools (2 tools)

Compute-intensive tools for testing strategy performance. Execution time: 20-40s.

### `run_backtest`

Test strategy performance on historical data.

- **strategy_name** (required, string): Name of the strategy to test
- **start_date** (required, string): Start date in YYYY-MM-DD format
- **end_date** (required, string): End date in YYYY-MM-DD format
- **symbol** (required, string): Trading pair
- **timeframe** (required, string): Timeframe
- **config** (optional, object): Backtest configuration (fee, slippage, leverage, etc.)
- **Returns**: Performance metrics (net_profit, total_return, annual_return, Sharpe ratio, max_drawdown, win_rate, profit_factor), trade statistics, equity curve
- **Pricing**: $0.001
- **Execution Time**: ~20-40s

### `run_prediction_market_backtest`

Test prediction market strategy performance on historical market data.

- **strategy_name** (required, string): Name of the PolymarketStrategy
- **start_date** (required, string): Start date in YYYY-MM-DD format
- **end_date** (required, string): End date in YYYY-MM-DD format
- **condition_id** (string, for single-market): Polymarket condition ID
- **asset** (string, for rolling-market): Asset symbol (e.g., "BTC", "ETH")
- **interval** (string, for rolling-market): Market interval (e.g., "15m", "1h")
- **initial_balance** (optional, number): Starting USDC balance (default: 10000)
- **timeframe** (optional, string): Strategy execution timeframe (default: 1m)
- **Returns**: Backtest metrics including profit/loss, win rate, position history for YES/NO tokens
- **Pricing**: $0.001
- **Execution Time**: ~20-60s

---

## Prediction Market Tools (3 tools)

Specialized tools for building and testing Polymarket prediction market strategies.

### `get_all_prediction_events`

Returns tracked prediction events with their markets from Polymarket.

- **active_only** (optional, boolean): Only return active events (default: true)
- **market_category** (optional, string): Filter by category (e.g., "crypto_rolling", "politics", "economics")
- **Returns**: List of prediction events with event name, category, markets, condition IDs, resolution status
- **Pricing**: $0.001

### `get_prediction_market_data`

Returns prediction market metadata and YES/NO token price timeseries.

- **condition_id** (required, string): Polymarket condition ID
- **start_date** (optional, string): Filter candles from date
- **end_date** (optional, string): Filter candles to date
- **timeframe** (optional, string): Candle timeframe (1m, 5m, 15m, 30m, 1h, 4h, default: 1m)
- **limit** (optional, integer): Maximum candles per token (default: 1000, max: 10000)
- **Returns**: Market metadata, YES token price timeseries, NO token price timeseries
- **Pricing**: $0.001

---

## Deployment Tools (4 tools)

Tools for deploying and managing live trading agents on Hyperliquid.

### `deployment_create`

Deploy a strategy to live trading on Hyperliquid.

- **strategy_name** (required, string): Name of strategy to deploy
- **symbol** (required, string): Trading pair
- **timeframe** (required, string): Candle interval
- **leverage** (optional, number, 1-5): Position multiplier (default: 1)
- **deployment_type** (optional, string): "eoa" (wallet) or "vault" (default: eoa)
- **vault_name** (required for vault, string): Unique name for the Hyperliquid vault
- **vault_description** (optional, string): Description for the vault
- **Returns**: Deployment ID, status, wallet address, configuration details
- **Pricing**: $0.50
- **Constraints**: EOA max 1 active deployment per wallet; Hyperliquid Vault requires 200+ USDC in wallet, unlimited deployments

### `deployment_list`

List all your deployments with status and performance metrics.

- **Parameters**: None
- **Returns**: List of deployments including ID, strategy name, symbol, timeframe, leverage, status, deployment type, timestamps, Hyperliquid stats
- **Pricing**: Free

### `deployment_start`

Start a stopped or failed deployment.

- **deployment_id** (required, string): ID of the deployment to start
- **Returns**: Updated deployment status
- **Pricing**: Free
- **Note**: Can only start deployments with status "stopped" or "failed"

### `deployment_stop`

Stop a running deployment.

- **deployment_id** (required, string): ID of the deployment to stop
- **Returns**: Updated deployment status
- **Pricing**: Free

---

## Account Tools (2 tools)

Tools for managing credits and viewing account information.

### `get_credit_balance`

Get your current USDC credit balance.

- **Parameters**: None (requires authentication)
- **Returns**: balance_usdc (current credit balance), wallet_address (associated wallet)
- **Pricing**: Free

### `get_credit_transactions`

View credit transaction history with filtering and pagination.

- **limit** (optional, integer, 1-100): Results per page (default: 20)
- **page** (optional, integer): Page number, 1-indexed (default: 1)
- **transaction_type** (optional, string): Filter by type (deposit, spend, withdraw, refund)
- **Returns**: Paginated list of transactions with type, amount, timestamp, related tool
- **Pricing**: Free
