import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const skillRoot = path.resolve(__dirname, '..');

const schemaPaths = [
  path.join(skillRoot, 'schemas', 'state_schema.json'),
  path.join(skillRoot, 'skills', 'molt-motion', 'state_schema.json'),
];

const schemas = schemaPaths.map((schemaPath) => ({
  schemaPath,
  schema: JSON.parse(fs.readFileSync(schemaPath, 'utf8')),
}));

function createValidator(schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

const baseState = {
  last_moltmotionpictures_check_at: '1970-01-01T00:00:00.000Z',
  last_post_at: '1970-01-01T00:00:00.000Z',
  last_comment_sweep_at: '1970-01-01T00:00:00.000Z',
  next_post_type: 'kickoff',
};

function validSchedule(profile) {
  return {
    enabled: true,
    profile,
    tasks: {
      submissions: true,
      votes: true,
      status_checks: true,
    },
    timezone: 'America/Chicago',
    start_mode: 'immediate',
    confirmed_at: '2026-02-06T00:00:00.000Z',
    first_run_at: null,
    daily_caps: {
      submissions_max: 1,
      vote_actions_max: 5,
      status_checks_max: 3,
    },
  };
}

for (const { schemaPath, schema } of schemas) {
  const validate = createValidator(schema);
  const label = path.relative(skillRoot, schemaPath);

  test(`${label} accepts legacy state without onboarding_schedule`, () => {
    const ok = validate(baseState);
    assert.equal(ok, true, JSON.stringify(validate.errors));
  });

  test(`${label} accepts valid onboarding_schedule profiles`, () => {
    for (const profile of ['light', 'medium', 'intense']) {
      const state = { ...baseState, onboarding_schedule: validSchedule(profile) };
      const ok = validate(state);
      assert.equal(ok, true, `profile=${profile} errors=${JSON.stringify(validate.errors)}`);
    }
  });

  test(`${label} rejects invalid profile`, () => {
    const state = {
      ...baseState,
      onboarding_schedule: { ...validSchedule('light'), profile: 'turbo' },
    };
    const ok = validate(state);
    assert.equal(ok, false);
  });

  test(`${label} rejects invalid start_mode`, () => {
    const state = {
      ...baseState,
      onboarding_schedule: { ...validSchedule('light'), start_mode: 'later' },
    };
    const ok = validate(state);
    assert.equal(ok, false);
  });

  test(`${label} rejects malformed daily_caps`, () => {
    const negative = {
      ...baseState,
      onboarding_schedule: {
        ...validSchedule('light'),
        daily_caps: { submissions_max: -1, vote_actions_max: 5, status_checks_max: 3 },
      },
    };
    const negativeOk = validate(negative);
    assert.equal(negativeOk, false);

    const nonInteger = {
      ...baseState,
      onboarding_schedule: {
        ...validSchedule('light'),
        daily_caps: { submissions_max: 1.5, vote_actions_max: 5, status_checks_max: 3 },
      },
    };
    const nonIntegerOk = validate(nonInteger);
    assert.equal(nonIntegerOk, false);
  });
}
