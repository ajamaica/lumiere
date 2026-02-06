Monitoring and Alerting — Binance Skill

This folder contains a prototype monitoring & alerting system for the Binance skill. It provides:

- Telegram notifier (telegram.py)
- Webhook push notifier (webhook.py)
- Email report sender + HTML template (email.py + email_template.html)
- Alerting engine skeleton (engine/alerts.py)
- Report generators (reports/daily.py, reports/weekly.py)
- Web dashboard prototype (dashboard/)
- Example configuration (config.example.yaml)
- Sample portfolio data (sample_data/portfolio_sample.json)

Design notes

- All modules are intentionally small, dependency-light and self-contained. They expect a data source (portfolio, prices) to be provided by the main skill.
- No persistent daemons or cron jobs are created by this prototype. Use your orchestrator or cron to run report scripts.
- Secrets (API keys, tokens, SMTP passwords) should be stored securely — this repo contains only an example config.

How to run (development)

1. Create a virtualenv and install dependencies (Flask, requests)
   python3 -m venv venv
   source venv/bin/activate
   pip install flask requests pyyaml

2. Copy config.example.yaml -> config.yaml and fill tokens/credentials.

3. Start the dashboard (development):
   cd shared/monitoring/dashboard
   FLASK_APP=app.py FLASK_ENV=development flask run --host=0.0.0.0 --port=8080

4. Use the notifier modules from your skill code. See docstrings in each file for usage examples.

Placement

- All files are under shared/monitoring/ as requested. If you want the alert engine integrated into the skill runtime, import engine/alerts.py and call check\_\* functions with live data.

Contact

- This prototype was created by the monitoring sub-agent. For changes, update files in this folder.
