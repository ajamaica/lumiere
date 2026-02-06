# ServerLauncher — Python Backend Pattern

The standard pattern for any ContextUI workflow with a Python backend. Two files handle everything: Python detection → venv selection → package installation → server start/stop → connection polling. Cross-platform (Windows, macOS, Linux).

## Overview

Every Python-backed workflow follows the same structure:

1. Copy `ui/ServerLauncher/` (2 files) from the CowsayDemo example
2. Call `useServerLauncher()` with a simple config object
3. Render `<ServerLauncher server={server} />` for the setup UI
4. Use `server.connected` and `server.serverUrl` in your workflow tabs

**User experience:** Open workflow → select venv → click "Install All" → click "Start Server" → use the workflow. Or enable auto-start and it handles everything automatically.

## File Structure

```
YourWorkflow/
├── YourWorkflowWindow.tsx       # Main entry — hook init, tabs, connection check
├── YourWorkflow.meta.json       # Icon, color metadata
├── your_server.py               # FastAPI backend
└── ui/
    ├── YourFeatureTab.tsx        # Your main workflow UI
    └── ServerLauncher/           # Copy this directory (2 files)
        ├── useServerLauncher.ts  # Hook — all logic, zero external deps
        └── ServerLauncher.tsx    # UI component — drop-in setup panel
```

That's it. Two files in `ServerLauncher/`, your server script, your feature UI, and a main window.

## Quick Integration

### Step 1: Copy ServerLauncher

Copy `ui/ServerLauncher/` from `examples/CowsayDemo/ui/ServerLauncher/` into your workflow.

### Step 2: Write Your Python Server

Standard FastAPI server with a `/health` or root endpoint:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn, sys

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# Your endpoints here...

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8800
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### Step 3: Hook + Component

```tsx
import { useServerLauncher } from './ui/ServerLauncher/useServerLauncher'
import { ServerLauncher } from './ui/ServerLauncher/ServerLauncher'

export const MyWorkflowWindow: React.FC = () => {
  const server = useServerLauncher({
    workflowFolder: 'MyWorkflow',
    scriptName: 'my_server.py',
    port: 8800,
    serverName: 'my-server',
    packages: ['fastapi', 'uvicorn[standard]', 'numpy'],
  })

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {server.connected ? (
        <MyFeatureUI serverUrl={server.serverUrl} />
      ) : (
        <ServerLauncher server={server} title="My Workflow" />
      )}
    </div>
  )
}
```

Done. That's the entire integration.

## Config Reference

```typescript
useServerLauncher({
  workflowFolder: string;   // Folder name (e.g., 'MyWorkflow')
  scriptName: string;        // Python script (e.g., 'server.py')
  port: number;              // Default port (e.g., 8800)
  serverName: string;        // Unique ID for IPC (e.g., 'my-server')
  packages?: string[];       // Pip packages (e.g., ['fastapi', 'torch'])
  preferredVenvs?: string[]; // Venv preference order (default: ['default'])
});
```

## ServerHandle (returned by hook)

### State

| Field              | Type              | Description                          |
| ------------------ | ----------------- | ------------------------------------ |
| `pythonInstalled`  | `boolean \| null` | null = checking, true/false = result |
| `installingPython` | `boolean`         | Currently installing Python          |
| `availableVenvs`   | `string[]`        | Detected venvs                       |
| `selectedVenv`     | `string`          | Currently selected venv              |
| `port`             | `number`          | Current port                         |
| `portFree`         | `boolean \| null` | Port availability                    |
| `packages`         | `string[]`        | Required packages list               |
| `depsStatus`       | `DepsStatus`      | Per-package install status           |
| `checkingDeps`     | `boolean`         | Currently checking packages          |
| `installingDeps`   | `boolean`         | Currently installing packages        |
| `allDepsInstalled` | `boolean`         | All packages installed               |
| `serverRunning`    | `boolean`         | Server process started               |
| `connected`        | `boolean`         | Server responding to HTTP            |
| `connecting`       | `boolean`         | Waiting for connection               |
| `serverUrl`        | `string`          | `http://127.0.0.1:{port}`            |
| `autoStart`        | `boolean`         | Auto-start preference                |
| `logs`             | `string[]`        | Activity log                         |
| `creatingVenv`     | `boolean`         | Currently creating venv              |

