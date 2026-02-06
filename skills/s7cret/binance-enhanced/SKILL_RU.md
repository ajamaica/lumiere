# Binance Enhanced Skill

**Улучшенный навык для торговли на Binance с OpenClaw**  
_Версия 2.0 — создано с помощью параллельных агентов за 20 минут_

## 🚀 Особенности

### 🔧 Основные улучшения

1. **Полная тестовая инфраструктура** — mock-файлы, интеграционные тесты, проверка подключения
2. **Безопасность** — система лимитов, шифрование ключей, детальное логирование
3. **UX/UI** — парсер natural language команд, интерактивный диалог, Telegram-бот
4. **Мониторинг** — Telegram/email/webhook уведомления, веб-дашборд
5. **Производительность** — кэширование, асинхронные запросы, оптимизация
6. **Торговые стратегии** — DCA, grid-торговля, арбитраж, backtesting
7. **Документация** — шаблоны конфигурации, FAQ, гайды, лучшие практики

## 📁 Структура пакета

```
binance-enhanced/
├── SKILL.md                    # Этот файл
├── README.md                   # Основная документация
├── FAQ.md                      # Частые вопросы и решения
├── TROUBLESHOOTING.md         # Гайд по устранению неполадок
├── BEST_PRACTICES.md          # Лучшие практики безопасности
├── PROGRESS_REPORT.md         # Отчёт о создании
│
├── templates/                  # Шаблоны конфигурации
│   ├── .env.example           # Переменные окружения
│   └── config.yaml.example    # Профили риска
│
├── test/                      # Тестирование
│   ├── testnet.sh            # Проверка подключения к testnet
│   ├── test_integration.sh   # Интеграционные тесты
│   └── mocks/                # Mock-ответы API
│
├── security/                  # Безопасность
│   ├── limits.sh             # Система лимитов операций
│   ├── logger.sh             # Детальное логирование
│   ├── security_checks.sh    # Проверки безопасности
│   ├── keys_crypto.py        # Шифрование API-ключей
│   ├── checklist.md          # Security checklist
│   └── README.md
│
├── ux/                        # UX улучшения
│   ├── parser.py             # Парсер natural language команд
│   ├── interactive.py        # Интерактивный диалог
│   ├── telegram_bot_prototype.py # Прототип Telegram-бота
│   ├── autocomplete.py       # Автодополнение символов
│   ├── templates.py          # Шаблоны сообщений
│   ├── examples.md           # Примеры использования
│   └── README.md
│
├── monitoring/                # Мониторинг и алерты
│   ├── telegram.py           # Telegram-уведомления
│   ├── webhook.py            # Webhook-нотификации
│   ├── email.py              # Email-отчёты
│   ├── email_template.html   # HTML шаблон email
│   ├── config.example.yaml   # Конфигурация мониторинга
│   ├── engine/alerts.py      # Движок алертов
│   ├── reports/              # Автоматические отчёты
│   ├── dashboard/            # Веб-дашборд
│   ├── sample_data/          # Тестовые данные
│   ├── utils/                # Утилиты
│   └── README.md
│
├── performance/               # Производительность
│   ├── async_api.py          # Асинхронные запросы
│   ├── cache.py              # Кэширование цен и балансов
│   ├── jq_cache.py           # Кэш jq-скриптов
│   ├── benchmark.py          # Бенчмарки и метрики
│   └── README.md
│
├── strategies/                # Торговые стратегии
│   ├── dca.py                # Dollar-Cost Averaging
│   ├── grid.py               # Grid-торговля
│   ├── arbitrage.py          # Арбитраж между парами
│   ├── indicators/           # Технические индикаторы
│   ├── backtest/             # Система backtesting
│   ├── reports/              # Отчёты по стратегиям
│   ├── docs/                 # Документация по стратегиям
│   └── README.md
│
└── telegram-bot/             # Telegram-бот
    ├── bot.py               # Flask webhook-сервер
    ├── storage.py           # SQLite хранилище
    ├── utils.py             # Утилиты и форматирование
    └── README.md
```

