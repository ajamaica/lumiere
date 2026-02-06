#!/usr/bin/env node
/**
 * 安装脚本：创建数据目录、初始化数据文件、配置定时扫描任务
 * 在 skill 安装时自动运行（通过 package.json postinstall）
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { initDataDir } = require('./utils.js');

const skillDir = path.resolve(__dirname, '..');

// 创建默认数据目录与空数据文件
const dataDir = initDataDir();
console.log('✓ 数据目录已初始化:', dataDir);
const tz = process.env.RELATION_KEEPER_TZ || 'Asia/Shanghai';

const channel = process.env.RELATION_KEEPER_CHANNEL;
const message = `执行以下命令并发送其输出作为提醒：cd ${skillDir} && node scripts/scan.js`;

const args = [
  'cron', 'add',
  '--name', 'Relation Keeper 扫描',
  '--every', '900000',
  '--tz', tz,
];

if (channel && channel.includes(':')) {
  const [ch, to] = channel.split(':', 2);
  args.push('--session', 'isolated', '--message', message, '--announce', '--channel', ch, '--to', to);
} else {
  args.push('--session', 'main', '--system-event', message, '--wake', 'now');
}

try {
  const result = spawnSync('openclaw', args, { stdio: 'inherit' });

  if (result.status !== 0) {
    throw new Error(`openclaw 退出码: ${result.status}`);
  }
  console.log('✓ 定时任务已配置：每 15 分钟扫描一次关系提醒');
  console.log(channel ? '  提醒将推送到配置的渠道' : '  提醒将推送到当前聊天');
} catch (err) {
  console.warn('⚠ 配置定时任务失败（可稍后手动执行 npm run install:cron）');
  console.warn('  请确保 OpenClaw 已安装且 Gateway 已启动');
  // 不 exit(1)，避免 npm install 整体失败
}
