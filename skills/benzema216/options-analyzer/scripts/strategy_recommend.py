#!/usr/bin/env python3
"""
期权策略推荐器 - 根据市场观点和 IV 环境推荐最优策略
用法: python strategy_recommend.py SYMBOL --outlook bullish --risk moderate
"""

import argparse
import json
import sys
from typing import List, Dict

import yfinance as yf

# 导入 IV 分析
from iv_analysis import analyze_iv


# 策略库
STRATEGIES = {
    # 看涨策略
    'long_call': {
        'outlook': 'bullish',
        'iv_pref': 'low',
        'risk': 'moderate',
        'desc': '买入看涨期权',
        'max_loss': '权利金',
        'max_profit': '无限',
        'best_when': '强烈看涨，低IV环境'
    },
    'bull_call_spread': {
        'outlook': 'bullish',
        'iv_pref': 'neutral',
        'risk': 'moderate',
        'desc': '牛市看涨价差 (买低Call，卖高Call)',
        'max_loss': '净权利金支出',
        'max_profit': '行权价差 - 净权利金',
        'best_when': '温和看涨，限制成本'
    },
    'bull_put_spread': {
        'outlook': 'bullish',
        'iv_pref': 'high',
        'risk': 'moderate',
        'desc': '牛市看跌价差 (卖高Put，买低Put)',
        'max_loss': '行权价差 - 净权利金收入',
        'max_profit': '净权利金收入',
        'best_when': '温和看涨，高IV环境'
    },
    'covered_call': {
        'outlook': 'bullish',
        'iv_pref': 'high',
        'risk': 'conservative',
        'desc': '备兑看涨 (持有股票 + 卖Call)',
        'max_loss': '股票下跌 - 权利金',
        'max_profit': '行权价 - 买入价 + 权利金',
        'best_when': '持有股票，温和看涨'
    },
    
    # 看跌策略
    'long_put': {
        'outlook': 'bearish',
        'iv_pref': 'low',
        'risk': 'moderate',
        'desc': '买入看跌期权',
        'max_loss': '权利金',
        'max_profit': '行权价 - 权利金',
        'best_when': '强烈看跌，低IV环境'
    },
    'bear_put_spread': {
        'outlook': 'bearish',
        'iv_pref': 'neutral',
        'risk': 'moderate',
        'desc': '熊市看跌价差 (买高Put，卖低Put)',
        'max_loss': '净权利金支出',
        'max_profit': '行权价差 - 净权利金',
        'best_when': '温和看跌，限制成本'
    },
    'bear_call_spread': {
        'outlook': 'bearish',
        'iv_pref': 'high',
        'risk': 'moderate',
        'desc': '熊市看涨价差 (卖低Call，买高Call)',
        'max_loss': '行权价差 - 净权利金收入',
        'max_profit': '净权利金收入',
        'best_when': '温和看跌，高IV环境'
    },
    'protective_put': {
        'outlook': 'bearish',
        'iv_pref': 'low',
        'risk': 'conservative',
        'desc': '保护性看跌 (持有股票 + 买Put)',
        'max_loss': '股票买入价 - Put行权价 + 权利金',
        'max_profit': '无限',
        'best_when': '持有股票，担心下跌'
    },
    
    # 中性策略
    'iron_condor': {
        'outlook': 'neutral',
        'iv_pref': 'high',
        'risk': 'moderate',
        'desc': '铁鹰策略 (卖出宽跨式 + 买入更宽跨式保护)',
        'max_loss': '翼宽 - 净权利金收入',
        'max_profit': '净权利金收入',
        'best_when': '盘整预期，高IV环境'
    },
    'iron_butterfly': {
        'outlook': 'neutral',
        'iv_pref': 'high',
        'risk': 'moderate',
        'desc': '铁蝶式 (ATM卖跨式 + OTM买跨式保护)',
        'max_loss': '翼宽 - 净权利金收入',
        'max_profit': '净权利金收入',
        'best_when': '预期价格不动，高IV环境'
    },
    'short_strangle': {
        'outlook': 'neutral',
        'iv_pref': 'high',
        'risk': 'aggressive',
        'desc': '卖出宽跨式 (卖OTM Call + 卖OTM Put)',
        'max_loss': '无限',
        'max_profit': '权利金收入',
        'best_when': '盘整预期，高IV，高风险承受'
    },
    'calendar_spread': {
        'outlook': 'neutral',
        'iv_pref': 'low',
        'risk': 'moderate',
        'desc': '日历价差 (卖近月 + 买远月)',
        'max_loss': '净权利金支出',
        'max_profit': '不确定',
        'best_when': '预期短期盘整，IV上升'
    },
    
    # 波动率策略
    'long_straddle': {
        'outlook': 'volatile',
        'iv_pref': 'low',
        'risk': 'aggressive',
        'desc': '买入跨式 (买ATM Call + 买ATM Put)',
        'max_loss': '权利金支出',
        'max_profit': '无限',
        'best_when': '预期大幅波动，低IV环境'
    },
    'long_strangle': {
        'outlook': 'volatile',
        'iv_pref': 'low',
        'risk': 'moderate',
        'desc': '买入宽跨式 (买OTM Call + 买OTM Put)',
        'max_loss': '权利金支出',
        'max_profit': '无限',
        'best_when': '预期大幅波动，成本敏感'
    },
}

