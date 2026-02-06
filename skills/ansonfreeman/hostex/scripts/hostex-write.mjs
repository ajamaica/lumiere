#!/usr/bin/env node
import { hostexRequest, assertIsoDate, requireWritesEnabled } from './hostex-client.mjs';

function arg(name, def = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return def;
  return process.argv[idx + 1];
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`Hostex write CLI (guarded)

Requires:
  HOSTEX_ACCESS_TOKEN
  HOSTEX_ALLOW_WRITES=true

Commands:
  send-message --conversation-id ID --text TEXT [--confirm] [--dry-run]
  update-listing-prices --channel-type CHANNEL --listing-id ID [--start YYYY-MM-DD --end YYYY-MM-DD --price NUMBER | --prices "START..END:PRICE,START..END:PRICE"] [--confirm] [--dry-run]
  create-reservation --property-id INT --custom-channel-id INT --check-in-date YYYY-MM-DD --check-out-date YYYY-MM-DD --guest-name TEXT --currency CODE --rate-amount INT --commission-amount INT --received-amount INT --income-method-id INT [--number-of-guests INT] [--email EMAIL] [--mobile PHONE] [--remarks TEXT] [--confirm] [--dry-run]
  update-availabilities --property-ids "ID,ID" --available true|false [--start-date YYYY-MM-DD --end-date YYYY-MM-DD | --dates "YYYY-MM-DD,YYYY-MM-DD"] [--confirm] [--dry-run]

Safety:
  - Without --confirm, the script prints the intended change and exits.
`);
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd || hasFlag('help')) {
    usage();
    process.exit(cmd ? 0 : 1);
  }

  requireWritesEnabled();

  const confirm = hasFlag('confirm');
  const dryRun = hasFlag('dry-run');

  if (cmd === 'send-message') {
    const conversation_id = arg('conversation-id');
    const text = arg('text');
    if (!conversation_id || !text) throw new Error('send-message requires --conversation-id and --text');

    const plan = { conversation_id, text };
    if (!confirm || dryRun) {
      console.log(JSON.stringify({ action: cmd, plan, confirmRequired: !confirm }, null, 2));
      if (!confirm) return;
    }

    const { data } = await hostexRequest({ method: 'POST', path: `/conversations/${conversation_id}`, json: { text } });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === 'update-listing-prices') {
    const channel_type = arg('channel-type');
    const listing_id = arg('listing-id');
    const start = arg('start');
    const end = arg('end');
    const price = arg('price');
    const pricesRaw = arg('prices');

    if (!channel_type || !listing_id) {
      throw new Error('update-listing-prices requires --channel-type and --listing-id');
    }

    let prices;

    // Mode 1: single range via --start/--end/--price (backwards compatible)
    if (start || end || price) {
      if (!start || !end || !price) {
        throw new Error('update-listing-prices: when using single-range mode, --start, --end, and --price are required');
      }
      assertIsoDate(start, 'start');
      assertIsoDate(end, 'end');
      prices = [{ start_date: start, end_date: end, price: Number(price) }];
    }

    // Mode 2: multi-range via --prices "YYYY-MM-DD..YYYY-MM-DD:PRICE,YYYY-MM-DD..YYYY-MM-DD:PRICE"
    if (pricesRaw) {
      if (prices) {
        throw new Error('update-listing-prices: provide either --start/--end/--price OR --prices, not both');
      }
      const parts = pricesRaw.split(',').map(s => s.trim()).filter(Boolean);
      if (!parts.length) throw new Error('update-listing-prices: --prices provided but empty');
      prices = parts.map((p) => {
        const [range, priceStr] = p.split(':').map(s => s.trim());
        if (!range || !priceStr) throw new Error(`update-listing-prices: invalid entry: ${p} (expected START..END:PRICE)`);
        const [s, e] = range.split('..').map(s => s.trim());
        if (!s || !e) throw new Error(`update-listing-prices: invalid range: ${range} (expected START..END)`);
        assertIsoDate(s, 'start_date');
        assertIsoDate(e, 'end_date');
        const pr = Number(priceStr);
        if (!Number.isFinite(pr)) throw new Error(`update-listing-prices: invalid price: ${priceStr}`);
        return { start_date: s, end_date: e, price: pr };
      });
    }

    if (!prices) {
      throw new Error('update-listing-prices: provide either --start/--end/--price OR --prices');
    }

    const plan = { channel_type, listing_id, prices };

    if (!confirm || dryRun) {
      console.log(JSON.stringify({ action: cmd, plan, confirmRequired: !confirm }, null, 2));
      if (!confirm) return;
    }

    const { data } = await hostexRequest({
      method: 'POST',
      path: '/listings/prices',
      json: plan,
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === 'create-reservation') {
    const property_id = arg('property-id');
    const custom_channel_id = arg('custom-channel-id');
    const check_in_date = arg('check-in-date');
    const check_out_date = arg('check-out-date');
    const guest_name = arg('guest-name');
    const currency = arg('currency');
    const rate_amount = arg('rate-amount');
    const commission_amount = arg('commission-amount');
    const received_amount = arg('received-amount');
    const income_method_id = arg('income-method-id');

    if (!property_id || !custom_channel_id || !check_in_date || !check_out_date || !guest_name || !currency || !rate_amount || !commission_amount || !received_amount || !income_method_id) {
      throw new Error('create-reservation requires --property-id --custom-channel-id --check-in-date --check-out-date --guest-name --currency --rate-amount --commission-amount --received-amount --income-method-id');
    }

    assertIsoDate(check_in_date, 'check-in-date');
    assertIsoDate(check_out_date, 'check-out-date');

    const number_of_guests = arg('number-of-guests');
    const email = arg('email');
    const mobile = arg('mobile');
    const remarks = arg('remarks');

    const plan = {
      property_id: Number(property_id),
      custom_channel_id: Number(custom_channel_id),
      check_in_date,
      check_out_date,
      guest_name,
      currency,
      rate_amount: Number(rate_amount),
      commission_amount: Number(commission_amount),
      received_amount: Number(received_amount),
      income_method_id: Number(income_method_id),
      ...(number_of_guests ? { number_of_guests: Number(number_of_guests) } : {}),
      ...(email ? { email } : {}),
      ...(mobile ? { mobile } : {}),
      ...(remarks ? { remarks } : {}),
    };

    if (!confirm || dryRun) {
      console.log(JSON.stringify({ action: cmd, plan, confirmRequired: !confirm }, null, 2));
      if (!confirm) return;
    }

    const { data } = await hostexRequest({ method: 'POST', path: '/reservations', json: plan });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === 'update-availabilities') {
    const propertyIdsRaw = arg('property-ids');
    const availableRaw = arg('available');

    if (!propertyIdsRaw || availableRaw === undefined) {
      throw new Error('update-availabilities requires --property-ids and --available');
    }

    const property_ids = propertyIdsRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(n => Number(n));

    if (!property_ids.length || property_ids.some(n => !Number.isFinite(n))) {
      throw new Error('update-availabilities: invalid --property-ids (expected comma-separated integers)');
    }

    const available = ['1','true','yes','on'].includes(String(availableRaw).toLowerCase())
      ? true
      : ['0','false','no','off'].includes(String(availableRaw).toLowerCase())
        ? false
        : null;

    if (available === null) {
      throw new Error('update-availabilities: invalid --available (expected true/false)');
    }

    const start_date = arg('start-date');
    const end_date = arg('end-date');
    const datesRaw = arg('dates');

    if (start_date || end_date) {
      if (!start_date || !end_date) {
        throw new Error('update-availabilities: when using a range, both --start-date and --end-date are required');
      }
      assertIsoDate(start_date, 'start-date');
      assertIsoDate(end_date, 'end-date');
    }

    let dates;
    if (datesRaw) {
      dates = datesRaw.split(',').map(s => s.trim()).filter(Boolean);
      if (!dates.length) throw new Error('update-availabilities: --dates provided but empty');
      for (const d of dates) assertIsoDate(d, 'dates');
    }

    if (!(start_date && end_date) && !dates) {
      throw new Error('update-availabilities: provide either --start-date/--end-date or --dates');
    }

    const plan = {
      property_ids,
      available,
      ...(start_date && end_date ? { start_date, end_date } : {}),
      ...(dates ? { dates } : {}),
    };

    if (!confirm || dryRun) {
      console.log(JSON.stringify({ action: cmd, plan, confirmRequired: !confirm }, null, 2));
      if (!confirm) return;
    }

    const { data } = await hostexRequest({ method: 'POST', path: '/availabilities', json: plan });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
