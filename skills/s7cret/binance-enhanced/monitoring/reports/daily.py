"""Daily portfolio report generator (prototype)

Usage:
    from reports.daily import generate_daily_report
    html = generate_daily_report(portfolio_snapshot)
"""
import datetime
from pathlib import Path

TEMPLATE = Path(__file__).parents[2] / 'email_template.html'


def render_template(data):
    # very small templating: replace {{key}} and iterate holdings
    with open(TEMPLATE, 'r') as f:
        t = f.read()
    t = t.replace('{{date}}', data.get('date', ''))
    t = t.replace('{{total_balance}}', str(data.get('total_balance', '')))
    t = t.replace('{{pnl}}', str(data.get('pnl', '')))
    holdings_html = ''
    for h in data.get('holdings', []):
        holdings_html += f"<tr><td class=\"ticker\">{h.get('ticker')}</td><td>{h.get('amount')}</td><td>{h.get('value')}</td><td>{h.get('change')}</td></tr>\n"
    t = t.replace('{{#each holdings}}\n        <tr>\n          <td class=\"ticker\">{{ticker}}</td>\n          <td>{{amount}}</td>\n          <td>{{value}}</td>\n          <td>{{change}}</td>\n        </tr>\n        {{/each}}', holdings_html)
    return t


def generate_daily_report(snapshot):
    data = {
        'date': datetime.datetime.utcnow().isoformat() + 'Z',
        'total_balance': snapshot.get('total_balance'),
        'pnl': snapshot.get('pnl_day'),
        'holdings': snapshot.get('holdings', [])
    }
    return render_template(data)
