# Интеграция GitHub с OpenClaw

## 🎯 Цель

Автоматическая синхронизация изменений из GitHub репозитория с навыками OpenClaw.

## 🔗 Варианты интеграции

### Вариант 1: GitHub Actions (рекомендуется)

#### Настройка в GitHub:

1. **Создайте репозиторий:**

```bash
cd binance-enhanced
git init
git add .
git commit -m "Initial commit: Binance Enhanced v2.0.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/binance-enhanced.git
git push -u origin main
```

2. **Добавьте Secrets в GitHub:**
   - Settings → Secrets and variables → Actions → New repository secret
   - Добавьте:
     - `OPENCLAW_API_KEY` - ваш API ключ OpenClaw
     - `OPENCLAW_INSTANCE` - URL вашего инстанса OpenClaw (опционально)

3. **Workflow автоматически запустится** при каждом push в main или создании релиза.

#### Что делает workflow:

- ✅ Проверяет код
- ✅ Создает архив навыка
- ✅ Загружает в OpenClaw через API
- ✅ Уведомляет об успехе/ошибке

### Вариант 2: Webhook Handler (авто-обновление)

#### Установка на сервер OpenClaw:

```bash
# Установите зависимости
pip install flask

# Настройте переменные окружения
export GITHUB_WEBHOOK_SECRET="ваш-секрет-из-github"
export OPENCLAW_PATH="/usr/local/bin/openclaw"
export OPENCLAW_SKILLS_DIR="/home/moltbot1/.openclaw/skills"

# Запустите webhook handler
python3 webhook-handler.py
```

#### Настройка в GitHub:

1. Settings → Webhooks → Add webhook
2. Payload URL: `https://ваш-сервер:3000/webhook/github`
3. Content type: `application/json`
4. Secret: `ваш-секрет-из-github`
5. Events: `Push events` и `Release events`

#### Что делает webhook handler:

- ✅ Автоматически обновляет навык при push в репозиторий
- ✅ Проверяет подпись GitHub
- ✅ Запускает install.sh при обновлении
- ✅ Перезагружает навык в OpenClaw

### Вариант 3: Ручная синхронизация

#### Скрипт для ручного обновления:

```bash
#!/bin/bash
# sync-skill.sh

SKILL_NAME="binance-enhanced"
REPO_URL="https://github.com/YOUR_USERNAME/binance-enhanced.git"
SKILLS_DIR="$HOME/.openclaw/skills"

cd "$SKILLS_DIR"

if [ -d "$SKILL_NAME" ]; then
    echo "📦 Updating existing skill..."
    cd "$SKILL_NAME"
    git pull origin main
else
    echo "📦 Cloning new skill..."
    git clone "$REPO_URL" "$SKILL_NAME"
    cd "$SKILL_NAME"
fi

# Запустите установку
if [ -f "install.sh" ]; then
    chmod +x install.sh
    ./install.sh
fi

# Перезагрузите навык в OpenClaw
openclaw skill reload "$SKILL_NAME"

echo "✅ Skill '$SKILL_NAME' synchronized successfully!"
```

## 🔧 Конфигурация OpenClaw

### Настройка API доступа:

```bash
# Создайте API ключ
openclaw api-key create --name github-actions --expires 365d

# Сохраните ключ в GitHub Secrets как OPENCLAW_API_KEY
```

### Настройка навыка для автоматического обновления:

```json
{
  "skills": {
    "binance-enhanced": {
      "path": "/home/moltbot1/.openclaw/skills/binance-enhanced",
      "autoUpdate": true,
      "updateSource": "github",
      "repository": "https://github.com/YOUR_USERNAME/binance-enhanced.git",
      "branch": "main"
    }
  }
}
```

## 🚀 Быстрый старт

### Шаг 1: Подготовка репозитория

```bash
# Клонируйте существующий навык
git clone https://github.com/YOUR_USERNAME/binance-enhanced.git
cd binance-enhanced

# Или создайте новый
mkdir my-skill && cd my-skill
# ... создайте файлы навыка ...
```

### Шаг 2: Добавьте файлы интеграции

```bash
# Скопируйте workflow файлы
cp .github/workflows/sync-to-openclaw.yml .github/workflows/
cp webhook-handler.py .
cp GITHUB_INTEGRATION.md .
```

### Шаг 3: Настройте package.json

```json
{
  "name": "your-skill-name",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/your-skill-name.git"
  }
}
```

### Шаг 4: Запустите интеграцию

```bash
git add .
git commit -m "Add GitHub integration"
git push origin main
```

## 📊 Мониторинг интеграции

