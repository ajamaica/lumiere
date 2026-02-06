#!/usr/bin/env node
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const LOGIN_URL = 'http://www.wpstime.com/NetTime/Login.asp';

// Preferred keychain service names for this distributable skill.
// Keep backward-compat fallback to the older OpenClaw-specific names.
const KC = {
  company: ['wpstime-punchclock.company', 'openclaw.wpstime.company'],
  account: ['wpstime-punchclock', 'openclaw.wpstime']
};

function arg(name, def = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return def;
}

async function keychainGet(service) {
  try {
    const { stdout } = await execFileAsync('security', ['find-generic-password', '-s', service, '-w'], { maxBuffer: 1024 * 1024 });
    return stdout.trim();
  } catch {
    return '';
  }
}

async function keychainGetAccount(service) {
  try {
    const { stdout } = await execFileAsync('security', ['find-generic-password', '-s', service], { maxBuffer: 1024 * 1024 });
    const line = stdout.split('\n').find(l => l.includes('"acct"<blob>='));
    if (!line) return '';
    const m = line.match(/"acct"<blob>="(.*)"/);
    return (m?.[1] ?? '').trim();
  } catch {
    return '';
  }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function run() {
  const action = arg('action', 'status');
  const outDir = arg('outDir', path.resolve(process.cwd(), 'out/punchclock'));
  const headless = arg('headless', '1') !== '0';

  await ensureDir(outDir);

  // Credentials are stored in macOS Keychain.
  // Preferred service names for this skill:
  // - wpstime-punchclock.company → secret = company/common id
  // - wpstime-punchclock         → account = username, secret = password
  // Backward compatibility: also accept openclaw.wpstime.company / openclaw.wpstime.

  const firstNonEmpty = async (services, getter) => {
    for (const s of services) {
      const v = await getter(s);
      if (v) return v;
    }
    return '';
  };

  const companyId = await firstNonEmpty(KC.company, keychainGet);
  const username = await firstNonEmpty(KC.account, keychainGetAccount);
  const password = await firstNonEmpty(KC.account, keychainGet);

  if (!companyId || !username || !password) {
    throw new Error(
      'Missing Keychain credentials. Run the setup script first:\n' +
      '  node ./setup.mjs\n\n' +
      'Expected Keychain services (preferred):\n' +
      '  - wpstime-punchclock.company (secret=company id)\n' +
      '  - wpstime-punchclock (account=username, secret=password)\n\n' +
      'Backward-compat also accepts:\n' +
      '  - openclaw.wpstime.company\n' +
      '  - openclaw.wpstime'
    );
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await context.newPage();

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(outDir, `punchclock-${action}-${ts}.png`);

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Login page fields
    await page.locator('input[name="txtLoginAlias"]').fill(companyId);
    await page.locator('input[name="txtLoginUserID"]').fill(username);
    await page.locator('input[name="txtLoginPassword"]').fill(password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null),
      page.locator('input[name="inpLogin"]').click()
    ]);

    // After login: find action dropdown and punch button.
    // The site historically uses a select for actions and a Punch submit.
    const actionSelect = page.locator('select').first();
    await actionSelect.waitFor({ timeout: 60000 });

    // Try to locate Punch button (NETtime uses an input[type=button] with id/name btnPunch, value often has spaces)
    const punchButton = page.locator('#btnPunch, input[name="btnPunch"], input[id="btnPunch"], input[value*="Punch"], button:has-text("Punch")').first();

    // Extract visible status text for reporting
    const statusText = await page.evaluate(() => {
      const body = document.body;
      const txt = (body?.innerText ?? '').replace(/\s+/g, ' ').trim();
      // Keep it short-ish
      return txt.slice(0, 1200);
    });

    const doPunch = async (label) => {
      // Select option by label (best effort)
      const option = page.locator('select option', { hasText: label }).first();
      if ((await option.count()) === 0) throw new Error(`Action option not found: ${label}`);
      const value = await option.getAttribute('value');
      if (value == null) throw new Error(`Action option has no value: ${label}`);
      await actionSelect.selectOption(value);
      await punchButton.waitFor({ timeout: 10000 });
      await punchButton.click();
      // Some pages submit without navigation; wait a moment for UI to update.
      await page.waitForTimeout(1500);
    };

    let performed = 'status';
    if (action === 'start-break') {
      await doPunch('Start Break');
      performed = 'Start Break';
    } else if (action === 'end-break') {
      // Many setups use Clock In as end break.
      await doPunch('Clock In');
      performed = 'Clock In (end break)';
    } else if (action === 'start-lunch') {
      await doPunch('Start Lunch');
      performed = 'Start Lunch';
    } else if (action === 'end-lunch') {
      await doPunch('Clock In');
      performed = 'Clock In (end lunch)';
    } else if (action === 'clock-in') {
      await doPunch('Clock In');
      performed = 'Clock In';
    } else if (action === 'clock-out') {
      await doPunch('Clock Out');
      performed = 'Clock Out';
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });

    const statusTextAfter = await page.evaluate(() => {
      const body = document.body;
      const txt = (body?.innerText ?? '').replace(/\s+/g, ' ').trim();
      return txt.slice(0, 2000);
    });

    // Output a JSON blob for upstream tooling (no secrets)
    const result = {
      ok: true,
      actionRequested: action,
      performed,
      screenshotPath,
      snippet: statusTextAfter
    };

    process.stdout.write(JSON.stringify(result, null, 2));
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

run().catch((err) => {
  const out = { ok: false, error: String(err?.message ?? err) };
  process.stdout.write(JSON.stringify(out, null, 2));
  process.exitCode = 1;
});
