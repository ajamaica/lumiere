---
name: threads
description: Взаимодействие с Threads API для публикации постов (текст, изображения), чтения постов и получения информации о профиле. Используйте, когда пользователю нужно работать с Threads через Graph API.
---

# Threads Skill

Этот навык позволяет публиковать контент в Threads, читать ленту своих постов и получать информацию о пользователе через Threads Graph API.

## Подготовка

Для работы навыка необходим **Threads Access Token**, полученный в [Facebook Developers](https://developers.facebook.com/) -> Tools -> Graph API Explorer.

Установите токен в переменную окружения:

```bash
export THREADS_ACCESS_TOKEN='ваш_токен'
```

## Использование

### 1. Получение информации о профиле

```bash
python3 scripts/threads_cli.py me
```

### 2. Публикация текстового поста

```bash
python3 scripts/threads_cli.py post "Привет из OpenClaw!"
```

### 3. Публикация карусели (несколько изображений)

```bash
python3 scripts/threads_cli.py post "Наша новая подборка проектов" --image "https://example.com/1.jpg" --image "https://example.com/2.jpg"
```

_(Максимум 10 изображений в одной публикации)_

### 4. Публикация с локальным файлом

```bash
python3 scripts/threads_cli.py post "Картинка с моего компьютера" --image "/путь/к/файлу.jpg"
```

_(Скрипт автоматически загрузит файл на временный хостинг для публикации)_

### 5. Список ваших постов

```bash
python3 scripts/threads_cli.py list
```

## Скрипты

- `scripts/threads_cli.py`: Основной CLI инструмент для работы с API.

## Особенности

- При публикации изображений URL должен быть публично доступным.
- Навык использует `graph.threads.net/v1.0`.