### GitHub Actions статус:

- Зайдите в Actions → Sync to OpenClaw
- Просматривайте логи выполнения
- Настройте уведомления при ошибках

### Webhook доставка:

- GitHub → Settings → Webhooks → Recent deliveries
- Просматривайте payload и response
- Debug при ошибках доставки

### OpenClaw логи:

```bash
# Просмотр логов OpenClaw
journalctl -u openclaw -f

# Проверка статуса навыка
openclaw skill list
openclaw skill status binance-enhanced
```

## 🐛 Устранение неполадок

### Ошибка: Invalid API key

```
❌ Authentication failed: Invalid API key
```

**Решение:**

1. Проверьте OPENCLAW_API_KEY в GitHub Secrets
2. Убедитесь, что ключ не истёк
3. Пересоздайте ключ: `openclaw api-key create`

### Ошибка: Permission denied

```
❌ Permission denied: cannot write to skills directory
```

**Решение:**

```bash
# Установите правильные права
sudo chown -R $USER:$USER ~/.openclaw/skills
chmod 755 ~/.openclaw/skills
```

### Ошибка: Webhook delivery failed

```
❌ Webhook delivery failed: 401 Unauthorized
```

**Решение:**

1. Проверьте GITHUB_WEBHOOK_SECRET
2. Убедитесь, что secret совпадает в GitHub и на сервере
3. Проверьте URL webhook

### Ошибка: Skill not found

```
❌ Skill 'binance-enhanced' not found
```

**Решение:**

```bash
# Создайте навык вручную
openclaw skill create binance-enhanced --path /path/to/skill
```

## 🔄 Автоматическое обновление зависимостей

### Обновление Python зависимостей:

```yaml
# .github/workflows/update-deps.yml
name: Update Dependencies
on:
  schedule:
    - cron: '0 0 * * 0' # Каждое воскресенье в полночь
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update Python dependencies
        run: |
          pip install pip-tools
          pip-compile --upgrade requirements.in
          pip-sync requirements.txt
      - name: Commit and push updates
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add requirements*.txt
          git commit -m "Update dependencies"
          git push
```

### Обновление навыка при изменении зависимостей:

```yaml
# Триггер при изменении requirements.txt
on:
  push:
    paths:
      - 'requirements.txt'
      - 'package.json'
```

## 🛡️ Безопасность

### Best practices:

1. **Используйте Secrets** для API ключей
2. **Ограничьте права** API ключей
3. **Верифицируйте webhooks** через подпись
4. **Используйте HTTPS** для webhook URL
5. **Регулярно обновляйте** зависимости

### Настройка ограниченного API ключа:

```bash
# Создайте ключ только для загрузки навыков
openclaw api-key create \
  --name github-actions \
  --permissions skill:upload,skill:reload \
  --expires 90d
```

## 📈 Расширенные сценарии

### Мульти-окружение:

```yaml
# Разные инстансы для dev/staging/prod
jobs:
  deploy:
    strategy:
      matrix:
        environment: [dev, staging, prod]
    steps:
      - name: Deploy to ${{ matrix.environment }}
        env:
          OPENCLAW_INSTANCE: ${{ secrets[format('OPENCLAW_{0}_INSTANCE', matrix.environment)] }}
          OPENCLAW_API_KEY: ${{ secrets[format('OPENCLAW_{0}_API_KEY', matrix.environment)] }}
```

### Канареечные развертывания:

```yaml
# Постепенное развертывание
deploy-canary:
  if: github.ref == 'refs/heads/canary'
  steps:
    - name: Deploy to canary
      run: openclaw skill upload --instance canary.openclaw.ai
```

### A/B тестирование:

```yaml
# Разные версии для разных пользователей
deploy-ab-test:
  steps:
    - name: Deploy version A (50%)
      if: github.ref == 'refs/heads/version-a'
      run: openclaw skill upload --tags version-a --percentage 50

    - name: Deploy version B (50%)
      if: github.ref == 'refs/heads/version-b'
      run: openclaw skill upload --tags version-b --percentage 50
```

## 🤝 Поддержка

### Полезные ссылки:

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [OpenClaw API Reference](https://docs.openclaw.ai/api)
- [Flask Webhook Example](https://flask.palletsprojects.com/)

### Сообщество:

- OpenClaw Discord: #github-integration channel
- GitHub Discussions: для вопросов по интеграции
- Issues: для багов и feature requests

---

**🚀 Готово к интеграции!** Настройте один из вариантов и наслаждайтесь автоматической синхронизацией между GitHub и OpenClaw.