## 🛠️ Быстрый старт

### 1. Установка зависимостей

```bash
# Основные зависимости
pip install requests python-dotenv pyyaml

# Для производительности (опционально)
pip install aiohttp orjson jq

# Для безопасности
pip install pycryptodome

# Для Telegram-бота
pip install flask python-telegram-bot openpyxl

# Для стратегий
pip install pandas numpy
```

### 2. Настройка конфигурации

```bash
# Скопируйте шаблоны
cp templates/.env.example .env
cp templates/config.yaml.example config.yaml
cp monitoring/config.example.yaml monitoring/config.yaml

# Отредактируйте файлы
nano .env  # Добавьте API ключи
nano config.yaml  # Настройте профиль риска
```

### 3. Проверка подключения

```bash
# Проверьте подключение к Binance Testnet
chmod +x test/testnet.sh
./test/testnet.sh

# Запустите интеграционные тесты
chmod +x test/test_integration.sh
./test/test_integration.sh
```

### 4. Запуск компонентов

```bash
# Запустите систему безопасности
source security/security_checks.sh
source security/limits.sh
source security/logger.sh

# Запустите Telegram-бота (в отдельном терминале)
cd telegram-bot
python3 bot.py

# Запустите мониторинг (в отдельном терминале)
cd monitoring/dashboard
FLASK_APP=app.py flask run --host=0.0.0.0 --port=8080
```

## 🔐 Безопасность

### Система лимитов

```bash
# Инициализация
source security/limits.sh
get_limits

# Проверка лимита перед операцией
check_and_consume_limit 100  # Сумма в USD
```

### Шифрование ключей

```bash
# Шифрование API ключей
export KEYS_CRYPTO_PW="ваш-пароль"
python3 security/keys_crypto.py encrypt --in plain_keys.txt --out keys.enc

# Дешифрование
python3 security/keys_crypto.py decrypt --in keys.enc --out plain_keys.txt
```

### Логирование транзакций

```bash
# Запись транзакции
source security/logger.sh
log_txn --type order --symbol BTCUSDT --side BUY --qty 0.001 --price 40000 --status submitted --user alice

# Просмотр логов
query_logs BTCUSDT
```

## 🤖 Использование

### Natural Language Commands

```python
from ux.parser import parse
from ux.interactive import DialogManager

# Парсинг команд
command = parse("купи 0.1 BTC по рынку")
print(command)
# {'side': 'BUY', 'quantity': 0.1, 'symbol': 'BTCUSDT', ...}

# Интерактивный диалог
dm = DialogManager()
state = dm.start("купить 0.5 ETH")
print(dm.next_prompt(state))  # Спросит недостающие параметры
```

### Telegram-бот

```bash
# Настройка переменных окружения
export BOT_TOKEN="ваш-telegram-токен"
export WEBHOOK_URL="https://ваш-домен.ком/webhook"

# Запуск бота
cd telegram-bot
python3 bot.py

# Регистрация webhook
curl -X POST http://localhost:5000/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{"name":"my-webhook","url":"https://example.com/hook","token":"secret"}'
```

### Торговые стратегии

```python
from strategies.dca import DCAStrategy
from strategies.grid import GridTrading
from strategies.backtest.framework import BacktestEngine

# DCA стратегия
dca = DCAStrategy(symbol="BTCUSDT", amount=100, interval_days=7)
dca.execute()

# Grid торговля
grid = GridTrading(symbol="ETHUSDT", lower=1800, upper=2200, grids=10)
grid.setup()

# Backtesting
engine = BacktestEngine(strategy=dca, data="data/BTCUSDT_1d.csv")
results = engine.run()
print(results.metrics)
```

## 📊 Мониторинг

### Уведомления

