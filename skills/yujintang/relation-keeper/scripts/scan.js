#!/usr/bin/env node
/**
 * 社交导航 扫描脚本
 * 每 15 分钟由 OpenClaw Cron 调用，扫描 portraits 与 future_events，
 * 输出需要提醒的内容。已发送的提醒会记录，避免重复。
 */
const { loadJson, saveJson } = require('./utils.js');

function nowLocal() {
  return new Date();
}

function parseMmdd(s) {
  if (!s || typeof s !== 'string') return null;
  s = s.trim();
  if (s.length === 5 && s[2] === '-') {
    const m = parseInt(s.slice(0, 2), 10);
    const d = parseInt(s.slice(3, 5), 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return [m, d];
  }
  if (s.length >= 10 && s[4] === '-' && s[7] === '-') {
    const m = parseInt(s.slice(5, 7), 10);
    const d = parseInt(s.slice(8, 10), 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return [m, d];
  }
  return null;
}

function loadSentLog() {
  const data = loadJson('reminders_sent');
  return data.sent || {};
}

function markSent(key) {
  const data = loadJson('reminders_sent');
  const sent = data.sent || {};
  sent[key] = nowLocal().toISOString().slice(0, 16);
  const entries = Object.entries(sent).slice(-500);
  data.sent = Object.fromEntries(entries);
  saveJson('reminders_sent', data);
}

function scanBirthdays() {
  const messages = [];
  const now = nowLocal();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const portraits = loadJson('portraits').people || {};
  const future = loadJson('future_events').events || [];
  const sent = loadSentLog();

  const items = [];

  for (const [name, p] of Object.entries(portraits)) {
    const b = p.birthday || p.birthDate;
    if (!b) continue;
    const md = parseMmdd(b);
    if (md) items.push([`${name}生日`, b, `birthday-${name}`]);
  }

  for (const evt of future) {
    if (evt.reminderRule !== 'birthday') continue;
    const summary = evt.summary || '纪念日';
    const dateStr = evt.date || '';
    const md = parseMmdd(dateStr);
    if (md) items.push([summary, dateStr.length >= 10 ? dateStr.slice(5, 10) : dateStr, `fevt-${evt.id || '?'}`]);
  }

  const slots = [[0, '今天'], [3, '3 天后'], [7, '7 天后']];
  for (const [offset, label] of slots) {
    const check = new Date(today);
    check.setDate(check.getDate() + offset);
    for (const [summary, mmdd, keyPrefix] of items) {
      const md = parseMmdd(mmdd);
      if (!md || check.getMonth() + 1 !== md[0] || check.getDate() !== md[1]) continue;
      const key = `${keyPrefix}-${label}-${check.getFullYear()}`;
      if (sent[key]) continue;
      messages.push(`🎂 ${label}是 ${summary}，记得准备祝福/礼物哦。`);
      markSent(key);
    }
  }

  return messages;
}

function scanAppointments() {
  const messages = [];
  const now = nowLocal();
  const future = loadJson('future_events').events || [];
  const sent = loadSentLog();

  for (const evt of future) {
    if (evt.reminderRule !== 'appointment') continue;
    const dateStr = evt.date || '';
    const timeStr = evt.time;
    const summary = evt.summary || '约会';
    const pid = evt.id || '?';

    let dt;
    try {
      if (timeStr) {
        dt = new Date(`${dateStr}T${timeStr}:00`);
      } else {
        dt = new Date(dateStr);
        dt.setHours(18, 30, 0, 0);
      }
    } catch {
      continue;
    }

    const t2h = new Date(dt.getTime() - 2 * 60 * 60 * 1000);
    const window = 20 * 60 * 1000;
    if (now >= t2h && now <= t2h.getTime() + window) {
      const key = `appt-${pid}-2h`;
      if (!sent[key]) {
        messages.push(`⏰ 2 小时后：${summary}，记得出发哦。`);
        markSent(key);
      }
    }

    if (now >= dt && now <= dt.getTime() + window) {
      const key = `appt-${pid}-at`;
      if (!sent[key]) {
        messages.push(`⏰ 现在：${summary}`);
        markSent(key);
      }
    }
  }

  return messages;
}

function main() {
  const messages = [...scanBirthdays(), ...scanAppointments()];
  messages.forEach((m) => console.log(m));
}

main();
