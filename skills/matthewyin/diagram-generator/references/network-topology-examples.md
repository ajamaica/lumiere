# Network Topology Examples

Common patterns for network topology diagrams in Draw.io format.

## Basic 3-Level Topology

Simple structure: Environment → Datacenter → Zone → Device

```json
{
  "format": "drawio",
  "title": "基本网络拓扑",
  "elements": [
    {
      "id": "env-1",
      "type": "container",
      "name": "生产环境",
      "level": "environment",
      "style": {
        "fillColor": "#e1d5e7",
        "strokeColor": "#9673a6",
        "fontSize": 14,
        "fontStyle": "bold"
      },
      "geometry": { "x": 100, "y": 100, "width": 400, "height": 300 },
      "children": [
        {
          "id": "dc-1",
          "type": "container",
          "name": "主数据中心",
          "level": "datacenter",
          "style": {
            "fillColor": "#d5e8d4",
            "strokeColor": "#82b366",
            "fontSize": 12,
            "fontStyle": "bold"
          },
          "geometry": { "x": 20, "y": 30, "width": 360, "height": 250 },
          "children": [
            {
              "id": "zone-1",
              "type": "container",
              "name": "DMZ区",
              "level": "zone",
              "style": {
                "fillColor": "#fff2cc",
                "strokeColor": "#d6b656",
                "fontSize": 10,
                "fontStyle": "bold"
              },
              "geometry": { "x": 30, "y": 30, "width": 140, "height": 100 },
              "children": [
                {
                  "id": "fw-1",
                  "type": "node",
                  "name": "防火墙1",
                  "deviceType": "firewall",
                  "style": { "strokeColor": "#F44336" },
                  "geometry": { "x": 10, "y": 35, "width": 55, "height": 25 }
                },
                {
                  "id": "fw-2",
                  "type": "node",
                  "name": "防火墙2",
                  "deviceType": "firewall",
                  "style": { "strokeColor": "#F44336" },
                  "geometry": { "x": 75, "y": 35, "width": 55, "height": 25 }
                }
              ]
            },
            {
              "id": "zone-2",
              "type": "container",
              "name": "应用区",
              "level": "zone",
              "style": {
                "fillColor": "#fff2cc",
                "strokeColor": "#d6b656",
                "fontSize": 10,
                "fontStyle": "bold"
              },
              "geometry": { "x": 190, "y": 30, "width": 140, "height": 100 },
              "children": [
                {
                  "id": "app-1",
                  "type": "node",
                  "name": "应用服务器1",
                  "deviceType": "server",
                  "style": { "strokeColor": "#2196F3" },
                  "geometry": { "x": 10, "y": 35, "width": 55, "height": 25 }
                },
                {
                  "id": "app-2",
                  "type": "node",
                  "name": "应用服务器2",
                  "deviceType": "server",
                  "style": { "strokeColor": "#2196F3" },
                  "geometry": { "x": 75, "y": 35, "width": 55, "height": 25 }
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
      "source": "fw-1",
      "target": "app-1",
      "style": { "strokeColor": "#333333", "endArrow": "none" }
    },
    {
      "id": "edge-2",
      "type": "edge",
      "source": "fw-2",
      "target": "app-2",
      "style": { "strokeColor": "#333333", "endArrow": "none" }
    }
  ]
}
```

## Multi-Environment Topology

Multiple environments with cross-environment connections.

