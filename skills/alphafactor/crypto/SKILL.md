---
name: crypto
description: Cryptocurrency market data and price alert monitoring tool based on CCXT. Supports multiple exchanges, real-time price tracking, and configurable price/volatility alerts. Use when the user needs to monitor crypto prices or set up trading alerts. Default exchange is Binance.
---

# 加密货币行情与价格预警

基于 CCXT 库的加密货币行情获取和价格监控预警工具，支持多交易所、实时监控和智能预警。

## 功能特性

- 🏢 **多交易所支持** - 默认 Binance，支持 OKX、Bybit、Gate.io、KuCoin 等
- 📊 **实时行情** - 获取最新价格、涨跌幅、成交量等信息
- 📈 **K线数据** - 获取历史价格走势
- 📖 **订单簿** - 查看买卖盘深度
- 🔔 **价格预警** - 支持价格阈值、涨跌幅百分比预警
- 👁️ **实时监控** - 持续监控价格变动

## 前提条件

### 安装依赖

```bash
pip3 install ccxt --user
```

## 使用方法

### 查看实时行情

```bash
# 默认使用 Binance
python3 scripts/crypto.py ticker BTC/USDT

# 使用其他交易所
python3 scripts/crypto.py -e okx ticker ETH/USDT
python3 scripts/crypto.py -e bybit ticker BTC/USDT
```

**支持的交易所**：

- `binance` - 币安（默认）
- `okx` - OKX
- `bybit` - Bybit
- `gateio` - Gate.io
- `kucoin` - KuCoin
- `huobi` - 火币
- `coinbase` - Coinbase
- `kraken` - Kraken
- `bitfinex` - Bitfinex

### 获取K线数据

```bash
# 获取1小时K线，最近24条
python3 scripts/crypto.py ohlcv BTC/USDT --timeframe 1h --limit 24

# 获取日线数据
python3 scripts/crypto.py ohlcv ETH/USDT --timeframe 1d --limit 30
```

**时间周期**：

- `1m` - 1分钟
- `5m` - 5分钟
- `15m` - 15分钟
- `1h` - 1小时
- `4h` - 4小时
- `1d` - 1天
- `1w` - 1周
- `1M` - 1月

### 查看订单簿

```bash
python3 scripts/crypto.py orderbook BTC/USDT --limit 10
```

### 实时监控价格

```bash
# 每10秒刷新（默认）
python3 scripts/crypto.py watch BTC/USDT

# 每5秒刷新
python3 scripts/crypto.py watch ETH/USDT --interval 5
```

## 价格预警

### 添加预警

**价格突破预警：**

```bash
# BTC 价格突破 70000 USDT 时预警
python3 scripts/crypto.py alert-add BTC/USDT above 70000

# ETH 价格跌破 3000 USDT 时预警
python3 scripts/crypto.py alert-add ETH/USDT below 3000
```

**涨跌幅预警：**

```bash
# BTC 涨幅超过 5% 时预警
python3 scripts/crypto.py alert-add BTC/USDT up_percent 5

# ETH 跌幅超过 3% 时预警
python3 scripts/crypto.py alert-add ETH/USDT down_percent 3
```

### 查看预警列表

```bash
python3 scripts/crypto.py alert-list
```

输出示例：

```
🔔 价格预警列表 (3 个):

ID                        交易对          交易所       条件                      状态
------------------------------------------------------------------------------------------
BTC/USDT_1706941200       BTC/USDT        binance      价格 > 70000              ⏳监控中
ETH/USDT_1706941300       ETH/USDT        okx          价格 < 3000               ⏳监控中
BTC/USDT_1706941400       BTC/USDT        binance      涨幅 > 5%                 ⏳监控中
```

### 检查预警

```bash
# 手动检查所有预警条件
python3 scripts/crypto.py alert-check
```

当条件触发时，会显示：

```
⚠️  触发 1 个预警:

  🚀 BTC/USDT 涨幅达到 5.23%，当前价格: 71234.56
  预警ID: BTC/USDT_1706941400
```

### 删除预警

```bash
python3 scripts/crypto.py alert-remove BTC/USDT_1706941200
```

## 命令参考

| 命令           | 功能     | 示例                             |
| -------------- | -------- | -------------------------------- |
| `ticker`       | 实时行情 | `ticker BTC/USDT`                |
| `ohlcv`        | K线数据  | `ohlcv BTC/USDT --timeframe 1h`  |
| `orderbook`    | 订单簿   | `orderbook BTC/USDT`             |
| `watch`        | 实时监控 | `watch BTC/USDT --interval 5`    |
| `alert-add`    | 添加预警 | `alert-add BTC/USDT above 70000` |
| `alert-remove` | 删除预警 | `alert-remove ID`                |
| `alert-list`   | 列出预警 | `alert-list`                     |
| `alert-check`  | 检查预警 | `alert-check`                    |

### 全局参数

| 参数          | 简写 | 说明         | 默认值    |
| ------------- | ---- | ------------ | --------- |
| `--exchange`  | `-e` | 交易所       | `binance` |
| `--timeframe` | `-t` | K线周期      | `1h`      |
| `--limit`     | `-l` | 数据条数     | `24`      |
| `--interval`  | `-i` | 刷新间隔(秒) | `10`      |

## 预警条件说明

| 条件           | 说明           | 示例             |
| -------------- | -------------- | ---------------- |
| `above`        | 价格高于阈值   | `above 70000`    |
| `below`        | 价格低于阈值   | `below 3000`     |
| `up_percent`   | 涨幅超过百分比 | `up_percent 5`   |
| `down_percent` | 跌幅超过百分比 | `down_percent 3` |

## 使用场景

### 场景1：追踪特定价格

```bash
# BTC 突破前高预警
python3 scripts/crypto.py alert-add BTC/USDT above 69000

# 定期检查
python3 scripts/crypto.py alert-check
```

### 场景2：监控支撑位/阻力位

```bash
# ETH 跌破关键支撑预警
python3 scripts/crypto.py alert-add ETH/USDT below 2800

# BTC 突破阻力预警
python3 scripts/crypto.py alert-add BTC/USDT above 72000
```

### 场景3：波动率监控

```bash
# 监控大幅波动
python3 scripts/crypto.py alert-add BTC/USDT up_percent 8
python3 scripts/crypto.py alert-add BTC/USDT down_percent 8
```

### 场景4：多交易所比价

```bash
# 查看不同交易所价格
python3 scripts/crypto.py -e binance ticker BTC/USDT
python3 scripts/crypto.py -e okx ticker BTC/USDT
python3 scripts/crypto.py -e bybit ticker BTC/USDT
```

## 常见问题

**错误：ccxt 库未安装**
→ 运行: `pip3 install ccxt --user`

**错误：不支持的交易所**
→ 检查交易所名称拼写，查看支持的交易所列表

**错误：交易对不存在**
→ 检查交易对格式，如 `BTC/USDT`、`ETH/USDT`

**预警未触发**
→ 确认预警条件设置正确，运行 `alert-check` 手动检查

**API 限制**
→ 部分交易所有请求频率限制，使用 `--interval` 调整刷新间隔

## 配置文件

预警配置存储在：`~/.config/crypto/alerts.json`

可以手动编辑此文件批量管理预警。

## 参考

- CCXT 文档: https://docs.ccxt.com/
- 支持的交易所列表: [references/exchanges.md](references/exchanges.md)