### Actions

| Method               | Description              |
| -------------------- | ------------------------ |
| `setSelectedVenv(v)` | Select a venv            |
| `setPort(p)`         | Change port              |
| `setAutoStart(v)`    | Toggle auto-start        |
| `installPython()`    | Install Python 3.12      |
| `installDeps()`      | Install missing packages |
| `startServer()`      | Start the Python server  |
| `stopServer()`       | Stop the Python server   |
| `createVenv(name)`   | Create a new venv        |
| `addLog(msg)`        | Add a log entry          |

## ServerLauncher Component Props

```tsx
<ServerLauncher
  server={server} // Required: ServerHandle from hook
  title="My Workflow" // Optional: header text (default: "Server Setup")
  launchLabel="Launch" // Optional: button text (default: "Start Server")
  accentColor="bg-cyan-500 hover:bg-cyan-400" // Optional: Tailwind classes
/>
```

The component renders everything: venv picker, port selector, package status, install button, start/stop button, and logs. All self-contained — manages its own venv creation UI state internally.

## Tab Pattern (optional)

If your workflow has Setup + Feature tabs:

```tsx
const [tab, setTab] = useState<'setup' | 'main'>('setup')

useEffect(() => {
  if (server.connected) setTab('main')
}, [server.connected])

// In JSX:
{
  tab === 'setup' ? (
    <ServerLauncher server={server} title="My Workflow" />
  ) : (
    <MyFeatureTab serverUrl={server.serverUrl} />
  )
}
```

## What the Hook Handles Automatically

- **Python detection** — checks installed versions on mount
- **Venv loading** — lists available venvs, auto-selects preferred or last-used
- **Package checking** — re-checks when venv or packages change
- **Port checking** — tests availability when port changes
- **Connection polling** — polls server every 1s after start until connected
- **Settings persistence** — remembers port, venv, auto-start per workflow in localStorage
- **Auto-start** — starts server automatically when deps are ready (if enabled)
- **Cleanup** — stops server on unmount

## Common Package Sets

```typescript
// Web server (almost every workflow)
packages: ['fastapi', 'uvicorn[standard]']

// Data science
packages: ['fastapi', 'uvicorn[standard]', 'numpy', 'pandas', 'matplotlib']

// Machine learning
packages: ['fastapi', 'uvicorn[standard]', 'torch', 'torchvision']

// Audio processing
packages: ['fastapi', 'uvicorn[standard]', 'soundfile', 'scipy']
```

## Source Code

### useServerLauncher.ts

