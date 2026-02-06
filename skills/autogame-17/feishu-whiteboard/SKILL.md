# Feishu Whiteboard Skill

Allows creating and manipulating Feishu Whiteboards programmatically.

## Configuration

Requires `FEISHU_APP_ID` and `FEISHU_APP_SECRET` in environment or `config.json`.
Scopes required: `board:whiteboard:node:create`

## Usage

### Create a Board

```bash
node skills/feishu-whiteboard/create.js "My Architecture Diagram"
```

Output: JSON containing `whiteboard_id`.

### Add Nodes (Demo)

```bash
node skills/feishu-whiteboard/draw.js <whiteboard_id> demo
```

Adds a rectangle and a circle connected by a line.

### Programmatic Usage

```javascript
const { createWhiteboard } = require('./create')
const { addNodes, createShape, createConnector } = require('./draw')

const board = await createWhiteboard('System Design')
const nodes = [
  createShape('web', 'rect', 0, 0, 200, 100, 'Web Server'),
  createShape('db', 'cylinder', 0, 300, 100, 100, 'Database'),
  createConnector('link1', 'web', 'db'),
]
await addNodes(board.whiteboard_id, nodes)
```

## Troubleshooting

If you encounter `404 page not found`, it usually means the Whiteboard API is not enabled for your tenant or the endpoint URL has changed. The current implementation uses `/open-apis/board/v1/whiteboards`.
