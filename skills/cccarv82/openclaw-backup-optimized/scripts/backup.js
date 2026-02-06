#!/usr/bin/env node
const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const crypto = require('crypto')
const { spawnSync } = require('child_process')
const tar = require('tar')
const minimatch = require('minimatch')

const HOME = process.env.HOME || process.env.USERPROFILE || '.'
const OPENCLAW_HOME = process.env.OPENCLAW_HOME || path.join(HOME, '.openclaw')
const OPENCLAW_BACKUP_DIR = process.env.OPENCLAW_BACKUP_DIR || path.join(HOME, '.openclaw-backup')
const BACKUP_REPO_URL = process.env.BACKUP_REPO_URL || ''
const BACKUP_CHANNEL_ID = process.env.BACKUP_CHANNEL_ID || ''
const BACKUP_TZ = process.env.BACKUP_TZ || 'America/Sao_Paulo'
const BACKUP_MAX_HISTORY = Number(process.env.BACKUP_MAX_HISTORY || 7)
const BACKUP_SPLIT_SIZE_MB = Number(process.env.BACKUP_SPLIT_SIZE_MB || 90)

const EXCLUDES = [
  '.openclaw-backup/**',
  'workspace/**',
  'media/inbound/**',
  'agents/main/sessions/*.jsonl.lock',
  'agents/main/sessions/*.jsonl.deleted.*',
]

const formatDateTime = (tz) => {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}`
}

const formatShort = (tz) => {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${map.year}${map.month}${map.day}-${map.hour}${map.minute}`
}

const toPosix = (p) => p.split(path.sep).join('/')
const isExcluded = (rel) => {
  const posix = toPosix(rel)
  return EXCLUDES.some((pattern) => minimatch(posix, pattern, { dot: true }))
}

const notify = (title, body) => {
  const payload = `**${title}**\n${body}`
  console.log(payload)
  if (!BACKUP_CHANNEL_ID) return
  const res = spawnSync(
    'openclaw',
    [
      'message',
      'send',
      '--channel',
      'discord',
      '--target',
      BACKUP_CHANNEL_ID,
      '--message',
      payload,
    ],
    {
      stdio: 'ignore',
    },
  )
  if (res.error) {
    console.error('notify error:', res.error.message)
  }
}

const onError = (nowTs) => {
  notify('❌ Backup failed', `Time: ${nowTs} (${BACKUP_TZ})\nCheck server logs for details.`)
}

const ensureDir = async (dir) => {
  await fsp.mkdir(dir, { recursive: true })
}

const moveHistoryOut = async (dest) => {
  const history = path.join(dest, 'history')
  try {
    await fsp.access(history)
  } catch {
    return null
  }
  const tmp = path.join(dest, `._history_${Date.now()}`)
  await fsp.rename(history, tmp)
  return tmp
}

const restoreHistory = async (dest, tmp) => {
  if (!tmp) return
  const history = path.join(dest, 'history')
  await fsp.rename(tmp, history)
}

const syncDir = async (src, dest) => {
  const historyTmp = await moveHistoryOut(dest).catch(() => null)
  await fsp.rm(dest, { recursive: true, force: true })
  await ensureDir(dest)
  if (historyTmp) await restoreHistory(dest, historyTmp)

  const walk = async (current) => {
    const entries = await fsp.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      const rel = path.relative(src, full)
      if (isExcluded(rel)) continue
      const target = path.join(dest, rel)
      if (entry.isDirectory()) {
        await ensureDir(target)
        await walk(full)
      } else if (entry.isFile()) {
        await ensureDir(path.dirname(target))
        await fsp.copyFile(full, target)
      }
    }
  }

  await walk(src)
}

const listWorkspaceEntries = async (dir) => {
  const entries = []
  const walk = async (current) => {
    const items = await fsp.readdir(current, { withFileTypes: true })
    for (const item of items) {
      const full = path.join(current, item.name)
      const rel = path.relative(dir, full)
      if (item.isDirectory()) {
        await walk(full)
      } else if (item.isFile()) {
        const stat = await fsp.stat(full)
        entries.push(`${toPosix(rel)}|${stat.size}|${stat.mtimeMs}`)
      }
    }
  }
  await walk(dir)
  return entries
}

