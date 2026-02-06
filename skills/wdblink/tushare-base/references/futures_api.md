# Tushare 期货接口文档

官方文档: https://tushare.pro/document/2?doc_id=134

## 基础信息接口

### fut_basic - 期货合约基础信息

**输入参数**：

| 名称 | 类型 | 必选 | 描述 |
|------|------|------|------|
| exchange | str | N | 交易所代码 |
| fut_type | str | N | 合约类型 (1: 普通合约 2: 主力合约) |

**输出字段**：

| 名称 | 类型 | 描述 |
|------|------|------|
| ts_code | str | 合约代码 |
| symbol | str | 交易标的 |
| exchange | str | 交易所 |
| name | str | 合约名称 |
| fut_code | str | 合约标码 |
| multiplier | float | 合约乘数 |
| trade_unit | str | 交易单位 |
| per_unit | float | 最小变动价位 |
| delivery_date | str | 交割日期 |
| delist_date | str | 最后交易日期 |
| list_date | str | 上市日期 |
| last_ddate | str | 最后交割日 |
| trade_time_desc | str | 交易时间描述 |

## 行情接口

### fut_daily - 期货日线行情

**输入参数**：

| 名称 | 类型 | 必选 | 描述 |
|------|------|------|------|
| trade_date | str | N | 交易日期 |
| ts_code | str | N | 合约代码 |
| exchange | str | N | 交易所 |
| start_date | str | N | 开始日期 |
| end_date | str | N | 结束日期 |

**输出字段**：

| 名称 | 类型 | 描述 |
|------|------|------|
| ts_code | str | 合约代码 |
| trade_date | str | 交易日期 |
| pre_close | float | 昨收盘价 |
| pre_settle | float | 昨结算价 |
| open | float | 开盘价 |
| high | float | 最高价 |
| low | float | 最低价 |
| close | float | 收盘价 |
| settle | float | 结算价 |
| change1 | float | 涨跌1（收盘价-昨结算价） |
| change2 | float | 涨跌2（结算价-昨结算价） |
| vol | float | 成交量（手） |
| amount | float | 成交金额（万元） |
| oi | float | 持仓量（手） |
| oi_chg | float | 持仓量变化 |
| exchange | str | 交易所 |

### fut_holding - 每日持仓排名

**输入参数**：

| 名称 | 类型 | 必选 | 描述 |
|------|------|------|------|
| trade_date | str | N | 交易日期 |
| symbol | str | N | 合约代码（不带年份月份） |
| exchange | str | N | 交易所 |

**输出字段**：

| 名称 | 类型 | 描述 |
|------|------|------|
| trade_date | str | 交易日期 |
| symbol | str | 合约符号 |
| broker | str | 期货公司会员 |
| vol | int | 成交量 |
| vol_chg | int | 成交量变动 |
| long_hld | int | 多单持仓 |
| long_chg | int | 多单持仓变动 |
| short_hld | int | 空单持仓 |
| short_chg | int | 空单持仓变动 |
| exchange | str | 交易所 |

### fut_wsr - 期货仓单日报

**输入参数**：

| 名称 | 类型 | 必选 | 描述 |
|------|------|------|------|
| trade_date | str | N | 交易日期 |
| symbol | str | N | 合约代码 |
| exchange | str | N | 交易所 |

**输出字段**：

| 名称 | 类型 | 描述 |
|------|------|------|
| trade_date | str | 交易日期 |
| symbol | str | 合约代码 |
| wsr_num | int | 仓单数量 |
| wsr_num_chg | int | 仓单数量变化 |
| wsr_unit | str | 仓单单位 |
| close | float | 收盘价 |
| exchange | str | 交易所 |

### fut_settle - 期货结算参数

**输入参数**：

| 名称 | 类型 | 必选 | 描述 |
|------|------|------|------|
| trade_date | str | N | 交易日期 |
| exchange | str | N | 交易所 |

**输出字段**：

| 名称 | 类型 | 描述 |
|------|------|------|
| trade_date | str | 交易日期 |
| ts_code | str | 合约代码 |
| exchange | str | 交易所 |
| settle | float | 结算价 |
| trading_fee_rate | float | 交易手续费率 |
| trading_fee | float | 交易手续费 |
| delivery_fee | float | 交割手续费 |
| min_price_chg | float | 最小变动价位 |

## 期货代码说明

### 交易所代码

| 代码 | 交易所 | 主要品种 |
|------|--------|----------|
| SHFE | 上海期货交易所 | 铜、铝、锌、黄金、原油、螺纹钢 |
| DCE | 大连商品交易所 | 豆粕、豆油、铁矿石、焦炭、玉米 |
| CZCE | 郑州商品交易所 | 棉花、白糖、PTA、菜粕、甲醇 |
| CFFEX | 中国金融期货交易所 | 沪深300、中证500、国债期货 |
| INE | 上海国际能源交易中心 | 原油期货 |
| GFEX | 广州期货交易所 | 工业硅、碳酸锂 |

### 常见品种代码

| 品种 | 代码 | 交易所 |
|------|------|--------|
| 铜 | CU | SHFE |
| 铝 | AL | SHFE |
| 锌 | ZN | SHFE |
| 黄金 | AU | SHFE |
| 白银 | AG | SHFE |
| 原油 | SC | INE |
| 螺纹钢 | RB | SHFE |
| 热轧卷板 | HC | SHFE |
| 天然橡胶 | RU | SHFE |
| 豆粕 | M | DCE |
| 豆油 | Y | DCE |
| 棕榈油 | P | DCE |
| 铁矿石 | I | DCE |
| 焦炭 | J | DCE |
| 焦煤 | JM | DCE |
| 玉米 | C | DCE |
| 棉花 | CF | CZCE |
| 白糖 | SR | CZCE |
| PTA | TA | CZCE |
| 甲醇 | MA | CZCE |
| 菜粕 | RM | CZCE |
| 玻璃 | FG | CZCE |
| 纯碱 | SA | CZCE |
| 沪深300指数期货 | IF | CFFEX |
| 中证500指数期货 | IC | CFFEX |
| 上证50指数期货 | IH | CFFEX |
| 10年期国债期货 | T | CFFEX |
| 5年期国债期货 | TF | CFFEX |

### 合约代码格式

期货合约代码由 **品种代码 + 到期年月** 组成：

- `CU2403` - 2024年3月到期的铜合约
- `RB2405` - 2024年5月到期的螺纹钢合约
- `IF2403` - 2024年3月到期的沪深300股指期货

主力合约通常用 `.SHF`, `.DCE`, `.CZC`, `.CFX` 后缀表示：
- `CU.SHF` - 铜主力合约（上期所）
- `M.DCE` - 豆粕主力合约（大商所）
- `IF.CFX` - 沪深300主力合约（中金所）

## 交易时间

### 日盘（上午 + 下午）
- 上午：09:00 - 10:15, 10:30 - 11:30
- 下午：13:30 - 15:00

### 夜盘（部分品种）
- 21:00 - 23:00（有色金属、黑色系等）
- 21:00 - 02:30（原油、贵金属等）

具体交易时间因品种而异，请参考各交易所规定。
