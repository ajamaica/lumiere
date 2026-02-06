#!/usr/bin/env node
import { hostexRequest, assertIsoDate } from './hostex-client.mjs';

function arg(name, def = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return def;
  return process.argv[idx + 1];
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`Hostex read-only CLI

Commands:
  list-properties [--offset N] [--limit N] [--id ID]
  list-room-types --offset N --limit N
  list-reservations [--offset N] [--limit N] [--reservation-code CODE] [--property-id ID] [--status wait_accept|wait_pay|accepted|cancelled|denied|timeout] [--channel-type CHANNEL] [--order-by booked_at|check_in_date|check_out_date|cancelled_at] [--start-check-in-date YYYY-MM-DD] [--end-check-in-date YYYY-MM-DD] [--start-check-out-date YYYY-MM-DD] [--end-check-out-date YYYY-MM-DD]
  get-availabilities --start YYYY-MM-DD --end YYYY-MM-DD [--property-id ID]
  list-conversations [--offset N] [--limit N] [--status STATUS]
  get-conversation --conversation-id ID
  list-reviews [--offset N] [--limit N]

Env:
  HOSTEX_ACCESS_TOKEN (required)
  HOSTEX_BASE_URL (optional, default https://api.hostex.io/v3)
`);
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd || hasFlag('help')) {
    usage();
    process.exit(cmd ? 0 : 1);
  }

  const offset = Number(arg('offset', '0'));
  const limit = Number(arg('limit', '20'));

  if (cmd === 'list-properties') {
    const id = arg('id');
    const { data } = await hostexRequest({ method: 'GET', path: '/properties', query: { offset, limit, id } });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === 'list-room-types') {
    const { data } = await hostexRequest({ method: 'GET', path: '/room_types', query: { offset, limit } });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === 'list-reservations') {
    const reservation_code = arg('reservation-code');
    const property_id = arg('property-id');
    const status = arg('status');
    const channel_type = arg('channel-type');
    const order_by = arg('order-by');

    const start_check_in_date = arg('start-check-in-date');
    const end_check_in_date = arg('end-check-in-date');
    const start_check_out_date = arg('start-check-out-date');
    const end_check_out_date = arg('end-check-out-date');

    if (start_check_in_date) assertIsoDate(start_check_in_date, 'start-check-in-date');
    if (end_check_in_date) assertIsoDate(end_check_in_date, 'end-check-in-date');
    if (start_check_out_date) assertIsoDate(start_check_out_date, 'start-check-out-date');
    if (end_check_out_date) assertIsoDate(end_check_out_date, 'end-check-out-date');

    const { data } = await hostexRequest({
      method: 'GET',
      path: '/reservations',
      query: {
        offset,
        limit,
        reservation_code,
        property_id,
        status,
        channel_type,
        order_by,
        start_check_in_date,
        end_check_in_date,
        start_check_out_date,
        end_check_out_date,
      },
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === 'get-availabilities') {
    const start = arg('start');
    const end = arg('end');
    if (!start || !end) throw new Error('get-availabilities requires --start and --end');
    assertIsoDate(start, 'start');
    assertIsoDate(end, 'end');
    const property_id = arg('property-id');

    const { data } = await hostexRequest({
      method: 'GET',
      path: '/availabilities',
      query: { start_date: start, end_date: end, property_id },
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === 'list-conversations') {
    const status = arg('status');
    const { data } = await hostexRequest({ method: 'GET', path: '/conversations', query: { offset, limit, status } });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === 'get-conversation') {
    const conversation_id = arg('conversation-id');
    if (!conversation_id) throw new Error('get-conversation requires --conversation-id');
    const { data } = await hostexRequest({ method: 'GET', path: `/conversations/${conversation_id}` });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (cmd === 'list-reviews') {
    const { data } = await hostexRequest({ method: 'GET', path: '/reviews', query: { offset, limit } });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
