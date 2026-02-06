# ContextUI MCP Tools — Full API Reference

32 tools available via MCP. Each tool has a standard and `mcp_` prefixed variant (identical functionality).

---

## Workflow Management

### list_workflows

List workflow folders and their contents.

| Param    | Type   | Required | Description                                                                  |
| -------- | ------ | -------- | ---------------------------------------------------------------------------- |
| `folder` | string | No       | Subfolder to list (e.g., `"examples/MusicGen"`). Omit for top-level folders. |

```bash
mcporter call contextui.list_workflows
mcporter call contextui.list_workflows folder="examples"
mcporter call contextui.list_workflows folder="user_workflows/BBAvatar"
```

### read_workflow

Read workflow source code.

| Param  | Type   | Required | Description                    |
| ------ | ------ | -------- | ------------------------------ |
| `path` | string | Yes      | Absolute path to workflow file |

```bash
mcporter call contextui.read_workflow path="/path/to/WorkflowWindow.tsx"
```

### get_workflow_structure

Get complete directory tree of all workflows. No parameters.

```bash
mcporter call contextui.get_workflow_structure
```

### launch_workflow

Launch a workflow in the ContextUI app (opens as a docked tab).

| Param  | Type   | Required | Description                                |
| ------ | ------ | -------- | ------------------------------------------ |
| `path` | string | Yes      | Absolute path to the `.tsx` or `.jsx` file |

```bash
mcporter call contextui.launch_workflow path="/path/to/WorkflowWindow.tsx"
```

---

## Python Backend Management

### python_list_venvs

List available Python virtual environments. No parameters.

```bash
mcporter call contextui.python_list_venvs
```

### python_start_server

Start a Python FastAPI/Flask server.

| Param        | Type   | Required | Description                    |
| ------------ | ------ | -------- | ------------------------------ |
| `venvName`   | string | Yes      | Python venv name               |
| `scriptPath` | string | Yes      | Absolute path to Python script |
| `port`       | number | Yes      | Port number                    |
| `serverName` | string | Yes      | Unique server identifier       |

```bash
mcporter call contextui.python_start_server venvName="myenv" scriptPath="/path/to/server.py" port=8800 serverName="my-backend"
```

### python_stop_server

Stop a running Python server.

| Param        | Type   | Required | Description                          |
| ------------ | ------ | -------- | ------------------------------------ |
| `serverName` | string | Yes      | Server identifier used when starting |

```bash
mcporter call contextui.python_stop_server serverName="my-backend"
```

### python_server_status

Get status of running Python servers.

| Param        | Type   | Required | Description                                 |
| ------------ | ------ | -------- | ------------------------------------------- |
| `serverName` | string | No       | Specific server name. Omit for all servers. |

```bash
mcporter call contextui.python_server_status
mcporter call contextui.python_server_status serverName="my-backend"
```

### python_test_endpoint

Make an HTTP request to test a Python server endpoint.

| Param     | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| `url`     | string | Yes      | Full URL (e.g., `http://127.0.0.1:8800/status`)    |
| `method`  | string | No       | HTTP method (GET, POST, PUT, DELETE). Default: GET |
| `body`    | object | No       | Request body for POST/PUT                          |
| `headers` | object | No       | Additional HTTP headers                            |

```bash
mcporter call contextui.python_test_endpoint url="http://127.0.0.1:8800/status"
mcporter call contextui.python_test_endpoint url="http://127.0.0.1:8800/generate" method="POST" body='{"text":"hello"}'
```

---

## UI Automation

### ui_screenshot

Capture a screenshot of the current workflow or app window.

| Param      | Type   | Required | Description                                 |
| ---------- | ------ | -------- | ------------------------------------------- |
| `target`   | string | No       | `"active_tab"` (default) or `"full_window"` |
| `selector` | string | No       | CSS selector to capture specific element    |

