# WEEEK Public API (извлечённые данные)

База: `https://api.weeek.net/public/v1`

## Задачи (Task Manager)

### Список задач

`GET /tm/tasks`
Параметры: `day`, `userId`, `projectId`, `completed`, `boardId`, `boardColumnId`, `type`, `priority`, `tags[]`, `search`, `perPage`, `offset`, `sortBy` (`name|type|priority|duration|overdue|created|date|start`, для desc — с `-`), `startDate`, `endDate` (оба в формате `dd.mm.yyyy` и обязательны вместе), `all`.

Ответ 200: `{ success: boolean, tasks: object[], hasMore: boolean }`

### Создать задачу

`POST /tm/tasks`
Тело: `locations` (object[] **required** в docs), `title`, `description`, `day`, `parentId`, `userId`, `type` (action|meet|call), `priority` (0..3), `customFields` (map id → value).

Пример `locations`: `{ "projectId": 5, "boardId": 19, "boardColumnId": 58 }`

На практике у пользователя есть задачи без `locations`. В скрипте это поддержано через `--no-locations` (передаётся пустой массив).

### Обновить задачу

`PUT /tm/tasks/{id}`
Тело: `title`, `priority`, `type`, `startDate`, `dueDate`, `startDateTime`, `dueDateTime`, `duration`, `tags`, `customFields`.

### Завершить / возобновить

`POST /tm/tasks/{id}/complete`
`POST /tm/tasks/{id}/uncomplete`

### Перемещение

`POST /tm/tasks/{id}/board` (body: `boardId`)
`POST /tm/tasks/{id}/board-column` (body: `boardColumnId`)

## Доски

### Список досок

`GET /tm/boards` (query: `projectId`)

## Колонки досок

### Список колонок

`GET /tm/board-columns` (query: `boardId`)
