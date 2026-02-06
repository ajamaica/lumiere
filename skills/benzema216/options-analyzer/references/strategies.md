# 期权策略详解

## 📈 看涨策略 (Bullish)

### Long Call (买入看涨期权)

- **构建**: 买入 Call
- **观点**: 强烈看涨
- **最大盈利**: 无限
- **最大亏损**: 权利金
- **盈亏平衡**: Strike + Premium
- **适用场景**: 预期大涨，低IV环境

### Bull Call Spread (牛市看涨价差)

- **构建**: 买低Strike Call + 卖高Strike Call
- **观点**: 温和看涨
- **最大盈利**: (高Strike - 低Strike) - 净权利金
- **最大亏损**: 净权利金支出
- **盈亏平衡**: 低Strike + 净权利金
- **适用场景**: 看涨但不确定涨幅，降低成本

### Bull Put Spread (牛市看跌价差)

- **构建**: 卖高Strike Put + 买低Strike Put
- **观点**: 温和看涨/中性偏多
- **最大盈利**: 净权利金收入
- **最大亏损**: (高Strike - 低Strike) - 净权利金
- **盈亏平衡**: 高Strike - 净权利金
- **适用场景**: 高IV环境收权利金

### Covered Call (备兑看涨)

- **构建**: 持有100股 + 卖1 OTM Call
- **观点**: 温和看涨
- **最大盈利**: (Strike - 买入价) × 100 + 权利金
- **最大亏损**: 股票归零风险 - 权利金
- **适用场景**: 长期持股，增加收益

## 📉 看跌策略 (Bearish)

### Long Put (买入看跌期权)

- **构建**: 买入 Put
- **观点**: 强烈看跌
- **最大盈利**: Strike - Premium (理论上股价归零)
- **最大亏损**: 权利金
- **盈亏平衡**: Strike - Premium
- **适用场景**: 预期大跌，低IV环境

### Bear Put Spread (熊市看跌价差)

- **构建**: 买高Strike Put + 卖低Strike Put
- **观点**: 温和看跌
- **最大盈利**: (高Strike - 低Strike) - 净权利金
- **最大亏损**: 净权利金支出
- **盈亏平衡**: 高Strike - 净权利金
- **适用场景**: 看跌但控制成本

### Bear Call Spread (熊市看涨价差)

- **构建**: 卖低Strike Call + 买高Strike Call
- **观点**: 温和看跌/中性偏空
- **最大盈利**: 净权利金收入
- **最大亏损**: (高Strike - 低Strike) - 净权利金
- **适用场景**: 高IV环境收权利金

### Protective Put (保护性看跌)

- **构建**: 持有100股 + 买1 Put
- **观点**: 持股但担心下跌
- **最大盈利**: 无限
- **最大亏损**: 买入价 - Strike + 权利金
- **适用场景**: 保护持仓，类似买保险

## ➡️ 中性策略 (Neutral)

### Iron Condor (铁鹰)

- **构建**:
  - 卖 OTM Put (中低)
  - 买 更OTM Put (低)
  - 卖 OTM Call (中高)
  - 买 更OTM Call (高)
- **观点**: 预期盘整
- **最大盈利**: 净权利金收入
- **最大亏损**: 翼宽 - 净权利金
- **盈亏平衡**: 卖Put Strike - 净权利金 / 卖Call Strike + 净权利金
- **适用场景**: 高IV环境，预期价格在范围内震荡

### Iron Butterfly (铁蝶式)

- **构建**:
  - 买 OTM Put
  - 卖 ATM Put
  - 卖 ATM Call
  - 买 OTM Call
- **观点**: 预期价格不动
- **最大盈利**: 净权利金收入
- **最大亏损**: 翼宽 - 净权利金
- **适用场景**: 高IV，极度看盘整

### Short Strangle (卖出宽跨式)

- **构建**: 卖 OTM Call + 卖 OTM Put
- **观点**: 预期盘整
- **最大盈利**: 权利金收入
- **最大亏损**: 无限 ⚠️
- **适用场景**: 高IV，高风险承受能力

### Calendar Spread (日历价差)

- **构建**: 卖近月期权 + 买远月期权 (同Strike)
- **观点**: 短期盘整，长期可能波动
- **最大盈利**: 复杂（取决于IV变化）
- **最大亏损**: 净权利金支出
- **适用场景**: 预期短期IV下降后上升

## 🎢 波动率策略 (Volatility)

### Long Straddle (买入跨式)

- **构建**: 买 ATM Call + 买 ATM Put
- **观点**: 预期大幅波动（方向不确定）
- **最大盈利**: 无限
- **最大亏损**: 权利金支出
- **盈亏平衡**: Strike ± 总权利金
- **适用场景**: 财报前、重大事件前，低IV环境

### Long Strangle (买入宽跨式)

- **构建**: 买 OTM Call + 买 OTM Put
- **观点**: 预期大幅波动
- **最大盈利**: 无限
- **最大亏损**: 权利金支出
- **盈亏平衡**: Call Strike + 权利金 / Put Strike - 权利金
- **适用场景**: 比Straddle便宜，但需要更大波动

## 🦋 Butterfly 策略

### Long Call Butterfly

- **构建**: 买1低Strike Call + 卖2中Strike Call + 买1高Strike Call
- **观点**: 预期价格在中间Strike附近
- **最大盈利**: 中Strike - 低Strike - 净权利金
- **最大亏损**: 净权利金支出
- **适用场景**: 低成本赌价格不动

### Long Put Butterfly

- **构建**: 买1高Strike Put + 卖2中Strike Put + 买1低Strike Put
- **观点**: 预期价格在中间Strike附近

## 📊 策略选择矩阵

| 市场观点     | 低IV (IV Rank < 30)    | 中IV             | 高IV (IV Rank > 70)     |
| ------------ | ---------------------- | ---------------- | ----------------------- |
| **强烈看涨** | Long Call              | Bull Call Spread | Bull Put Spread         |
| **温和看涨** | Bull Call Spread       | Covered Call     | Bull Put Spread         |
| **强烈看跌** | Long Put               | Bear Put Spread  | Bear Call Spread        |
| **温和看跌** | Bear Put Spread        | Protective Put   | Bear Call Spread        |
| **盘整**     | Calendar Spread        | Iron Butterfly   | Iron Condor             |
| **大波动**   | Long Straddle/Strangle | -                | Short Strangle (高风险) |

## ⚠️ 风险提示

1. **裸卖期权** (Short Call/Put 无保护) 风险无限，不建议新手使用
2. **时间衰减** (Theta) 对买方不利，对卖方有利
3. **IV Crush** 财报后IV大幅下降，买方可能亏损即使方向对了
4. **流动性** 选择活跃的标的和到期日
5. **交易成本** 多腿策略手续费较高

## 📚 进一步学习

- 了解 Greeks: [greeks_guide.md](greeks_guide.md)
- Tastytrade 策略视频
- Option Alpha 免费课程