```json
{
  "format": "drawio",
  "title": "多环境网络拓扑",
  "elements": [
    {
      "id": "env-prod",
      "type": "container",
      "name": "生产环境",
      "level": "environment",
      "style": {
        "fillColor": "#e1d5e7",
        "strokeColor": "#9673a6",
        "fontSize": 14
      },
      "geometry": { "x": 50, "y": 50, "width": 350, "height": 300 },
      "children": [
        {
          "id": "dc-prod",
          "type": "container",
          "name": "生产数据中心",
          "level": "datacenter",
          "style": { "fillColor": "#d5e8d4", "strokeColor": "#82b366" },
          "geometry": { "x": 20, "y": 30, "width": 310, "height": 250 },
          "children": [
            {
              "id": "zone-prod-app",
              "type": "container",
              "name": "应用区",
              "level": "zone",
              "geometry": { "x": 20, "y": 20, "width": 120, "height": 80 },
              "children": [
                {
                  "id": "prod-app-1",
                  "type": "node",
                  "name": "应用服务器",
                  "deviceType": "server",
                  "style": { "strokeColor": "#2196F3" },
                  "geometry": { "x": 10, "y": 25, "width": 55, "height": 25 }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "env-dr",
      "type": "container",
      "name": "灾备环境",
      "level": "environment",
      "style": {
        "fillColor": "#e1d5e7",
        "strokeColor": "#9673a6",
        "fontSize": 14
      },
      "geometry": { "x": 450, "y": 50, "width": 350, "height": 300 },
      "children": [
        {
          "id": "dc-dr",
          "type": "container",
          "name": "灾备数据中心",
          "level": "datacenter",
          "style": { "fillColor": "#d5e8d4", "strokeColor": "#82b366" },
          "geometry": { "x": 20, "y": 30, "width": 310, "height": 250 },
          "children": [
            {
              "id": "zone-dr-app",
              "type": "container",
              "name": "应用区",
              "level": "zone",
              "geometry": { "x": 20, "y": 20, "width": 120, "height": 80 },
              "children": [
                {
                  "id": "dr-app-1",
                  "type": "node",
                  "name": "应用服务器",
                  "deviceType": "server",
                  "style": { "strokeColor": "#2196F3" },
                  "geometry": { "x": 10, "y": 25, "width": 55, "height": 25 }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "edge-dr",
      "type": "edge",
      "source": "prod-app-1",
      "target": "dr-app-1",
      "label": "数据同步",
      "style": {
        "strokeColor": "#FF3333",
        "strokeWidth": 2,
        "dashPattern": "5,5"
      }
    }
  ]
}
```

## 4-Level Nested Topology

Full hierarchy as shown in the 贵州.drawio example.

```json
{
  "format": "drawio",
  "title": "4层嵌套网络拓扑",
  "elements": [
    {
      "id": "env-1",
      "type": "container",
      "name": "省中心管理端",
      "level": "environment",
      "style": {
        "fillColor": "#e1d5e7",
        "strokeColor": "#9673a6",
        "fontSize": 14
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
            "fontSize": 12
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
                "fontSize": 10
              },
              "geometry": { "x": 93.5, "y": 40, "width": 145, "height": 70 },
              "children": [
                {
                  "id": "router-1",
                  "type": "node",
                  "name": "路由器1",
                  "deviceType": "router",
                  "style": { "strokeColor": "#607D8B" },
                  "geometry": { "x": 8, "y": 25, "width": 55, "height": 25 }
                },
                {
                  "id": "router-2",
                  "type": "node",
                  "name": "路由器2",
                  "deviceType": "router",
                  "style": { "strokeColor": "#607D8B" },
                  "geometry": { "x": 68, "y": 25, "width": 55, "height": 25 }
                }
              ]
            },
            {
              "id": "zone-2",
              "type": "container",
              "name": "汇聚区",
              "level": "zone",
              "style": {
                "fillColor": "#fff2cc",
                "strokeColor": "#d6b656",
                "fontSize": 10
              },
              "geometry": { "x": 93.5, "y": 165, "width": 145, "height": 70 },
              "children": [
                {
                  "id": "switch-1",
                  "type": "node",
                  "name": "汇聚交换机1",
                  "deviceType": "switch",
                  "style": { "strokeColor": "#4CAF50" },
                  "geometry": { "x": 8, "y": 25, "width": 55, "height": 25 }
                },
                {
                  "id": "switch-2",
                  "type": "node",
                  "name": "汇聚交换机2",
                  "deviceType": "switch",
                  "style": { "strokeColor": "#4CAF50" },
                  "geometry": { "x": 68, "y": 25, "width": 55, "height": 25 }
                }
              ]
            },
            {
              "id": "zone-3",
              "type": "container",
              "name": "终端区",
              "level": "zone",
              "style": {
                "fillColor": "#fff2cc",
                "strokeColor": "#d6b656",
                "fontSize": 10
              },
              "geometry": { "x": 315, "y": 90, "width": 145, "height": 150 },
              "children": [
                {
                  "id": "pc-1",
                  "type": "node",
                  "name": "管理端PC1",
                  "deviceType": "pc",
                  "style": { "strokeColor": "#607D8B" },
                  "geometry": { "x": 8, "y": 110, "width": 55, "height": 25 }
                },
                {
                  "id": "pc-2",
                  "type": "node",
                  "name": "管理端PC2",
                  "deviceType": "pc",
                  "style": { "strokeColor": "#607D8B" },
                  "geometry": { "x": 68, "y": 110, "width": 55, "height": 25 }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "env-2",
      "type": "container",
      "name": "生产网",
      "level": "environment",
      "style": {
        "fillColor": "#e1d5e7",
        "strokeColor": "#9673a6",
        "fontSize": 14
      },
      "geometry": { "x": 470, "y": 110, "width": 218, "height": 170 },
      "children": [
        {
          "id": "dc-2",
          "type": "container",
          "name": "西五环",
          "level": "datacenter",
          "style": {
            "fillColor": "#d5e8d4",
            "strokeColor": "#82b366",
            "fontSize": 12
          },
          "geometry": { "x": 15, "y": 30, "width": 173, "height": 115 },
          "children": [
            {
              "id": "zone-4",
              "type": "container",
              "name": "内联接入区",
              "level": "zone",
              "style": {
                "fillColor": "#fff2cc",
                "strokeColor": "#d6b656",
                "fontSize": 10
              },
              "geometry": { "x": 8, "y": 25, "width": 145, "height": 70 },
              "children": [
                {
                  "id": "router-3",
                  "type": "node",
                  "name": "路由器1",
                  "deviceType": "router",
                  "style": { "strokeColor": "#607D8B" },
                  "geometry": { "x": 8, "y": 25, "width": 55, "height": 25 }
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
      "target": "switch-1",
      "style": { "endArrow": "none" }
    },
    {
      "id": "edge-2",
      "type": "edge",
      "source": "router-1",
      "target": "switch-2",
      "style": { "endArrow": "none" }
    },
    {
      "id": "edge-3",
      "type": "edge",
      "source": "router-2",
      "target": "switch-1",
      "style": { "endArrow": "none" }
    },
    {
      "id": "edge-4",
      "type": "edge",
      "source": "router-2",
      "target": "switch-2",
      "style": { "endArrow": "none" }
    },
    {
      "id": "edge-5",
      "type": "edge",
      "source": "switch-1",
      "target": "switch-2",
      "style": { "endArrow": "none" }
    },
    {
      "id": "edge-6",
      "type": "edge",
      "source": "router-1",
      "target": "router-3",
      "label": "长途专线",
      "style": { "strokeColor": "#FF3333" }
    }
  ]
}
```

