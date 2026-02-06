#!/usr/bin/env node
const { loadJson, saveJson, generateId } = require('./utils.js');

function loadPastEvents() {
  const data = loadJson('past_events');
  return data.events || [];
}

function loadFutureEvents() {
  const data = loadJson('future_events');
  return data.events || [];
}

function addPastEvent(personIds, eventType, date, summary, details = '') {
  const evt = {
    id: generateId('pevt'),
    personIds,
    type: eventType,
    date,
    summary,
    details,
    createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
  const data = loadJson('past_events');
  const events = data.events || [];
  events.push(evt);
  saveJson('past_events', { events });
  return evt;
}

function addFutureEvent(personIds, eventType, date, time, summary, reminderRule = 'appointment') {
  const evt = {
    id: generateId('fevt'),
    personIds,
    type: eventType,
    date,
    time: time || null,
    summary,
    reminderRule,
    createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
  const data = loadJson('future_events');
  const events = data.events || [];
  events.push(evt);
  saveJson('future_events', { events });
  return evt;
}

function queryPastByPerson(personName) {
  return loadPastEvents().filter((e) => (e.personIds || []).includes(personName));
}

function queryFuture(days = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + days);

  return loadFutureEvents()
    .filter((e) => {
      try {
        const d = new Date(e.date);
        return d >= today && d <= end;
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      options[key] = args[i + 1] || true;
      if (args[i + 1] && !args[i + 1].startsWith('--')) i++;
    }
  }
  return { cmd, args: args.slice(1), options };
}

function main() {
  const { cmd, options } = parseArgs();
  const persons = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

  if (cmd === 'past-add') {
    const evt = addPastEvent(
      persons(options.persons),
      options.type,
      options.date,
      options.summary,
      options.details || ''
    );
    console.log(JSON.stringify(evt, null, 2));
  } else if (cmd === 'future-add') {
    const evt = addFutureEvent(
      persons(options.persons),
      options.type,
      options.date,
      options.time,
      options.summary,
      options.rule || 'appointment'
    );
    console.log(JSON.stringify(evt, null, 2));
  } else if (cmd === 'past-query') {
    const person = options.person || process.argv[3];
    if (!person) {
      console.error('用法: node events.js past-query <姓名>');
      process.exit(1);
    }
    queryPastByPerson(person).forEach((e) => console.log(JSON.stringify(e)));
  } else if (cmd === 'future-query') {
    const days = parseInt(options.days || '14', 10);
    queryFuture(days).forEach((e) => console.log(JSON.stringify(e)));
  } else {
    console.error('用法: node events.js <past-add|future-add|past-query|future-query> [选项]');
    process.exit(1);
  }
}

if (require.main === module) main();