const hashWorkspace = async (workspaceDir) => {
  const entries = await listWorkspaceEntries(workspaceDir)
  entries.sort()
  const hash = crypto.createHash('sha256')
  for (const line of entries) hash.update(line + '\n')
  return hash.digest('hex')
}

const splitFile = async (filePath, outPrefix, splitSizeBytes) => {
  const hash = crypto.createHash('sha256')
  const read = fs.createReadStream(filePath)
  let partIndex = 0
  let currentSize = 0
  let out = fs.createWriteStream(`${outPrefix}${String(partIndex).padStart(3, '0')}`)

  await new Promise((resolve, reject) => {
    read.on('data', (chunk) => {
      hash.update(chunk)
      let offset = 0
      while (offset < chunk.length) {
        const remaining = splitSizeBytes - currentSize
        const slice = chunk.subarray(offset, offset + remaining)
        out.write(slice)
        currentSize += slice.length
        offset += slice.length
        if (currentSize >= splitSizeBytes) {
          out.end()
          partIndex += 1
          currentSize = 0
          out = fs.createWriteStream(`${outPrefix}${String(partIndex).padStart(3, '0')}`)
        }
      }
    })
    read.on('error', reject)
    read.on('end', () => {
      out.end()
      resolve()
    })
  })

  return hash.digest('hex')
}

const git = (args, cwd) => {
  const res = spawnSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf8' })
  if (res.error) throw res.error
  return res.stdout.trim()
}

