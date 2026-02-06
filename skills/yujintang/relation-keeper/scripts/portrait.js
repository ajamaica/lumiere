#!/usr/bin/env node
const { getDataDir, loadJson, saveJson } = require('./utils.js');

function loadPortraits() {
  const data = loadJson('portraits');
  return data.people || {};
}

function savePortraits(people) {
  saveJson('portraits', { people });
}

function getPortrait(name) {
  const people = loadPortraits();
  if (people[name]) return people[name];
  for (const p of Object.values(people)) {
    if ((p.aliases || []).includes(name)) return p;
  }
  return null;
}

function upsertPortrait(name, opts = {}) {
  const people = loadPortraits();
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  if (!people[name]) {
    people[name] = {
      name,
      aliases: [],
      notes: '',
      updatedAt: now,
      facts: [],
    };
  }

  const p = people[name];
  p.updatedAt = now;

  if (opts.gender != null) p.gender = opts.gender;
  if (opts.birthday != null) p.birthday = opts.birthday;
  if (opts.birthYear != null) p.birthYear = opts.birthYear;
  if (opts.birthDate != null) p.birthDate = opts.birthDate;
  if (opts.address != null) p.address = opts.address;
  if (opts.phone != null) p.phone = opts.phone;
  if (opts.notes != null) p.notes = opts.notes;
  if (opts.factKey && opts.factValue) {
    const facts = (p.facts || []).filter((f) => f.key !== opts.factKey);
    facts.push({
      key: opts.factKey,
      value: opts.factValue,
      source: opts.factSource || '',
      at: new Date().toISOString().slice(0, 10),
    });
    p.facts = facts.slice(-20);
  }

  savePortraits(people);
  return p;
}

function listPortraits() {
  return Object.values(loadPortraits());
}

function parseArgs() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      options[key] = args[i + 1] || true;
      if (args[i + 1] && !args[i + 1].startsWith('--')) i++;
    }
  }
  return { cmd, args: args.slice(1), options };
}

function main() {
  const { cmd, args, options } = parseArgs();

  if (cmd === 'get') {
    const name = args.find((a) => !a.startsWith('--')) || options.name;
    if (!name) {
      console.error('用法: node portrait.js get <姓名>');
      process.exit(1);
    }
    const p = getPortrait(name);
    if (p) {
      console.log(JSON.stringify(p, null, 2));
    } else {
      console.error(`未找到人物: ${name}`);
      process.exit(1);
    }
  } else if (cmd === 'list') {
    for (const p of listPortraits()) {
      console.log(`- ${p.name} (更新: ${p.updatedAt || ''})`);
    }
  } else if (cmd === 'upsert') {
    const name = args.find((a) => !a.startsWith('--')) || options.name;
    if (!name) {
      console.error('用法: node portrait.js upsert <姓名> [--gender 男] [--birthday MM-DD] [--birthYear 1990] [--birthDate 1990-03-15] [--address "地址"] [--fact-key X --fact-value Y]');
      process.exit(1);
    }
    const p = upsertPortrait(name, {
      gender: options.gender,
      birthday: options.birthday,
      birthYear: options.birthYear != null ? parseInt(options.birthYear, 10) : undefined,
      birthDate: options.birthDate,
      address: options.address,
      phone: options.phone,
      notes: options.notes,
      factKey: options.factKey,
      factValue: options.factValue,
      factSource: options.factSource,
    });
    console.log(JSON.stringify(p, null, 2));
  } else {
    console.error('用法: node portrait.js <get|list|upsert> [选项]');
    process.exit(1);
  }
}

if (require.main === module) main();