```typescript
// ============================================================
// useServerLauncher.ts
// Self-contained hook for Python server lifecycle management.
// No external imports — uses React globals (useState, useEffect, etc.)
//
// Usage:
//   const server = useServerLauncher({
//     workflowFolder: 'MyWorkflow',
//     scriptName: 'server.py',
//     port: 8800,
//     serverName: 'my-server',
//     packages: ['fastapi', 'uvicorn[standard]'],
//   });
// ============================================================

// ── Platform ────────────────────────────────────────────────
const _isWin =
  typeof navigator !== 'undefined'
    ? (navigator.platform?.toLowerCase().includes('win') ?? false)
    : false

// ── Node access (Electron renderer) ────────────────────────
const _ipc = () => (window as any).require?.('electron')?.ipcRenderer
const _fs = () => (window as any).require?.('fs')
const _path = () => (window as any).require?.('path')
const _os = () => (window as any).require?.('os')
const _net = () => (window as any).require?.('net')
const _execAsync = () => {
  const cp = (window as any).require?.('child_process')
  const util = (window as any).require?.('util')
  return cp && util ? util.promisify(cp.exec) : null
}

// ── Helpers ─────────────────────────────────────────────────
const join = (...s: string[]) => _path()?.join(...s) ?? s.join(_isWin ? '\\' : '/')

const sitePackages = (venvPath: string) => {
  if (_isWin) return join(venvPath, 'Lib', 'site-packages')
  const fs = _fs()
  try {
    const dirs = fs?.readdirSync(join(venvPath, 'lib')) ?? []
    const py = dirs.find((d: string) => /^python\d+\.\d+$/.test(d))
    if (py) return join(venvPath, 'lib', py, 'site-packages')
  } catch {}
  return join(venvPath, 'lib', 'python3.12', 'site-packages')
}

// localStorage persistence
const _sk = (f: string, k: string) => `sl_${f}_${k}`
const _save = (f: string, k: string, v: string) => {
  try {
    localStorage.setItem(_sk(f, k), v)
  } catch {}
}
const _load = (f: string, k: string) => {
  try {
    return localStorage.getItem(_sk(f, k))
  } catch {
    return null
  }
}

// Stabilise array refs to prevent re-render loops from inline literals
function useStableArray<T>(arr: T[]): T[] {
  const ref = useRef(arr)
  if (JSON.stringify(ref.current) !== JSON.stringify(arr)) ref.current = arr
  return ref.current
}

// ── Types ───────────────────────────────────────────────────
export interface ServerConfig {
  /** Workflow folder name (e.g., 'CowsayDemo') */
  workflowFolder: string
  /** Python script filename (e.g., 'cowsay_server.py') */
  scriptName: string
  /** Default port */
  port: number
  /** Unique server name for IPC */
  serverName: string
  /** Required pip packages */
  packages?: string[]
  /** Preferred venv names in order (default: ['default']) */
  preferredVenvs?: string[]
}

export interface DepsStatus {
  [pkg: string]: { installed: boolean }
}

export interface ServerHandle {
  // State
  pythonInstalled: boolean | null
  installingPython: boolean
  availableVenvs: string[]
  selectedVenv: string
  port: number
  portFree: boolean | null
  packages: string[]
  depsStatus: DepsStatus
  checkingDeps: boolean
  installingDeps: boolean
  allDepsInstalled: boolean
  serverRunning: boolean
  connected: boolean
  connecting: boolean
  serverUrl: string
  autoStart: boolean
  logs: string[]
  creatingVenv: boolean
  // Actions
  setSelectedVenv: (v: string) => void
  setPort: (p: number) => void
  setAutoStart: (v: boolean) => void
  installPython: () => Promise<void>
  installDeps: () => Promise<void>
  startServer: () => Promise<void>
  stopServer: () => Promise<void>
  createVenv: (name: string) => Promise<void>
  addLog: (msg: string) => void
}

// ── Hook ────────────────────────────────────────────────────
export function useServerLauncher(config: ServerConfig): ServerHandle {
  const { workflowFolder, scriptName, port: defaultPort, serverName } = config
  const packages = useStableArray(config.packages ?? [])
  const preferred = useStableArray(config.preferredVenvs ?? ['default'])

  // ── State ───────────────────────────────────────────────
  const [pythonInstalled, setPythonInstalled] = useState<boolean | null>(null)
  const [installingPython, setInstallingPython] = useState(false)
  const [availableVenvs, setAvailableVenvs] = useState<string[]>([])
  const [selectedVenv, setSelectedVenvRaw] = useState('')
  const [venvPaths, setVenvPaths] = useState<Record<string, string>>({})
  const [port, setPortRaw] = useState(() => {
    const saved = _load(workflowFolder, 'port')
    if (saved) {
      const n = parseInt(saved)
      if (n >= 1024 && n <= 65535) return n
    }
    return defaultPort
  })
  const [portFree, setPortFree] = useState<boolean | null>(null)
  const [depsStatus, setDepsStatus] = useState<DepsStatus>({})
  const [checkingDeps, setCheckingDeps] = useState(false)
  const [installingDeps, setInstallingDeps] = useState(false)
  const [serverRunning, setServerRunning] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [autoStart, setAutoStartRaw] = useState(() => _load(workflowFolder, 'auto') === '1')
  const [logs, setLogs] = useState<string[]>([])
  const [creatingVenv, setCreatingVenv] = useState(false)
  const initRef = useRef(false)
  const autoStartedRef = useRef(false)

  const serverUrl = `http://127.0.0.1:${port}`
  const allDepsInstalled = packages.length > 0 && packages.every((p) => depsStatus[p]?.installed)

  // ── Logging ─────────────────────────────────────────────
  const addLog = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev.slice(-100), `[${t}] ${msg}`])
  }, [])

  // ── Setters with persistence ────────────────────────────
  const setPort = useCallback(
    (p: number) => {
      if (p >= 1024 && p <= 65535 && !serverRunning) {
        setPortRaw(p)
        _save(workflowFolder, 'port', String(p))
        setPortFree(null)
      }
    },
    [workflowFolder, serverRunning],
  )

  const setSelectedVenv = useCallback(
    (v: string) => {
      setSelectedVenvRaw(v)
      if (v) _save(workflowFolder, 'venv', v)
    },
    [workflowFolder],
  )

  const setAutoStart = useCallback(
    (v: boolean) => {
      setAutoStartRaw(v)
      _save(workflowFolder, 'auto', v ? '1' : '0')
    },
    [workflowFolder],
  )

  // ── Port check ────────────────────────────────────────────
  useEffect(() => {
    if (serverRunning) return
    const timer = setTimeout(async () => {
      const net = _net()
      if (!net) {
        setPortFree(null)
        return
      }
      try {
        const free = await new Promise<boolean>((resolve) => {
          const srv = net.createServer()
          srv.once('error', () => resolve(false))
          srv.once('listening', () => {
            srv.close()
            resolve(true)
          })
          srv.listen(port, '127.0.0.1')
        })
        setPortFree(free)
      } catch {
        setPortFree(null)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [port, serverRunning])

  // ── Load venvs ────────────────────────────────────────────
  const refreshVenvs = useCallback(async () => {
    const ipc = _ipc()
    if (!ipc) return
    try {
      const res = await ipc.invoke('python-list-venvs')
      if (!res.success || !res.venvs?.length) {
        addLog('No Python venvs found')
        return
      }
      const names: string[] = res.venvs.map((v: any) => v.name)
      const paths: Record<string, string> = {}
      res.venvs.forEach((v: any) => {
        paths[v.name] = v.path
      })
      setAvailableVenvs(names)
      setVenvPaths(paths)
      setSelectedVenvRaw((current) => {
        if (current && names.includes(current)) return current
        const saved = _load(workflowFolder, 'venv')
        if (saved && names.includes(saved)) return saved
        for (const p of preferred) {
          if (names.includes(p)) return p
        }
        return names[0] || ''
      })
    } catch (e: any) {
      addLog(`Error loading venvs: ${e.message}`)
    }
  }, [workflowFolder, preferred, addLog])

  // ── Init: check Python → load venvs ──────────────────────
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    ;(async () => {
      const ipc = _ipc()
      if (!ipc) {
        addLog('IPC not available')
        return
      }
      addLog('Checking Python...')
      try {
        const res = await ipc.invoke('python-get-available-versions')
        const installed = res.installed ?? []
        if (installed.length > 0) {
          setPythonInstalled(true)
          addLog(`Found Python ${installed[0].version}`)
          await refreshVenvs()
        } else {
          setPythonInstalled(false)
          addLog('No Python found')
        }
      } catch (e: any) {
        addLog(`Python check failed: ${e.message}`)
        setPythonInstalled(false)
      }
    })()
  }, [refreshVenvs, addLog])

  // ── Install Python ────────────────────────────────────────
  const installPython = useCallback(async () => {
    const ipc = _ipc()
    if (!ipc) return
    setInstallingPython(true)
    addLog('Installing Python 3.12...')
    try {
      const res = await ipc.invoke('python-install-version', '3.12')
      if (res.success) {
        setPythonInstalled(true)
        addLog('Python 3.12 installed')
        await refreshVenvs()
      } else addLog(`Install failed: ${res.error}`)
    } catch (e: any) {
      addLog(`Install error: ${e.message}`)
    }
    setInstallingPython(false)
  }, [addLog, refreshVenvs])

  // ── Check deps ────────────────────────────────────────────
  const checkDeps = useCallback(async () => {
    const ipc = _ipc()
    if (!ipc || !selectedVenv || packages.length === 0) return
    setCheckingDeps(true)
    try {
      const res = await ipc.invoke('python-list-venvs')
      const venv = res.venvs?.find((v: any) => v.name === selectedVenv)
      const pipPkgs: string[] = venv?.packages ?? []
      const venvPath = venvPaths[selectedVenv] || ''
      const fs = _fs()
      const status: DepsStatus = {}

      for (const pkg of packages) {
        const base = pkg
          .split(';')[0]
          .replace(/\[.*\]/, '')
          .split(/[<>=!]/)[0]
          .trim()
        let found = pipPkgs.some((p) => p.toLowerCase().startsWith(base.toLowerCase()))
        if (!found && venvPath && fs) {
          try {
            const folders = fs.readdirSync(sitePackages(venvPath))
            const norm = base.toLowerCase().replace(/-/g, '_')
            found = folders.some((f: string) => f.toLowerCase().startsWith(norm))
          } catch {}
        }
        status[pkg] = { installed: found }
      }
      setDepsStatus(status)
      addLog('Package status checked')
    } catch (e: any) {
      addLog(`Dep check error: ${e.message}`)
    }
    setCheckingDeps(false)
  }, [selectedVenv, packages, venvPaths, addLog])

  useEffect(() => {
    if (selectedVenv && packages.length > 0) checkDeps()
  }, [selectedVenv, packages, checkDeps])

  // ── Install deps ──────────────────────────────────────────
  const installDeps = useCallback(async () => {
    const ipc = _ipc()
    if (!ipc || !selectedVenv) return
    setInstallingDeps(true)
    const missing = packages.filter((p) => !depsStatus[p]?.installed)
    addLog(`Installing ${missing.length} packages...`)
    for (let i = 0; i < missing.length; i++) {
      const pkg = missing[i]
      addLog(`[${i + 1}/${missing.length}] Installing ${pkg}...`)
      try {
        const res = await ipc.invoke('python-install-package', {
          venvName: selectedVenv,
          package: `"${pkg}"`,
        })
        addLog(
          res?.success !== false
            ? `Installed ${pkg}`
            : `Failed: ${pkg} — ${res?.error || 'unknown'}`,
        )
      } catch (e: any) {
        addLog(`Error: ${pkg} — ${e.message}`)
      }
      await checkDeps()
    }
    setInstallingDeps(false)
  }, [selectedVenv, packages, depsStatus, addLog, checkDeps])

  // ── Create venv ───────────────────────────────────────────
  const createVenv = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed || availableVenvs.includes(trimmed)) return
      setCreatingVenv(true)
      addLog(`Creating venv "${trimmed}"...`)
      const os = _os()
      const fs = _fs()
      const homeDir = os?.homedir() || ''
      const runtimeDir = join(homeDir, 'ContextUI', 'python_runtime')

      let pyVersion = '3.12'
      if (fs) {
        try {
          const versions = fs.readdirSync(runtimeDir).filter((n: string) => /^\d+\.\d+$/.test(n))
          if (versions.includes('3.12')) pyVersion = '3.12'
          else if (versions.length > 0) pyVersion = versions[0]
        } catch {}
      }

      const existingPath = Object.values(venvPaths)[0]
      const basePath = existingPath
        ? _path()?.dirname(existingPath) ||
          join(homeDir, 'ContextUI', _isWin ? 'Default' : 'default', 'python_venvs')
        : join(homeDir, 'ContextUI', _isWin ? 'Default' : 'default', 'python_venvs')
      const venvPath = join(basePath, trimmed)

      try {
        if (_isWin) {
          fs?.mkdirSync(join(venvPath, 'Scripts'), { recursive: true })
          fs?.mkdirSync(join(venvPath, 'Lib', 'site-packages'), { recursive: true })
          for (const f of ['python.exe', 'pythonw.exe', 'python312.dll', 'vcruntime140.dll']) {
            try {
              fs?.copyFileSync(join(runtimeDir, pyVersion, f), join(venvPath, 'Scripts', f))
            } catch {}
          }
          fs?.writeFileSync(
            join(venvPath, 'pyvenv.cfg'),
            `home = ${join(runtimeDir, pyVersion)}\nversion = ${pyVersion}\n`,
          )
        } else {
          const exec = _execAsync()
          const pyBin = join(runtimeDir, pyVersion, 'bin', 'python3')
          const cmd = fs?.existsSync(pyBin)
            ? `"${pyBin}" -m venv "${venvPath}"`
            : `python3 -m venv "${venvPath}"`
          await exec?.(cmd, { timeout: 60000 })
        }
        addLog(`Venv "${trimmed}" created`)
        await refreshVenvs()
        setSelectedVenvRaw(trimmed)
      } catch (e: any) {
        addLog(`Error: ${e.message}`)
      }
      setCreatingVenv(false)
    },
    [availableVenvs, venvPaths, addLog, refreshVenvs],
  )

  // ── Start server ──────────────────────────────────────────
  const startServer = useCallback(async () => {
    const ipc = _ipc()
    if (!ipc || !selectedVenv) return
    setConnecting(true)
    addLog(`Starting ${serverName}...`)
    try {
      const scriptRes = await ipc.invoke('resolve-workflow-script', { workflowFolder, scriptName })
      if (!scriptRes.success) {
        addLog(`Script not found: ${scriptRes.error}`)
        setConnecting(false)
        return
      }
      const res = await ipc.invoke('python-start-script-server', {
        venvName: selectedVenv,
        scriptPath: scriptRes.path,
        port,
        serverName,
      })
      if (res.success) {
        setServerRunning(true)
        addLog(`Server started on port ${port}`)
      } else {
        addLog(`Start failed: ${res.error}`)
        setConnecting(false)
      }
    } catch (e: any) {
      addLog(`Error: ${e.message}`)
      setConnecting(false)
    }
  }, [selectedVenv, workflowFolder, scriptName, port, serverName, addLog])

  // ── Stop server ───────────────────────────────────────────
  const stopServer = useCallback(async () => {
    const ipc = _ipc()
    if (!ipc) return
    try {
      await ipc.invoke('python-stop-script-server', serverName)
      addLog('Server stopped')
    } catch {}
    setServerRunning(false)
    setConnected(false)
    setConnecting(false)
  }, [serverName, addLog])

  // ── Connection polling ────────────────────────────────────
  useEffect(() => {
    if (!serverRunning) return
    let cancelled = false
    const poll = async () => {
      while (!cancelled) {
        try {
          const r = await fetch(serverUrl)
          if (r.ok) {
            setConnected(true)
            setConnecting(false)
            return
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
    poll()
    return () => {
      cancelled = true
    }
  }, [serverRunning, serverUrl])

  // ── Auto-start ────────────────────────────────────────────
  useEffect(() => {
    if (!autoStart || autoStartedRef.current || serverRunning || connecting) return
    if (selectedVenv && allDepsInstalled) {
      autoStartedRef.current = true
      setTimeout(() => startServer(), 500)
    }
  }, [autoStart, selectedVenv, allDepsInstalled, serverRunning, connecting, startServer])

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      if (serverRunning) _ipc()?.invoke('python-stop-script-server', serverName)
    }
  }, [serverRunning, serverName])

  return {
    pythonInstalled,
    installingPython,
    availableVenvs,
    selectedVenv,
    port,
    portFree,
    packages,
    depsStatus,
    checkingDeps,
    installingDeps,
    allDepsInstalled,
    serverRunning,
    connected,
    connecting,
    serverUrl,
    autoStart,
    logs,
    creatingVenv,
    setSelectedVenv,
    setPort,
    setAutoStart,
    installPython,
    installDeps,
    startServer,
    stopServer,
    createVenv,
    addLog,
  }
}
```

### ServerLauncher.tsx

```tsx
// ============================================================
// ServerLauncher.tsx
// Drop-in UI component for Python server management.
// Pair with useServerLauncher.ts — no other files needed.
//
// Usage:
//   import { useServerLauncher } from './ServerLauncher/useServerLauncher';
//   import { ServerLauncher } from './ServerLauncher/ServerLauncher';
//
//   const server = useServerLauncher({ ... });
//   <ServerLauncher server={server} />
// ============================================================