const main = async () => {
  const nowTs = formatDateTime(BACKUP_TZ)
  const shortTs = formatShort(BACKUP_TZ)
  const isoTs = new Date().toISOString()

  try {
    await ensureDir(OPENCLAW_BACKUP_DIR)

    await syncDir(OPENCLAW_HOME, OPENCLAW_BACKUP_DIR)

    const workspaceDir = path.join(OPENCLAW_HOME, 'workspace')
    const workspaceHashFile = path.join(OPENCLAW_BACKUP_DIR, '.workspace.hash')
    const workspaceShaFile = path.join(OPENCLAW_BACKUP_DIR, '.workspace.tar.sha256')

    let prevHash = ''
    try {
      prevHash = (await fsp.readFile(workspaceHashFile, 'utf8')).trim()
    } catch {}

    let workspaceHash = ''
    let workspaceChanged = 0
    let tarSha256 = ''

    try {
      workspaceHash = await hashWorkspace(workspaceDir)
    } catch {}

    if (workspaceHash && workspaceHash !== prevHash) {
      workspaceChanged = 1
    }

    if (workspaceChanged) {
      const tarPath = path.join(OPENCLAW_BACKUP_DIR, 'workspace.tar.gz')
      const partPrefix = path.join(OPENCLAW_BACKUP_DIR, 'workspace.tar.gz.part.')

      const entries = await fsp.readdir(OPENCLAW_BACKUP_DIR)
      for (const entry of entries) {
        if (entry.startsWith('workspace.tar.gz.part.')) {
          await fsp.rm(path.join(OPENCLAW_BACKUP_DIR, entry), { force: true })
        }
      }
      await fsp.rm(tarPath, { force: true })

      await tar.c({ gzip: true, cwd: OPENCLAW_HOME, file: tarPath }, ['workspace'])

      const splitSize = BACKUP_SPLIT_SIZE_MB * 1024 * 1024
      tarSha256 = await splitFile(tarPath, partPrefix, splitSize)
      await fsp.rm(tarPath, { force: true })

      await fsp.writeFile(workspaceHashFile, workspaceHash)
      await fsp.writeFile(workspaceShaFile, tarSha256)
    }

    git(['init', '-q'], OPENCLAW_BACKUP_DIR)
    git(['branch', '-M', 'main'], OPENCLAW_BACKUP_DIR)

    git(['add', '-A'], OPENCLAW_BACKUP_DIR)

    const status = git(['status', '--porcelain'], OPENCLAW_BACKUP_DIR).split('\n').filter(Boolean)
    const added = status.filter((line) => line.startsWith('A ')).map((line) => line.slice(3))
    const modified = status.filter((line) => line.startsWith('M ')).map((line) => line.slice(3))
    const deleted = status.filter((line) => line.startsWith('D ')).map((line) => line.slice(3))

    const report = {
      timestamp: isoTs,
      timezone: BACKUP_TZ,
      counts: {
        added: added.length,
        modified: modified.length,
        deleted: deleted.length,
      },
      workspace: {
        changed: workspaceChanged,
        hash: workspaceHash,
        tarSha256,
      },
    }

    await fsp.writeFile(
      path.join(OPENCLAW_BACKUP_DIR, 'backup-report.json'),
      JSON.stringify(report, null, 2),
    )

    const comment =
      'Backup OK. Full snapshot (config + memory + workspace) to minimize recovery time. Excluded .jsonl.lock and .jsonl.deleted.* session files to reduce noise.'
    const phrase =
      'You are building something big — and I am here to keep the line steady with you.'

    git(['add', '-A'], OPENCLAW_BACKUP_DIR)
    try {
      git(['commit', '-m', `backup: ${nowTs}`], OPENCLAW_BACKUP_DIR)
    } catch {}

    const commitSha = git(['rev-parse', '--short', 'HEAD'], OPENCLAW_BACKUP_DIR) || 'unknown'

    try {
      git(['remote', 'remove', 'origin'], OPENCLAW_BACKUP_DIR)
    } catch {}

    if (BACKUP_REPO_URL) {
      git(['remote', 'add', 'origin', BACKUP_REPO_URL], OPENCLAW_BACKUP_DIR)
      git(['push', '-u', 'origin', 'main', '--force'], OPENCLAW_BACKUP_DIR)
    }

    const historyDir = path.join(OPENCLAW_BACKUP_DIR, 'history', shortTs)
    await ensureDir(historyDir)
    await fsp.copyFile(
      path.join(OPENCLAW_BACKUP_DIR, 'backup-report.json'),
      path.join(historyDir, 'backup-report.json'),
    )
    if (workspaceHash)
      await fsp.copyFile(
        path.join(OPENCLAW_BACKUP_DIR, '.workspace.hash'),
        path.join(historyDir, '.workspace.hash'),
      )
    if (tarSha256)
      await fsp.copyFile(
        path.join(OPENCLAW_BACKUP_DIR, '.workspace.tar.sha256'),
        path.join(historyDir, '.workspace.tar.sha256'),
      )

    const historyRoot = path.join(OPENCLAW_BACKUP_DIR, 'history')
    let historyEntries = []
    try {
      historyEntries = (await fsp.readdir(historyRoot)).map((name) => path.join(historyRoot, name))
    } catch {}
    const stats = await Promise.all(
      historyEntries.map(async (entry) => ({
        entry,
        stat: await fsp.stat(entry),
      })),
    )
    stats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
    const excess = stats.slice(BACKUP_MAX_HISTORY)
    for (const item of excess) {
      await fsp.rm(item.entry, { recursive: true, force: true })
    }

    let summary = `**Summary**\n• Time: ${nowTs} (${BACKUP_TZ})\n• Commit: ${commitSha}\n• Changes: +${added.length} ~${modified.length} -${deleted.length}\n• Workspace changed: ${workspaceChanged}`
    if (tarSha256) summary += `\n• Workspace tar SHA256: ${tarSha256}`

    const formatList = (label, items) => {
      if (!items.length) return ''
      const top = items.slice(0, 12)
      return `\n\n**${label} (top 12)**\n${top.map((item) => `• ${item}`).join('\n')}`
    }

    const changes = [
      formatList('Added', added),
      formatList('Modified', modified),
      formatList('Deleted', deleted),
    ].join('')

    const restoreNote = `\n\n**How to restore this backup**\n1) openclaw gateway stop\n2) Rename current OPENCLAW_HOME (e.g., mv ${OPENCLAW_HOME} ${OPENCLAW_HOME}-restore-${shortTs})\n3) git clone ${BACKUP_REPO_URL || '<repo>'} backup\n4) cd backup && git checkout ${commitSha}\n5) Create OPENCLAW_HOME and copy files back\n6) Merge workspace parts (cat workspace.tar.gz.part.* > workspace.tar.gz) and extract with tar\n7) openclaw gateway start\n\nNote: On Windows, use PowerShell (Move-Item/Copy-Item/tar.exe) for the steps above.`

    notify(
      '✅ Backup completed',
      `${summary}${changes}\n\n**Comment**\n${comment}\n\n**Phrase**\n${phrase}${restoreNote}`,
    )
  } catch (err) {
    onError(formatDateTime(BACKUP_TZ))
    console.error(err)
    process.exit(1)
  }
}

main()