```python
from monitoring.telegram import TelegramNotifier
from monitoring.email import EmailSender
from monitoring.reports.daily import generate_daily_report

# Telegram уведомления
notifier = TelegramNotifier(config)
notifier.send_alert("BTC +5% за 10 минут", chat_id="ваш-chat-id")

# Email отчёты
html_report = generate_daily_report(portfolio_snapshot)
sender = EmailSender(config)
sender.send_html_report("you@example.com", "Ежедневный отчёт", html_report)
```

### Веб-дашборд

```bash
# Запуск дашборда
cd monitoring/dashboard
FLASK_APP=app.py flask run --host=0.0.0.0 --port=8080

# Доступ через браузер
# http://localhost:8080
```

## 🧪 Тестирование

### Unit тесты

```bash
# Запуск тестов
python3 -m pytest test/ -v

# Проверка mock-файлов
python3 -c "import json; json.load(open('test/mocks/ping.json'))"
```

### Интеграционные тесты

```bash
# С mock-данными
./test/test_integration.sh

# С реальным testnet
BINANCE_TESTNET_URL=https://testnet.binance.vision ./test/test_integration.sh
```

## 🔧 Производительность

### Кэширование

```python
from performance.cache import PriceCache, BalancesCache

# Кэш цен (TTL 7 секунд)
price_cache = PriceCache(ttl=7)
price = price_cache.get("BTCUSDT")
if price is None:
    price = fetch_price_from_api("BTCUSDT")
    price_cache.set("BTCUSDT", price)

# Кэш балансов
balances_cache = BalancesCache()
balances = balances_cache.get("account_123")
```

### Асинхронные запросы

```python
from performance.async_api import AsyncAPIClient
import asyncio

async def main():
    client = AsyncAPIClient(rate=10, per=1, concurrency=5)

    # Параллельные запросы
    paths = ["/api/v3/time", "/api/v3/ping", "/api/v3/ticker/price?symbol=BTCUSDT"]
    results = await client.parallel_get(paths)

    await client.close()

asyncio.run(main())
```

## 📈 Метрики и бенчмарки

```bash
# Запуск бенчмарков
cd performance
python3 benchmark.py

# Просмотр метрик
cat metrics.json | jq .
```

## 🚀 Развёртывание

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["python3", "telegram-bot/bot.py"]
```

### Systemd service

```ini
[Unit]
Description=Binance Enhanced Skill
After=network.target

[Service]
Type=simple
User=moltbot1
WorkingDirectory=/home/moltbot1/.openclaw/workspace/binance-enhanced
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
Environment="BOT_TOKEN=ваш-токен"
ExecStart=/usr/bin/python3 telegram-bot/bot.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## 🔄 Интеграция с OpenClaw

### Конфигурация OpenClaw

```json
{
  "agents": {
    "binance-enhanced": {
      "model": "openai/gpt-5-mini",
      "skills": ["binance-enhanced"],
      "env": {
        "BINANCE_API_KEY": "{{SECRETS.BINANCE_API_KEY}}",
        "BINANCE_SECRET": "{{SECRETS.BINANCE_SECRET}}",
        "TRADE_MODE": "paper"
      }
    }
  }
}
```

### Использование как навык

```bash
# Активация навыка
openclaw skill activate binance-enhanced

# Использование команд
openclaw binance buy 0.1 BTC market
openclaw binance portfolio
openclaw binance alerts status
```

## 📝 Лицензия

MIT License — свободное использование, модификация и распространение.

## 🤝 Вклад в развитие

1. Форкните репозиторий
2. Создайте ветку для вашей функции
3. Добавьте тесты
4. Отправьте pull request

## 🐛 Поддержка

- **Issues:** https://github.com/your-username/binance-enhanced/issues
- **Discord:** https://discord.gg/openclaw
- **Документация:** https://docs.openclaw.ai/skills/binance-enhanced

---

**Создано с помощью параллельных агентов OpenClaw за 20 минут**  
_Последнее обновление: 2026-02-01_