RISK_LEVELS = ['conservative', 'moderate', 'aggressive']
OUTLOOKS = ['bullish', 'bearish', 'neutral', 'volatile']


def get_iv_environment(iv_data: dict) -> str:
    """判断 IV 环境"""
    iv_rank = iv_data.get('iv_rank')
    if iv_rank is None:
        return 'neutral'
    if iv_rank >= 60:
        return 'high'
    elif iv_rank <= 40:
        return 'low'
    return 'neutral'


def match_strategy(outlook: str, iv_env: str, risk: str) -> List[Dict]:
    """匹配策略"""
    matches = []
    
    for name, strategy in STRATEGIES.items():
        score = 0
        reasons = []
        
        # 方向匹配 (最重要)
        if strategy['outlook'] == outlook:
            score += 50
            reasons.append(f"✅ 方向匹配 ({outlook})")
        elif strategy['outlook'] == 'neutral' and outlook in ['bullish', 'bearish']:
            score += 10
            reasons.append("⚠️ 中性策略也可考虑")
        else:
            continue  # 方向不对就跳过
        
        # IV 匹配
        if strategy['iv_pref'] == iv_env:
            score += 30
            reasons.append(f"✅ IV环境匹配 ({iv_env})")
        elif strategy['iv_pref'] == 'neutral':
            score += 15
            reasons.append("➖ IV中性")
        elif (strategy['iv_pref'] == 'high' and iv_env == 'low') or \
             (strategy['iv_pref'] == 'low' and iv_env == 'high'):
            score -= 20
            reasons.append(f"⚠️ IV不匹配 (策略偏好{strategy['iv_pref']}, 当前{iv_env})")
        
        # 风险匹配
        risk_idx = RISK_LEVELS.index(risk)
        strat_risk_idx = RISK_LEVELS.index(strategy['risk'])
        risk_diff = abs(risk_idx - strat_risk_idx)
        
        if risk_diff == 0:
            score += 20
            reasons.append(f"✅ 风险偏好匹配 ({risk})")
        elif risk_diff == 1:
            score += 10
            reasons.append(f"➖ 风险偏好接近")
        else:
            score -= 10
            reasons.append(f"⚠️ 风险偏好不匹配 (策略{strategy['risk']}, 你{risk})")
        
        matches.append({
            'name': name,
            'score': score,
            'reasons': reasons,
            **strategy
        })
    
    # 按分数排序
    matches.sort(key=lambda x: x['score'], reverse=True)
    return matches[:5]  # 返回前5个