## Common Zone Types

| Zone Name  | Typical Devices           | Use Case                      |
| ---------- | ------------------------- | ----------------------------- |
| 上联区     | Routers                   | External network connections  |
| 汇聚区     | Core Switches             | Traffic aggregation           |
| 终端区     | Switches, PCs             | End-user devices              |
| 彩银区     | Firewalls, Routers        | Financial network integration |
| 内联接入区 | Routers                   | Internal network connections  |
| 外联接入区 | Routers                   | External partner connections  |
| DMZ区      | Firewalls, Public Servers | Public-facing services        |
| 应用区     | Application Servers       | Application deployment        |
| 数据区     | Database Servers          | Data storage                  |
| 管理区     | Management Servers        | Administrative access         |

## Connection Patterns

### Full Mesh (All-to-All)

```json
{"type": "edge", "source": "r1", "target": "r2"},
{"type": "edge", "source": "r1", "target": "r3"},
{"type": "edge", "source": "r2", "target": "r3"}
```

### Redundant Pair (Active/Active)

```json
{"type": "edge", "source": "fw-1", "target": "sw-1"},
{"type": "edge", "source": "fw-1", "target": "sw-2"},
{"type": "edge", "source": "fw-2", "target": "sw-1"},
{"type": "edge", "source": "fw-2", "target": "sw-2"}
```

### Hierarchy (Upstream → Downstream)

```json
{"type": "edge", "source": "router", "target": "firewall"},
{"type": "edge", "source": "firewall", "target": "switch"},
{"type": "edge", "source": "switch", "target": "server"}
```

### Cross-Environment (Production → DR)

```json
{
  "type": "edge",
  "source": "prod-db",
  "target": "dr-db",
  "label": "数据同步",
  "style": {
    "strokeColor": "#FF3333",
    "dashPattern": "5,5"
  }
}
```

## Layout Guidelines

### Container Spacing

- Environment to Environment: minimum 100px
- Datacenter to Datacenter: minimum 50px
- Zone to Zone: minimum 30px

### Device Placement

- Standard device size: 55 x 25
- Horizontal spacing: 10-15px
- Vertical spacing: 10-15px
- Alignment: Top-left corner within zone

### Edge Routing

- Use `lineStyle: "orthogonal"` for clean connections
- Avoid crossing over other devices when possible
- Use different stroke colors for different connection types (e.g., red for cross-site links)
