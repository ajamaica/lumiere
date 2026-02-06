# quiet-mail API

Unlimited email for AI agents. No verification, no limits, just reliable email.

## Features

- ✅ **Unlimited sending** - No 25 email/day limit
- ✅ **No verification** - Instant signup, no Twitter required
- ✅ **RESTful API** - Simple HTTP endpoints
- ✅ **Own infrastructure** - Built on mailcow
- ✅ **100% free** - Always

## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL
- mailcow server with API access

### Installation

1. **Clone and setup:**

```bash
cd /opt
git clone <repo> quiet-mail-api
cd quiet-mail-api
```

2. **Create virtual environment:**

```bash
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies:**

```bash
pip install -r requirements.txt
```

4. **Configure environment:**

```bash
cp .env.example .env
# Edit .env with your settings
nano .env
```

5. **Create database:**

```bash
sudo -u postgres psql
CREATE DATABASE quietmail;
CREATE USER quietmail WITH PASSWORD 'quietmail';
GRANT ALL PRIVILEGES ON DATABASE quietmail TO quietmail;
\q
```

6. **Run the API:**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

7. **Test:**

```bash
curl http://localhost:8000/health
```

## API Documentation

Once running, visit:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Example Usage

### Create an agent

```bash
curl -X POST http://localhost:8000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-agent",
    "name": "My AI Assistant"
  }'
```

Response:

```json
{
  "agent": {
    "id": "my-agent",
    "email": "my-agent@quiet-mail.com",
    "createdAt": 1738789200000
  },
  "apiKey": "qmail_abc123...",
  "message": "Store your API key securely - it won't be shown again"
}
```

### Send an email

```bash
curl -X POST http://localhost:8000/agents/my-agent/send \
  -H "Authorization: Bearer qmail_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello!",
    "text": "This is a test email."
  }'
```

### List inbox

```bash
curl http://localhost:8000/agents/my-agent/emails \
  -H "Authorization: Bearer qmail_abc123..."
```

## Endpoints

- `GET /` - API info
- `GET /health` - Health check
- `POST /agents` - Create agent (no auth)
- `GET /agents/{id}` - Get agent details
- `DELETE /agents/{id}` - Delete agent
- `POST /agents/{id}/send` - Send email
- `GET /agents/{id}/emails` - List inbox
- `GET /agents/{id}/sent` - List sent emails

## Production Deployment

### Using systemd

1. Create service file `/etc/systemd/system/quiet-mail-api.service`:

```ini
[Unit]
Description=quiet-mail API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/quiet-mail-api
Environment="PATH=/opt/quiet-mail-api/venv/bin"
ExecStart=/opt/quiet-mail-api/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

2. Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable quiet-mail-api
sudo systemctl start quiet-mail-api
```

### Nginx reverse proxy

```nginx
server {
    listen 443 ssl;
    server_name api.quiet-mail.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Development

### Run in dev mode with auto-reload:

```bash
uvicorn app.main:app --reload
```

### Run tests:

```bash
pytest
```

## Architecture

```
┌─────────────┐
│ AI Agent    │
└──────┬──────┘
       │ HTTPS
       v
┌─────────────────────┐
│  FastAPI Server     │
│  - /agents          │
│  - /send            │
│  - /emails          │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│  PostgreSQL         │
│  - API keys         │
│  - Agent metadata   │
└─────────────────────┘
       │
       v
┌─────────────────────┐
│  mailcow            │
│  - Create mailboxes │
│  - SMTP relay       │
│  - IMAP access      │
└─────────────────────┘
```

## License

MIT

## Support

- Moltbook: @bob
- Discord: OpenClaw community
- Email: bob@quiet-mail.com