def recommend_strategies(symbol: str, outlook: str, risk: str) -> dict:
    """推荐策略"""
    # 获取 IV 数据
    try:
        iv_data = analyze_iv(symbol)
    except Exception as e:
        iv_data = {'iv_rank': None, 'atm_iv': None}
    
    iv_env = get_iv_environment(iv_data)
    
    # 匹配策略
    recommendations = match_strategy(outlook, iv_env, risk)
    
    return {
        'symbol': symbol,
        'spot': iv_data.get('spot'),
        'outlook': outlook,
        'risk_tolerance': risk,
        'iv_environment': iv_env,
        'iv_rank': iv_data.get('iv_rank'),
        'atm_iv': iv_data.get('atm_iv'),
        'recommendations': recommendations
    }


def format_markdown(result: dict) -> str:
    """格式化为 Markdown"""
    lines = []
    lines.append(f"# {result['symbol']} 策略推荐")
    
    if result['spot']:
        lines.append(f"\n**当前价格**: ${result['spot']}")
    
    lines.append(f"\n## 📋 你的偏好")
    outlook_emoji = {'bullish': '📈', 'bearish': '📉', 'neutral': '➡️', 'volatile': '🎢'}
    lines.append(f"- **市场观点**: {outlook_emoji.get(result['outlook'], '')} {result['outlook']}")
    lines.append(f"- **风险偏好**: {result['risk_tolerance']}")
    
    lines.append(f"\n## 📊 当前 IV 环境")
    iv_emoji = {'high': '🔴', 'low': '🟢', 'neutral': '🟡'}
    lines.append(f"- **IV 环境**: {iv_emoji.get(result['iv_environment'], '')} {result['iv_environment'].upper()}")
    if result['iv_rank']:
        lines.append(f"- **IV Rank**: {result['iv_rank']:.1f}%")
    if result['atm_iv']:
        lines.append(f"- **ATM IV**: {result['atm_iv']:.1f}%")
    
    lines.append(f"\n## 💡 推荐策略")
    
    for i, rec in enumerate(result['recommendations'], 1):
        medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i-1]
        lines.append(f"\n### {medal} {rec['name'].replace('_', ' ').title()}")
        lines.append(f"**{rec['desc']}**")
        lines.append(f"\n匹配度: {rec['score']}分")
        for reason in rec['reasons']:
            lines.append(f"- {reason}")
        lines.append(f"\n- **最大盈利**: {rec['max_profit']}")
        lines.append(f"- **最大亏损**: {rec['max_loss']}")
        lines.append(f"- **最佳场景**: {rec['best_when']}")
    
    # 策略使用提示
    if result['recommendations']:
        top = result['recommendations'][0]
        lines.append(f"\n---")
        lines.append(f"\n## 🚀 快速开始")
        lines.append(f"\n使用策略分析器查看详细盈亏:")
        lines.append(f"```bash")
        lines.append(f"python scripts/strategy_analyzer.py --strategy {top['name']} --spot {result['spot'] or 100} --legs \"...\" --dte 30")
        lines.append(f"```")
    
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='期权策略推荐器')
    parser.add_argument('symbol', help='股票代码')
    parser.add_argument('--outlook', '-o', required=True, choices=OUTLOOKS,
                        help='市场观点: bullish(看涨), bearish(看跌), neutral(中性), volatile(波动)')
    parser.add_argument('--risk', '-r', default='moderate', choices=RISK_LEVELS,
                        help='风险偏好: conservative(保守), moderate(中等), aggressive(激进)')
    parser.add_argument('--format', '-f', choices=['json', 'md'], default='md', help='输出格式')
    
    args = parser.parse_args()
    
    try:
        result = recommend_strategies(args.symbol.upper(), args.outlook, args.risk)
        
        if args.format == 'json':
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(format_markdown(result))
            
    except Exception as e:
        print(f"❌ 错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
