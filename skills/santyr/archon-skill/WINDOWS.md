# Archon on Windows

The Archon skill can be used on Windows with some platform-specific considerations.

## Recommended Setup: WSL2

The easiest path for full functionality:

1. **Install WSL2** (Ubuntu recommended)
2. **Install Docker Desktop** with WSL2 backend enabled
3. **Install Node.js** in WSL2: `sudo apt install nodejs npm`
4. Use the skill exactly as documented in SKILL.md

**Advantages:**

- Full Linux compatibility
- All helper scripts work unchanged
- Best performance
- Native Docker integration

## Alternative: Git Bash

If you prefer native Windows:

1. **Install Git for Windows** (includes Git Bash)
2. **Install Docker Desktop**
3. **Install Node.js** (Windows installer)
4. Use Git Bash terminal for running scripts

**Advantages:**

- No virtualization overhead
- Native Windows file system
- Familiar Windows environment

**Limitations:**

- Some path handling differences
- May need to adapt Docker volume mounts

## Alternative: PowerShell

For pure Windows PowerShell users:

**Public Network API** - Works out of box:

```powershell
Invoke-RestMethod "https://archon.technology/api/v1/did/did:cid:..."
```

**Keymaster CLI** - Works via npx:

```powershell
cd $env:USERPROFILE\.config\archon
npx @didcid/keymaster list-ids
npx @didcid/keymaster list-credentials
```

**Helper Scripts** - Need PowerShell versions:

```powershell
# Example: archon-list-ids.ps1
$env:ARCHON_CONFIG_DIR = "$env:USERPROFILE\.config\archon"
$env:ARCHON_PASSPHRASE = "your-passphrase"
Set-Location $env:ARCHON_CONFIG_DIR
npx @didcid/keymaster list-ids
```

## Environment Variables

**Git Bash / WSL2:**

```bash
export ARCHON_CONFIG_DIR="$HOME/.config/archon"
export ARCHON_PASSPHRASE="your-passphrase"
```

**PowerShell:**

```powershell
$env:ARCHON_CONFIG_DIR = "$env:USERPROFILE\.config\archon"
$env:ARCHON_PASSPHRASE = "your-passphrase"
```

**Command Prompt:**

```cmd
set ARCHON_CONFIG_DIR=%USERPROFILE%\.config\archon
set ARCHON_PASSPHRASE=your-passphrase
```

## Docker Compose on Windows

**With Docker Desktop:**

- Use `docker compose` (no snap prefix)
- Paths in compose files should use `/` not `\`
- Volume mounts may need Windows path format

**Example:**

```bash
cd ~/archon  # or C:\Users\YourName\archon
docker compose up -d
```

## Path Handling

**Unix-style (WSL2/Git Bash):**

```bash
~/.config/archon/wallet.json
~/archon/docker-compose.yml
```

**Windows-style (PowerShell/CMD):**

```powershell
$env:USERPROFILE\.config\archon\wallet.json
C:\Users\YourName\archon\docker-compose.yml
```

## Checksums and File Stats

**Git Bash:**

- `sha256sum` available (GNU tools included)
- `stat -c%s` works (GNU stat)

**PowerShell:**

```powershell
# Checksum
(Get-FileHash -Algorithm SHA256 file.txt).Hash.ToLower()

# File size
(Get-Item file.txt).Length
```

## Troubleshooting

**"npx: command not found"**

- Install Node.js (includes npm/npx)
- Make sure Node.js bin directory is in PATH

**"docker: command not found"**

- Install Docker Desktop
- Restart terminal after installation
- Check Docker Desktop is running

**"Permission denied" on scripts**

- Git Bash: `chmod +x script.sh`
- WSL2: Same as Linux
- PowerShell: Run as Administrator if needed

**Path errors**

- Use forward slashes `/` in Git Bash/WSL2
- Use backslashes `\` in PowerShell/CMD
- Or use `$env:USERPROFILE` which handles both

## Best Practice for Windows AI Agents

**For full automation:**

1. Use WSL2 (best compatibility)
2. Store config in `~/.config/archon` (Linux-style paths)
3. Run Archon node in WSL2 Docker
4. Scripts work unchanged

**For lightweight operations:**

1. Use keymaster CLI via npx (works everywhere)
2. Use public network API for read-only
3. No local node needed

**For integration with Windows tools:**

1. Use PowerShell scripts
2. Adapt helper scripts as needed
3. Document platform-specific modifications

---

**Bottom line:** Archon works on Windows, but WSL2 provides the smoothest experience for AI agents that need full local node capabilities. For read-only operations, any Windows environment works fine.
