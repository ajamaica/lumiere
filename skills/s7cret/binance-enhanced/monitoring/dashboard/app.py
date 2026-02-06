"""Minimal Flask prototype dashboard for monitoring

Run (dev):
  pip install flask
  FLASK_APP=app.py flask run --host=0.0.0.0 --port=8080
"""
from flask import Flask, render_template_string, jsonify, request
import json
from pathlib import Path

app = Flask(__name__)

TEMPLATE = '''
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Monitoring Dashboard (Prototype)</title>
    <style>body{font-family:Arial;padding:12px} .card{border:1px solid #eee;padding:12px;margin-bottom:8px}</style>
  </head>
  <body>
    <h1>Binance Monitoring Dashboard</h1>
    <div class="card">
      <h2>Alerts</h2>
      <pre id="alerts">Loading...</pre>
    </div>
    <div class="card">
      <h2>Portfolio</h2>
      <pre id="portfolio">Loading...</pre>
    </div>
    <script>
      async function load(){
        let a = await fetch('/api/alerts');
        let alerts = await a.json();
        document.getElementById('alerts').innerText = JSON.stringify(alerts, null, 2);
        let p = await fetch('/api/portfolio');
        let portfolio = await p.json();
        document.getElementById('portfolio').innerText = JSON.stringify(portfolio, null, 2);
      }
      load();
      setInterval(load, 15000);
    </script>
  </body>
</html>
'''

# sample data files
DATA_DIR = Path(__file__).parents[1]
ALERTS_FILE = DATA_DIR / 'sample_alerts.json'
PORT_FILE = DATA_DIR / 'sample_portfolio.json'

@app.route('/')
def index():
    return render_template_string(TEMPLATE)

@app.route('/api/alerts')
def api_alerts():
    try:
        data = json.loads(ALERTS_FILE.read_text())
    except Exception:
        data = []
    return jsonify(data)

@app.route('/api/portfolio')
def api_portfolio():
    try:
        data = json.loads(PORT_FILE.read_text())
    except Exception:
        data = {}
    return jsonify(data)

@app.route('/api/push', methods=['POST'])
def api_push():
    # accept webhook-like pushes to append to alerts
    body = request.get_json() or {}
    try:
        arr = json.loads(ALERTS_FILE.read_text())
    except Exception:
        arr = []
    arr.insert(0, body)
    ALERTS_FILE.write_text(json.dumps(arr[:100], indent=2))
    return jsonify({'ok': True})
