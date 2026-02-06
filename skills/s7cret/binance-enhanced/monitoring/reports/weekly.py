"""Weekly PnL summary generator (prototype)

Usage:
    from reports.weekly import generate_weekly_summary
    html = generate_weekly_summary(weekly_stats)
"""
import datetime
from pathlib import Path

TEMPLATE = Path(__file__).parents[2] / 'email_template.html'


def generate_weekly_summary(stats):
    data = {
        'date': datetime.datetime.utcnow().isoformat() + 'Z',
        'total_balance': stats.get('balance_end'),
        'pnl': stats.get('pnl_week'),
        'holdings': stats.get('holdings', [])
    }
    # reuse same tiny renderer
    with open(TEMPLATE, 'r') as f:
        t = f.read()
    t = t.replace('{{date}}', data['date'])
    t = t.replace('{{total_balance}}', str(data['total_balance']))
    t = t.replace('{{pnl}}', str(data['pnl']))
    holdings_html = ''
    for h in data.get('holdings', []):
        holdings_html += f"<tr><td class=\"ticker\">{h.get('ticker')}</td><td>{h.get('amount')}</td><td>{h.get('value')}</td><td>{h.get('change')}</td></tr>\n"
    t = t.replace('{{#each holdings}}\n        <tr>\n          <td class=\"ticker\">{{ticker}}</td>\n          <td>{{amount}}</td>\n          <td>{{value}}</td>\n          <td>{{change}}</td>\n        </tr>\n        {{/each}}', holdings_html)
    return t
