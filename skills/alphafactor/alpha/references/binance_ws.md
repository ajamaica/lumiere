# Binance WebSocket API 参考

官方文档: https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams

## 流式接口

### !miniTicker@arr - 所有交易对迷你行情

**连接地址**：

```
wss://stream.binance.com:9443/ws/!miniTicker@arr
```

**数据格式**：

```json
[
  {
    "e": "24hrMiniTicker", // 事件类型
    "E": 1234567890123, // 事件时间（毫秒）
    "s": "BTCUSDT", // 交易对
    "c": "43250.50", // 最新价格
    "o": "43100.00", // 开盘价
    "h": "43500.00", // 最高价
    "l": "42800.00", // 最低价
    "v": "15234.56", // 成交量（base asset）
    "q": "658923456.78" // 成交额（quote asset）
  }
]
```

**字段说明**：

| 字段 | 类型   | 说明                   |
| ---- | ------ | ---------------------- |
| e    | string | 事件类型               |
| E    | long   | 事件时间（毫秒时间戳） |
| s    | string | 交易对符号             |
| c    | string | 最新成交价格           |
| o    | string | 24小时前价格（开盘价） |
| h    | string | 24小时内最高价         |
| l    | string | 24小时内最低价         |
| v    | string | 24小时内成交量         |
| q    | string | 24小时内成交额         |

**更新频率**：1000ms（每秒推送一次）

### 单个交易对行情

**连接地址**：

```
wss://stream.binance.com:9443/ws/btcusdt@miniTicker
```

**数据格式**：单个对象（非数组）

```json
{
  "e": "24hrMiniTicker",
  "E": 1234567890123,
  "s": "BTCUSDT",
  "c": "43250.50",
  "o": "43100.00",
  "h": "43500.00",
  "l": "42800.00",
  "v": "15234.56",
  "q": "658923456.78"
}
```

### 完整 Ticker 数据

**连接地址**：

```
wss://stream.binance.com:9443/ws/!ticker@arr
```

包含更多字段：

- `p` - 价格变化
- `P` - 价格变化百分比
- `w` - 加权平均价格
- `x` - 第一笔成交价
- `Q` - 最新成交数量
- `b` - 买一价
- `B` - 买一量
- `a` - 卖一价
- `A` - 卖一量
- `O` - 统计开始时间
- `C` - 统计结束时间
- `F` - 第一笔成交ID
- `L` - 最后一笔成交ID
- `n` - 成交笔数

## REST API 补充

### 获取最新价格

```
GET /api/v3/ticker/price?symbol=BTCUSDT
```

**响应**：

```json
{
  "symbol": "BTCUSDT",
  "price": "43250.50"
}
```

### 获取24小时统计

```
GET /api/v3/ticker/24hr?symbol=BTCUSDT
```

**响应**：

```json
{
  "symbol": "BTCUSDT",
  "priceChange": "150.50",
  "priceChangePercent": "0.35",
  "weightedAvgPrice": "43150.25",
  "prevClosePrice": "43100.00",
  "lastPrice": "43250.50",
  "lastQty": "0.5",
  "bidPrice": "43250.00",
  "bidQty": "1.2",
  "askPrice": "43251.00",
  "askQty": "0.8",
  "openPrice": "43100.00",
  "highPrice": "43500.00",
  "lowPrice": "42800.00",
  "volume": "15234.56",
  "quoteVolume": "658923456.78",
  "openTime": 1234567890123,
  "closeTime": 1234567950123,
  "firstId": 100,
  "lastId": 200,
  "count": 101
}
```

### 获取所有交易对

```
GET /api/v3/exchangeInfo
```

## WebSocket 连接管理

### 心跳

Binance WebSocket 服务器会定期发送 ping 帧，客户端需要响应 pong。

### 重连策略

建议实现以下重连逻辑：

1. 检测到连接断开
2. 等待 1-5 秒（指数退避）
3. 重新连接
4. 恢复状态（known_symbols）

### 错误处理

常见错误码：

- `1006` - 连接异常关闭
- `1008` - 政策违规
- `1011` - 服务器错误

## 限流规则

- 单个 IP 最多 5 个并发 WebSocket 连接
- 超出限制会收到 `1008` 错误

## 使用示例

### Python (websocket-client)

```python
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    for ticker in data:
        symbol = ticker['s']
        price = ticker['c']
        print(f"{symbol}: {price}")

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("Connection closed")

def on_open(ws):
    print("Connection opened")

ws = websocket.WebSocketApp(
    "wss://stream.binance.com:9443/ws/!miniTicker@arr",
    on_open=on_open,
    on_message=on_message,
    on_error=on_error,
    on_close=on_close
)

ws.run_forever()
```

### JavaScript (浏览器)

```javascript
const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr')

ws.onopen = () => {
  console.log('Connected')
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  data.forEach((ticker) => {
    console.log(`${ticker.s}: ${ticker.c}`)
  })
}

ws.onerror = (error) => {
  console.error('Error:', error)
}

ws.onclose = () => {
  console.log('Disconnected')
}
```

## 注意事项

1. **实时性** - WebSocket 数据比 REST API 更快
2. **完整性** - 连接瞬间可能丢失部分数据
3. **排序** - 数据包按时间顺序推送
4. **频率** - 每秒推送一次完整数组
