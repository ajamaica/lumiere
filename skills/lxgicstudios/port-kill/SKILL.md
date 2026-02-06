---
name: Port Kill - Process Killer by Port
description: Kill processes running on any port with one command. Cross-platform utility for developers. No more lsof grep awk xargs. Free CLI tool.
---

# Port Kill

Kill processes on a port with one command. Works on macOS, Linux, Windows.

## Installation

```bash
npm install -g @lxgicstudios/port-kill
```

## Commands

### Kill Process on Port

```bash
npx @lxgicstudios/port-kill 3000
npx @lxgicstudios/port-kill 8080
```

### Force Kill (SIGKILL)

```bash
npx @lxgicstudios/port-kill 3000 -f
```

### List Without Killing

```bash
npx @lxgicstudios/port-kill 3000 --list
```

### Check if Port is Used

```bash
npx @lxgicstudios/port-kill --check 3000
```

### Find Available Ports

```bash
npx @lxgicstudios/port-kill --find 3000
```

Returns next available ports starting from 3000.

## Options

| Option           | Description             |
| ---------------- | ----------------------- |
| `-f, --force`    | Force kill (SIGKILL)    |
| `-l, --list`     | List processes only     |
| `--check <port>` | Check if port is in use |
| `--find <port>`  | Find available ports    |

## Common Use Cases

**Kill stuck dev server:**

```bash
npx @lxgicstudios/port-kill 3000
```

**Check what's on port 8080:**

```bash
npx @lxgicstudios/port-kill 8080 --list
```

**Find next available port:**

```bash
npx @lxgicstudios/port-kill --find 3000
```

## Cross-Platform

- macOS: Uses `lsof`
- Linux: Uses `lsof` or `ss`
- Windows: Uses `netstat`

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/lxgicstudios/port-kill) · [Twitter](https://x.com/lxgicstudios)