```bash
mcporter call contextui.ui_screenshot
mcporter call contextui.ui_screenshot target="full_window"
mcporter call contextui.ui_screenshot selector=".my-chart"
```

### ui_get_dom

Get the DOM tree structure of the current workflow.

| Param           | Type    | Required | Description                              |
| --------------- | ------- | -------- | ---------------------------------------- |
| `depth`         | number  | No       | Max traversal depth (default: 3)         |
| `includeStyles` | boolean | No       | Include computed styles (default: false) |
| `selector`      | string  | No       | CSS selector to scope query              |
| `includeHidden` | boolean | No       | Include hidden elements (default: false) |
| `maxElements`   | number  | No       | Max elements to return (default: 50)     |

```bash
mcporter call contextui.ui_get_dom
mcporter call contextui.ui_get_dom depth=5 selector=".data-table"
```

### ui_click

Click on an element by selector, text, or coordinates.

| Param         | Type    | Required | Description                                   |
| ------------- | ------- | -------- | --------------------------------------------- |
| `selector`    | string  | No       | CSS selector                                  |
| `text`        | string  | No       | Text content to find (buttons, links, labels) |
| `coordinates` | object  | No       | `{x, y}` relative to workflow container       |
| `button`      | string  | No       | `"left"` (default), `"right"`, `"middle"`     |
| `doubleClick` | boolean | No       | Double-click instead of single                |

```bash
mcporter call contextui.ui_click text="Submit"
mcporter call contextui.ui_click selector="#save-btn"
mcporter call contextui.ui_click coordinates='{"x":100,"y":200}'
```

### ui_drag

Drag from one point to another. For sliders, use selector + value.

| Param              | Type   | Required | Description                                 |
| ------------------ | ------ | -------- | ------------------------------------------- |
| `selector`         | string | No       | CSS selector (preferred for sliders)        |
| `value`            | number | No       | For range inputs: set slider to this value  |
| `startCoordinates` | object | No       | `{x, y}` start point                        |
| `endCoordinates`   | object | No       | `{x, y}` end point                          |
| `steps`            | number | No       | Intermediate mousemove events (default: 10) |

```bash
mcporter call contextui.ui_drag selector="input[type=range]" value=75
mcporter call contextui.ui_drag startCoordinates='{"x":100,"y":200}' endCoordinates='{"x":300,"y":200}'
```

### ui_type

Type text into an input field.

| Param        | Type    | Required | Description                                    |
| ------------ | ------- | -------- | ---------------------------------------------- |
| `selector`   | string  | No       | CSS selector. Omit to use focused/first input. |
| `text`       | string  | Yes      | Text to type                                   |
| `clear`      | boolean | No       | Clear existing value first (default: true)     |
| `pressEnter` | boolean | No       | Press Enter after typing                       |
| `delay`      | number  | No       | Delay between keystrokes in ms                 |

```bash
mcporter call contextui.ui_type text="Hello, world!"
mcporter call contextui.ui_type selector="#search" text="query" pressEnter=true
```

### ui_get_element

Get properties of an element (visibility, enabled state, text, bounds).

| Param      | Type   | Required | Description                  |
| ---------- | ------ | -------- | ---------------------------- |
| `selector` | string | No       | CSS selector                 |
| `text`     | string | No       | Find element by text content |

```bash
mcporter call contextui.ui_get_element text="Submit"
mcporter call contextui.ui_get_element selector=".status-indicator"
```

### ui_accessibility_audit

Run an axe-core accessibility audit.

| Param      | Type     | Required | Description                                |
| ---------- | -------- | -------- | ------------------------------------------ |
| `selector` | string   | No       | CSS selector to scope audit                |
| `rules`    | string[] | No       | Specific rule IDs to run                   |
| `tags`     | string[] | No       | Filter by tags (e.g., `wcag2a`, `wcag2aa`) |

```bash
mcporter call contextui.ui_accessibility_audit
mcporter call contextui.ui_accessibility_audit tags='["wcag2aa"]'
```
