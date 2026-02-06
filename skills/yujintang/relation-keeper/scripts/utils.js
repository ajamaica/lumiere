const fs = require('fs');
const path = require('path');
const os = require('os');

function getDataDir() {
  const base = process.env.RELATION_KEEPER_DATA;
  if (base) {
    return path.resolve(base.replace(/^~/, os.homedir()));
  }
  // 默认使用当前 skill 下的 data 文件夹
  return path.resolve(__dirname, '..', 'data');
}

function getTz() {
  return process.env.RELATION_KEEPER_TZ || 'Asia/Shanghai';
}

function ensureDataDir() {
  const d = getDataDir();
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
  return d;
}

/** 初始化默认数据目录与空数据文件 */
function initDataDir() {
  const d = ensureDataDir();
  const defaults = {
    portraits: { people: {} },
    past_events: { events: [] },
    future_events: { events: [] },
    reminders_sent: { sent: {} },
  };
  for (const [name, data] of Object.entries(defaults)) {
    const filePath = path.join(d, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
  }
  return d;
}

function loadJson(name) {
  const filePath = path.join(getDataDir(), `${name}.json`);
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveJson(name, data) {
  ensureDataDir();
  const filePath = path.join(getDataDir(), `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId(prefix = 'evt') {
  return `${prefix}-${require('crypto').randomBytes(4).toString('hex')}`;
}

module.exports = {
  getDataDir,
  getTz,
  ensureDataDir,
  initDataDir,
  loadJson,
  saveJson,
  generateId,
};
