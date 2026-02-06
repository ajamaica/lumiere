# CCXT 支持的交易所列表

CCXT 库支持超过 100 个加密货币交易所。

## 主流交易所

| 交易所 ID   | 名称         | 现货 | 合约 | 备注               |
| ----------- | ------------ | ---- | ---- | ------------------ |
| binance     | 币安         | ✅   | ✅   | 默认推荐，深度最好 |
| binanceus   | 币安美国     | ✅   | ❌   | 美国合规版本       |
| okx         | OKX          | ✅   | ✅   | 原 OKEx            |
| bybit       | Bybit        | ✅   | ✅   | 合约交易强         |
| gateio      | Gate.io      | ✅   | ✅   | 小币种多           |
| kucoin      | KuCoin       | ✅   | ✅   | 新币上线快         |
| huobi       | 火币         | ✅   | ✅   | HTX                |
| coinbase    | Coinbase     | ✅   | ❌   | 美国合规           |
| coinbasepro | Coinbase Pro | ✅   | ❌   | 专业版             |
| kraken      | Kraken       | ✅   | ✅   | 欧洲老牌           |
| bitfinex    | Bitfinex     | ✅   | ✅   | 专业交易者         |
| bitstamp    | Bitstamp     | ✅   | ❌   | 欧洲合规           |
| gemini      | Gemini       | ✅   | ❌   | 美国合规           |

## 衍生品交易所

| 交易所 ID    | 名称       | 合约类型       | 备注       |
| ------------ | ---------- | -------------- | ---------- |
| binancecoinm | 币安币本位 | 交割/永续      | 币本位合约 |
| binanceusdm  | 币安U本位  | 交割/永续      | USDT本位   |
| okx5         | OKX        | 交割/永续/期权 | V5 API     |
| bybit        | Bybit      | 交割/永续      | 反向合约   |
| dydx         | dYdX       | 永续           | 去中心化   |
| gmx          | GMX        | 永续           | 去中心化   |

## 去中心化交易所 (DEX)

| 交易所 ID   | 名称        | 类型 | 备注    |
| ----------- | ----------- | ---- | ------- |
| uniswap     | Uniswap     | AMM  | ETH生态 |
| sushiswap   | SushiSwap   | AMM  | 多链    |
| pancakeswap | PancakeSwap | AMM  | BSC生态 |
| curve       | Curve       | AMM  | 稳定币  |
| balancer    | Balancer    | AMM  | 加权池  |

## 获取交易所列表

```python
import ccxt

# 所有交易所
exchanges = ccxt.exchanges
print(f"支持 {len(exchanges)} 个交易所")

# 检查特定交易所是否可用
if 'binance' in ccxt.exchanges:
    print("支持币安")

# 获取交易所信息
exchange = ccxt.binance()
print(exchange.id)        # binance
print(exchange.name)      # Binance
print(exchange.urls['www'])  # https://www.binance.com
```

## 交易所分类

### 按地区

**中国/亚洲用户友好：**

- binance, okx, bybit, gateio, kucoin, huobi

**美国合规：**

- coinbase, kraken, gemini, binanceus

**欧洲合规：**

- kraken, bitstamp, bitfinex

### 按功能

**现货交易：**

- 所有交易所都支持

**合约交易：**

- binance, okx, bybit, bitfinex, kraken

**期权交易：**

- okx, deribit

**杠杆代币：**

- binance, ftx(已关闭)

## 交易所设置

### API 密钥（高级用法）

如果需要私有 API（下单、查看账户等）：

```python
import ccxt

exchange = ccxt.binance({
    'apiKey': 'YOUR_API_KEY',
    'secret': 'YOUR_SECRET_KEY',
    'enableRateLimit': True,
    'options': {
        'defaultType': 'spot',  # 或 'future' 合约
    }
})
```

### 代理设置

```python
exchange = ccxt.binance({
    'proxies': {
        'http': 'http://127.0.0.1:7890',
        'https': 'http://127.0.0.1:7890',
    }
})
```

## 常见交易对格式

| 格式          | 示例          | 说明           |
| ------------- | ------------- | -------------- |
| BTC/USDT      | BTC/USDT      | 现货标准格式   |
| BTC/USDT:USDT | BTC/USDT:USDT | 币安U本位合约  |
| BTC/USD:BTC   | BTC/USD:BTC   | 币安币本位合约 |
| BTC-PERP      | BTC-PERP      | 永续合约       |

## 官方文档

- CCXT GitHub: https://github.com/ccxt/ccxt
- CCXT Docs: https://docs.ccxt.com/
- 交易所 API 文档: 各交易所官网
