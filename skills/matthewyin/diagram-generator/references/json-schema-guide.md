# JSON Schema Guide

Complete schema for diagram specification passed to `mcp-diagram-generator` MCP server.

## Root Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["format", "elements"],
  "properties": {
    "format": {
      "type": "string",
      "enum": ["drawio", "mermaid", "excalidraw"],
      "description": "Target diagram format"
    },
    "title": {
      "type": "string",
      "description": "Diagram title (used as page name in drawio, or header in other formats)"
    },
    "elements": {
      "type": "array",
      "items": { "$ref": "#/definitions/element" },
      "description": "All diagram elements (containers, nodes, edges)"
    }
  },
  "definitions": {
    "element": {
      "oneOf": [
        { "$ref": "#/definitions/container" },
        { "$ref": "#/definitions/node" },
        { "$ref": "#/definitions/edge" }
      ]
    },
    "container": {
      "type": "object",
      "required": ["id", "type", "name"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-zA-Z0-9_-]+$" },
        "type": { "const": "container" },
        "name": { "type": "string" },
        "level": {
          "type": "string",
          "enum": ["environment", "datacenter", "zone", "other"],
          "description": "Hierarchy level (for network topology)"
        },
        "style": { "$ref": "#/definitions/style" },
        "geometry": { "$ref": "#/definitions/geometry" },
        "children": {
          "type": "array",
          "items": { "$ref": "#/definitions/element" }
        }
      }
    },
    "node": {
      "type": "object",
      "required": ["id", "type", "name"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-zA-Z0-9_-]+$" },
        "type": { "const": "node" },
        "name": { "type": "string" },
        "deviceType": {
          "type": "string",
          "enum": ["router", "switch", "firewall", "server", "pc", "database", "cloud", "other"],
          "description": "Device type (for network topology styling)"
        },
        "shape": {
          "type": "string",
          "enum": [
            "rect",
            "ellipse",
            "diamond",
            "parallelogram",
            "rounded",
            "cylinder",
            "cloud",
            "other"
          ],
          "description": "Node shape (for flowcharts)"
        },
        "style": { "$ref": "#/definitions/style" },
        "geometry": { "$ref": "#/definitions/geometry" }
      }
    },
    "edge": {
      "type": "object",
      "required": ["type", "source", "target"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-zA-Z0-9_-]+$" },
        "type": { "const": "edge" },
        "source": { "type": "string", "description": "Source node ID" },
        "target": { "type": "string", "description": "Target node ID" },
        "label": { "type": "string", "description": "Edge label" },
        "style": { "$ref": "#/definitions/edgeStyle" }
      }
    },
    "style": {
      "type": "object",
      "properties": {
        "fillColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "strokeColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "strokeWidth": { "type": "number", "minimum": 0 },
        "fontColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "fontSize": { "type": "number", "minimum": 6 },
        "fontStyle": { "type": "string", "enum": ["normal", "bold", "italic"] },
        "borderRadius": { "type": "number", "minimum": 0 },
        "dashPattern": { "type": "string", "description": "e.g., '5,5' for dashed line" }
      }
    },
    "edgeStyle": {
      "type": "object",
      "properties": {
        "strokeColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "strokeWidth": { "type": "number", "minimum": 0 },
        "endArrow": { "type": "string", "enum": ["none", "arrow", "circle", "diamond"] },
        "startArrow": { "type": "string", "enum": ["none", "arrow", "circle", "diamond"] },
        "dashPattern": { "type": "string", "description": "e.g., '5,5' for dashed line" },
        "lineStyle": { "type": "string", "enum": ["straight", "orthogonal", "curved"] }
      }
    },
    "geometry": {
      "type": "object",
      "required": ["x", "y"],
      "properties": {
        "x": { "type": "number" },
        "y": { "type": "number" },
        "width": { "type": "number", "minimum": 10 },
        "height": { "type": "number", "minimum": 10 }
      }
    }
  }
}
```

## Common Element Types

### Container (for nested structures)

Used for environments, datacenters, zones, or any grouping.

```json
{
  "id": "env-1",
  "type": "container",
  "name": "省中心管理端",
  "level": "environment",
  "style": {
    "fillColor": "#e1d5e7",
    "strokeColor": "#9673a6",
    "fontSize": 14,
    "fontStyle": "bold"
  },
  "geometry": {
    "x": 220,
    "y": 750,
    "width": 520,
    "height": 450
  },
  "children": [...]
}
```

### Node (individual elements)

Used for devices, components, steps, etc.

```json
{
  "id": "device-1",
  "type": "node",
  "name": "路由器1",
  "deviceType": "router",
  "style": {
    "fillColor": "none",
    "strokeColor": "#607D8B",
    "strokeWidth": 2,
    "fontColor": "#455A64",
    "fontSize": 12,
    "fontStyle": "bold"
  },
  "geometry": {
    "x": 8,
    "y": 25,
    "width": 55,
    "height": 25
  }
}
```

### Edge (connections)

Used to connect nodes.

```json
{
  "id": "edge-1",
  "type": "edge",
  "source": "device-1",
  "target": "device-2",
  "label": "专线连接",
  "style": {
    "strokeColor": "#FF3333",
    "strokeWidth": 2,
    "endArrow": "arrow",
    "lineStyle": "straight"
  }
}
```

## Network Topology Example

```json
{
  "format": "drawio",
  "title": "新架构",
  "elements": [
    {
      "id": "env-1",
      "type": "container",
      "name": "省中心管理端",
      "level": "environment",
      "style": {
        "fillColor": "#e1d5e7",
        "strokeColor": "#9673a6",
        "fontSize": 14,
        "fontStyle": "bold"
      },
      "geometry": { "x": 220, "y": 750, "width": 520, "height": 450 },
      "children": [
        {
          "id": "dc-1",
          "type": "container",
          "name": "省中心机房",
          "level": "datacenter",
          "style": {
            "fillColor": "#d5e8d4",
            "strokeColor": "#82b366",
            "fontSize": 12,
            "fontStyle": "bold"
          },
          "geometry": { "x": 15, "y": 30, "width": 485, "height": 400 },
          "children": [
            {
              "id": "zone-1",
              "type": "container",
              "name": "上联区",
              "level": "zone",
              "style": {
                "fillColor": "#fff2cc",
                "strokeColor": "#d6b656",
                "fontSize": 10,
                "fontStyle": "bold"
              },
              "geometry": { "x": 93.5, "y": 40, "width": 145, "height": 70 },
              "children": [
                {
                  "id": "router-1",
                  "type": "node",
                  "name": "路由器1",
                  "deviceType": "router",
                  "style": {
                    "fillColor": "none",
                    "strokeColor": "#607D8B",
                    "strokeWidth": 2
                  },
                  "geometry": { "x": 8, "y": 25, "width": 55, "height": 25 }
                },
                {
                  "id": "router-2",
                  "type": "node",
                  "name": "路由器2",
                  "deviceType": "router",
                  "style": {
                    "fillColor": "none",
                    "strokeColor": "#607D8B",
                    "strokeWidth": 2
                  },
                  "geometry": { "x": 68, "y": 25, "width": 55, "height": 25 }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "edge-1",
      "type": "edge",
      "source": "router-1",
      "target": "router-2",
      "style": {
        "strokeColor": "#333333",
        "endArrow": "none"
      }
    }
  ]
}
```

## Flowchart Example (Mermaid)

```json
{
  "format": "mermaid",
  "title": "用户登录流程",
  "elements": [
    {
      "id": "start",
      "type": "node",
      "name": "开始",
      "shape": "rounded",
      "geometry": { "x": 200, "y": 0 }
    },
    {
      "id": "input",
      "type": "node",
      "name": "输入用户名密码",
      "shape": "parallelogram",
      "geometry": { "x": 200, "y": 100 }
    },
    {
      "id": "validate",
      "type": "node",
      "name": "验证",
      "shape": "diamond",
      "geometry": { "x": 200, "y": 200 }
    },
    {
      "id": "success",
      "type": "node",
      "name": "登录成功",
      "shape": "rounded",
      "geometry": { "x": 100, "y": 350 }
    },
    {
      "id": "error",
      "type": "node",
      "name": "显示错误",
      "shape": "rect",
      "geometry": { "x": 300, "y": 350 }
    },
    {
      "id": "edge-1",
      "type": "edge",
      "source": "start",
      "target": "input"
    },
    {
      "id": "edge-2",
      "type": "edge",
      "source": "input",
      "target": "validate"
    },
    {
      "id": "edge-3",
      "type": "edge",
      "source": "validate",
      "target": "success",
      "label": "成功"
    },
    {
      "id": "edge-4",
      "type": "edge",
      "source": "validate",
      "target": "error",
      "label": "失败"
    }
  ]
}
```

## Sequence Diagram Example (Mermaid)

```json
{
  "format": "mermaid",
  "title": "API调用流程",
  "elements": [
    {
      "id": "user",
      "type": "node",
      "name": "用户"
    },
    {
      "id": "frontend",
      "type": "node",
      "name": "前端"
    },
    {
      "id": "api",
      "type": "node",
      "name": "API服务"
    },
    {
      "id": "db",
      "type": "node",
      "name": "数据库"
    },
    {
      "id": "edge-1",
      "type": "edge",
      "source": "user",
      "target": "frontend",
      "label": "点击登录"
    },
    {
      "id": "edge-2",
      "type": "edge",
      "source": "frontend",
      "target": "api",
      "label": "POST /login"
    },
    {
      "id": "edge-3",
      "type": "edge",
      "source": "api",
      "target": "db",
      "label": "查询用户"
    },
    {
      "id": "edge-4",
      "type": "edge",
      "source": "db",
      "target": "api",
      "label": "返回数据",
      "style": {
        "lineStyle": "dashed",
        "endArrow": "none"
      }
    }
  ]
}
```

## Style Presets

### Network Topology Levels

| Level       | fillColor | strokeColor | fontSize |
| ----------- | --------- | ----------- | -------- |
| environment | `#e1d5e7` | `#9673a6`   | 14       |
| datacenter  | `#d5e8d4` | `#82b366`   | 12       |
| zone        | `#fff2cc` | `#d6b656`   | 10       |

### Device Types

| deviceType | strokeColor |
| ---------- | ----------- |
| router     | `#607D8B`   |
| switch     | `#4CAF50`   |
| firewall   | `#F44336`   |
| server     | `#2196F3`   |
| pc         | `#607D8B`   |
| database   | `#9C27B0`   |
| cloud      | `#9E9E9E`   |

### Flowchart Shapes

| shape           | Usage           |
| --------------- | --------------- |
| `rect`          | Process step    |
| `rounded`       | Start/end       |
| `parallelogram` | Input/output    |
| `diamond`       | Decision        |
| `cylinder`      | Database        |
| `cloud`         | External system |

## Best Practices

### ID Generation

- Use descriptive prefixes: `env-`, `dc-`, `zone-`, `device-`, `edge-`
- Keep IDs short but unique: `env-1`, `router-2`
- Avoid spaces or special characters (except `_`, `-`)

### Geometry for Network Topology

- Container coordinates are relative to their parent
- Device coordinates are relative to their containing zone
- Standard device size: `55` x `25`
- Leave padding: at least `10` units between elements

### Edge Routing

- For drawio: source/target can reference any node ID
- Edges can cross container boundaries
- Use `lineStyle: "orthogonal"` for clean routing in complex diagrams

### Performance

- Limit total elements to ~100 for good performance
- Use containers to group related elements
- For very large diagrams, split into multiple pages
