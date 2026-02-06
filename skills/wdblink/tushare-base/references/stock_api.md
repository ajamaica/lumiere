# Tushare 股票接口文档

官方文档: https://tushare.pro/document/2?doc_id=14

## 基础信息接口

### stock_basic - 股票基础信息

**输入参数**：

| 名称 | 类型 | 必选 | 描述 |
|------|------|------|------|
| ts_code | str | N | TS股票代码 |
| name | str | N | 股票名称 |
| exchange | str | N | 交易所 (SSE/SZSE) |
| market | str | N | 市场类型 |
| is_hs | str | N | 是否沪深港通 (N/H/S) |
| list_status | str | N | 上市状态 (L上市/D退市/P暂停上市) |

**输出字段**：

| 名称 | 类型 | 描述 |
|------|------|------|
| ts_code | str | TS代码 |
| symbol | str | 股票代码 |
| name | str | 股票名称 |
| area | str | 地域 |
| industry | str | 所属行业 |
| fullname | str | 股票全称 |
| enname | str | 英文全称 |
| cnspell | str | 拼音缩写 |
| market | str | 市场类型 |
| exchange | str | 交易所代码 |
| curr_type | str | 交易货币 |
| list_status | str | 上市状态 |
| list_date | str | 上市日期 |
| delist_date | str | 退市日期 |
| is_hs | str | 是否沪深港通标的 |

## 行情接口

### daily - 日线行情

**输入参数**：

| 名称 | 类型 | 必选 | 描述 |
|------|------|------|------|
| ts_code | str | N | 股票代码 |
| trade_date | str | N | 交易日期 (YYYYMMDD) |
| start_date | str | N | 开始日期 |
| end_date | str | N | 结束日期 |

**输出字段**：

| 名称 | 类型 | 描述 |
|------|------|------|
| ts_code | str | 股票代码 |
| trade_date | str | 交易日期 |
| open | float | 开盘价 |
| high | float | 最高价 |
| low | float | 最低价 |
| close | float | 收盘价 |
| pre_close | float | 昨收价 |
| change | float | 涨跌额 |
| pct_chg | float | 涨跌幅 |
| vol | float | 成交量（手） |
| amount | float | 成交额（千元） |

### moneyflow - 个股资金流向

**输入参数**：

| 名称 | 类型 | 必选 | 描述 |
|------|------|------|------|
| ts_code | str | N | 股票代码 |
| trade_date | str | N | 交易日期 |
| start_date | str | N | 开始日期 |
| end_date | str | N | 结束日期 |

**输出字段**：

| 名称 | 类型 | 描述 |
|------|------|------|
| ts_code | str | 股票代码 |
| trade_date | str | 交易日期 |
| buy_sm_vol | int | 小单买入量（手） |
| buy_sm_amount | float | 小单买入金额（万元） |
| sell_sm_vol | int | 小单卖出量（手） |
| sell_sm_amount | float | 小单卖出金额（万元） |
| buy_md_vol | int | 中单买入量（手） |
| buy_md_amount | float | 中单买入金额（万元） |
| sell_md_vol | int | 中单卖出量（手） |
| sell_md_amount | float | 中单卖出金额（万元） |
| buy_lg_vol | int | 大单买入量（手） |
| buy_lg_amount | float | 大单买入金额（万元） |
| sell_lg_vol | int | 大单卖出量（手） |
| sell_lg_amount | float | 大单卖出金额（万元） |
| buy_elg_vol | int | 特大单买入量（手） |
| buy_elg_amount | float | 特大单买入金额（万元） |
| sell_elg_vol | int | 特大单卖出量（手） |
| sell_elg_amount | float | 特大单卖出金额（万元） |
| net_mf_vol | int | 净流入量（手） |
| net_mf_amount | float | 净流入额（万元） |

## 公司信息接口

### stock_company - 上市公司基本信息

**输入参数**：

| 名称 | 类型 | 必选 | 描述 |
|------|------|------|------|
| ts_code | str | N | 股票代码 |
| exchange | str | N | 交易所代码 |

**输出字段**：

| 名称 | 类型 | 描述 |
|------|------|------|
| ts_code | str | 股票代码 |
| exchange | str | 交易所代码 |
| chairman | str | 董事长 |
| manager | str | 总经理 |
| secretary | str | 董秘 |
| reg_capital | float | 注册资本（万元） |
| setup_date | str | 注册日期 |
| province | str | 所在省份 |
| city | str | 所在城市 |
| introduction | str | 公司介绍 |
| website | str | 公司主页 |
| email | str | 电子邮件 |
| office | str | 办公地址 |
| employees | int | 员工人数 |
| main_business | str | 主要业务及产品 |
| business_scope | str | 经营范围 |

## 股票代码说明

### 交易所代码

| 代码 | 交易所 |
|------|--------|
| SSE | 上海证券交易所 |
| SZSE | 深圳证券交易所 |

### 市场类型

| 代码 | 含义 |
|------|------|
| 主板 | 沪市主板、深市主板 |
| 中小板 | 深市中小板（已合并至主板） |
| 创业板 | 深市创业板 (300xxx.SZ) |
| 科创板 | 沪市科创板 (688xxx.SH) |
| 北交所 | 北京证券交易所 |

### 代码后缀

| 后缀 | 含义 |
|------|------|
| .SH | 上海证券交易所 |
| .SZ | 深圳证券交易所 |
| .BJ | 北京证券交易所 |