import type { ServerHandle } from './useServerLauncher'

interface Props {
  server: ServerHandle
  title?: string
  accentColor?: string
  launchLabel?: string
}

export const ServerLauncher: React.FC<Props> = ({
  server: s,
  title = 'Server Setup',
  accentColor = 'bg-cyan-500 hover:bg-cyan-400',
  launchLabel = 'Start Server',
}) => {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  // Panel wrapper
  const Panel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex-1 overflow-y-auto p-6 flex justify-center">
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-cyan-400 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )

  // Checking Python...
  if (s.pythonInstalled === null) {
    return (
      <Panel>
        <div className="bg-[rgba(30,30,50,0.8)] rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="animate-pulse">●</span>
            <span className="text-sm">Checking Python installation...</span>
          </div>
        </div>
      </Panel>
    )
  }

  // Python not installed
  if (s.pythonInstalled === false) {
    return (
      <Panel>
        <div className="bg-[rgba(30,30,50,0.8)] rounded-lg p-4 border border-orange-500/50">
          <div className="text-orange-400 text-sm font-medium mb-2">Python Not Installed</div>
          <p className="text-slate-400 text-xs mb-3">
            Python 3.12 is required. Click below to install it automatically.
          </p>
          <button
            onClick={s.installPython}
            disabled={s.installingPython}
            className={`w-full border-none text-white p-3 rounded cursor-pointer text-sm font-medium transition-colors ${
              s.installingPython ? 'bg-slate-700 cursor-wait' : 'bg-orange-500 hover:bg-orange-400'
            }`}
          >
            {s.installingPython ? 'Installing Python 3.12...' : 'Install Python 3.12'}
          </button>
        </div>
        <Logs logs={s.logs} />
      </Panel>
    )
  }

  // Main UI
  return (
    <Panel>
      {/* Venv Selection */}
      <Section label="Python Venv">
        <div className="flex gap-2">
          <select
            value={s.selectedVenv}
            onChange={(e) => s.setSelectedVenv(e.target.value)}
            disabled={s.serverRunning}
            className="flex-1 bg-slate-700 border border-slate-600 text-white p-2 text-sm rounded disabled:opacity-50"
          >
            {s.availableVenvs.length === 0 && <option value="">No venvs available</option>}
            {s.availableVenvs.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(!showCreate)}
            disabled={s.serverRunning || s.creatingVenv}
            title="Create new venv"
            className={`border border-slate-600 text-white py-2 px-3 text-sm rounded disabled:cursor-not-allowed ${
              showCreate ? 'bg-pink-400' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            +
          </button>
        </div>
        {showCreate && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  s.createVenv(newName.trim())
                  setNewName('')
                  setShowCreate(false)
                }
              }}
              placeholder="Venv name..."
              disabled={s.creatingVenv}
              className="flex-1 bg-slate-700 border border-slate-600 text-white p-2 text-sm rounded disabled:opacity-50"
            />
            <button
              onClick={() => {
                if (newName.trim()) {
                  s.createVenv(newName.trim())
                  setNewName('')
                  setShowCreate(false)
                }
              }}
              disabled={s.creatingVenv || !newName.trim()}
              className={`border-none text-white py-2 px-4 text-sm rounded disabled:cursor-wait ${
                s.creatingVenv ? 'bg-slate-700' : 'bg-cyan-600 hover:bg-cyan-500 cursor-pointer'
              }`}
            >
              {s.creatingVenv ? '...' : 'Create'}
            </button>
          </div>
        )}
      </Section>

      {/* Port */}
      <Section label="Port">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={s.port}
            onChange={(e) => s.setPort(parseInt(e.target.value) || s.port)}
            disabled={s.serverRunning}
            min={1024}
            max={65535}
            className="flex-1 bg-slate-700 border border-slate-600 text-white p-2 text-sm rounded text-center disabled:opacity-50"
          />
          <span
            className={`text-sm ${
              s.portFree === true
                ? 'text-green-400'
                : s.portFree === false
                  ? 'text-red-400'
                  : 'text-slate-500'
            }`}
          >
            {s.portFree === true ? '✓' : s.portFree === false ? '✗' : '?'}
          </span>
        </div>
      </Section>

      {/* Auto-start */}
      <Section>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s.autoStart}
            onChange={(e) => s.setAutoStart(e.target.checked)}
            className="w-4 h-4 accent-pink-400"
          />
          <span className="text-slate-400 text-sm font-medium">Auto-start when ready</span>
        </label>
      </Section>

      {/* Packages */}
      {s.selectedVenv && (
        <Section
          label={
            <span>
              Packages {s.checkingDeps && <span className="text-slate-500">(checking...)</span>}
            </span>
          }
        >
          <div className="flex justify-end mb-2">
            <button
              onClick={s.installDeps}
              disabled={s.installingDeps || s.packages.length === 0 || s.allDepsInstalled}
              className={`border-none text-white py-1 px-3 rounded text-xs disabled:cursor-default ${
                s.installingDeps || s.allDepsInstalled
                  ? 'bg-slate-700'
                  : 'bg-cyan-600 hover:bg-cyan-500 cursor-pointer'
              }`}
            >
              {s.installingDeps ? 'Installing...' : 'Install All'}
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {s.packages.length === 0 ? (
              <span className="text-xs text-slate-600">No packages specified</span>
            ) : (
              s.packages.map((pkg) => {
                const ok = s.depsStatus[pkg]?.installed
                return (
                  <div
                    key={pkg}
                    className={`flex items-center justify-between py-1.5 px-2 rounded ${
                      ok
                        ? 'bg-green-500/15 border border-green-500/40'
                        : 'bg-red-500/15 border border-red-500/40'
                    }`}
                  >
                    <span className={`text-xs ${ok ? 'text-green-300' : 'text-red-300'}`}>
                      {pkg}
                    </span>
                    <span className={`text-xs ${ok ? 'text-green-400' : 'text-red-400'}`}>
                      {ok ? '✓' : '✗'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </Section>
      )}

      {/* Start / Stop */}
      <div className="flex gap-2">
        {!s.serverRunning ? (
          <button
            onClick={s.startServer}
            disabled={s.connecting || !s.selectedVenv || !s.allDepsInstalled}
            className={`flex-1 border-none text-white p-3 rounded text-sm font-medium transition-colors ${
              s.connecting || !s.selectedVenv || !s.allDepsInstalled
                ? 'bg-slate-700 cursor-not-allowed opacity-50'
                : `${accentColor} cursor-pointer`
            }`}
          >
            {s.connecting ? 'Starting...' : launchLabel}
          </button>
        ) : (
          <button
            onClick={s.stopServer}
            className="flex-1 bg-red-600 border-none text-white p-3 rounded cursor-pointer text-sm font-medium hover:bg-red-500 transition-colors"
          >
            Stop Server
          </button>
        )}
      </div>

      {/* Logs */}
      <Logs logs={s.logs} />
    </Panel>
  )
}

// ── Sub-components ──────────────────────────────────────────

const Section: React.FC<{
  label?: React.ReactNode
  children: React.ReactNode
}> = ({ label, children }) => (
  <div className="bg-[rgba(30,30,50,0.8)] rounded-lg p-4 border border-slate-700">
    {label && <label className="text-slate-400 block mb-2 text-sm font-medium">{label}</label>}
    {children}
  </div>
)

const Logs: React.FC<{ logs: string[] }> = ({ logs }) => (
  <div className="bg-[rgba(30,30,50,0.8)] rounded-lg p-4 border border-slate-700">
    <h3 className="text-cyan-400 mb-3 text-sm font-medium">Logs</h3>
    <div className="bg-slate-950 p-2 rounded max-h-[150px] overflow-y-auto text-xs font-mono">
      {logs.length === 0 ? (
        <div className="text-slate-600">No logs yet</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className={log.includes('ERROR') ? 'text-red-400' : 'text-slate-500'}>
            {log}
          </div>
        ))
      )}
    </div>
  </div>
)
```
