// TobaccoExpiryChecker.js
// Scriptable script — works standalone or called from an Apple Shortcut.
//
// HOW TO USE WITH SHORTCUTS:
//   Action 1: "Ask for Input" (or Siri dictation) → store as "Code"
//   Action 2: "Run Script" → choose this script, pass "Code" as parameter
//   Action 3: "Speak Text" → use Scriptable's output (what to pull / keep)
//
// PRODUCT CODE FORMAT:  [Letter A-L][Digit 0-9]
//   Prefix "cigar" for cigars, "dip" for smokeless/dip, bare code = cigarette
//   Examples:  "F5"  |  "cigar F5"  |  "dip A6"
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_RULES = {
  cigarette: { name: 'Cigarettes',       months: 6  },
  cigar:     { name: 'Cigars',           months: 12 },
  dip:       { name: 'Smokeless or Dip', months: 4  }
};

const WARNING_DAYS   = 30;
const LOG_FILENAME   = 'tobacco-expiry-log.json';
const STATUS_EMOJI   = { ok: '🟢', warning: '🟡', expired: '🔴', invalid: '❓' };

// ─── Month helpers ────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function monthIndex(code) {
  return { A:0,B:1,C:2,D:3,E:4,F:5,G:6,H:7,I:8,J:9,K:10,L:11 }[code];
}

function inferYear(digit, now) {
  const year  = now.getFullYear();
  const decade = Math.floor(year / 10) * 10;
  let y = decade + digit;
  if (y > year + 5) y -= 10;
  if (y < year - 5) y += 10;
  return y;
}

function fmtMonthYear(date) {
  return MONTH_NAMES[date.getMonth()] + ' ' + date.getFullYear();
}

function daysBetween(a, b) {
  return Math.ceil((b - a) / 86_400_000);
}

// ─── Core parser & evaluator ──────────────────────────────────────────────────

function parseInput(raw) {
  if (!raw) return null;
  const t = String(raw).trim().toUpperCase();
  const product =
    t.includes('CIGAR') ? 'cigar' :
    t.includes('DIP')   ? 'dip'   :
                          'cigarette';
  const m = t.match(/([A-L])\s*([0-9])$/);
  if (!m) return null;
  return { product, monthCode: m[1], yearDigit: Number(m[2]) };
}

function evaluateExpiry(input, now = new Date()) {
  const parsed = parseInput(input);

  if (!parsed) {
    return {
      status:  'invalid',
      spoken:  'Invalid code. Say a letter A through L and a digit, for example F five.',
      emoji:   STATUS_EMOJI.invalid
    };
  }

  const rule    = PRODUCT_RULES[parsed.product];
  const mIndex  = monthIndex(parsed.monthCode);
  const year    = inferYear(parsed.yearDigit, now);

  const manufacture = new Date(year, mIndex, 1);
  const expiry      = new Date(manufacture);
  expiry.setMonth(expiry.getMonth() + rule.months);
  expiry.setDate(1);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const daysLeft = daysBetween(today, expiry);
  const expired  = today >= expiry;

  if (expired) {
    return {
      status:    'expired',
      spoken:    `Pull product. ${rule.name}. Expired ${fmtMonthYear(expiry)}.`,
      emoji:     STATUS_EMOJI.expired,
      logEntry:  {
        product:   rule.name,
        code:      parsed.monthCode + parsed.yearDigit,
        expiredOn: fmtMonthYear(expiry)
      }
    };
  }

  if (daysLeft <= WARNING_DAYS) {
    return {
      status:   'warning',
      spoken:   `Warning. ${rule.name}. Expires in ${daysLeft} days, ${fmtMonthYear(expiry)}.`,
      emoji:    STATUS_EMOJI.warning,
      daysLeft
    };
  }

  return {
    status:   'ok',
    spoken:   `Keep product. ${rule.name}. Good until ${fmtMonthYear(expiry)}.`,
    emoji:    STATUS_EMOJI.ok,
    daysLeft
  };
}

// ─── Persistent log (iCloud Drive / Documents) ────────────────────────────────

function loadLog(fm, path) {
  if (!fm.fileExists(path)) return [];
  try   { return JSON.parse(fm.readString(path)); }
  catch { return []; }
}

function saveLog(fm, path, log) {
  fm.writeString(path, JSON.stringify(log, null, 2));
}

function appendPullEntry(entry) {
  try {
    const fm   = FileManager.iCloud();
    const path = fm.joinPath(fm.documentsDirectory(), LOG_FILENAME);
    const log  = loadLog(fm, path);
    log.push({ ...entry, checkedAt: new Date().toISOString() });
    saveLog(fm, path, log);
  } catch (e) {
    console.error('Log write failed: ' + e);
  }
}

// ─── View pull log ────────────────────────────────────────────────────────────

async function showPullLog() {
  try {
    const fm   = FileManager.iCloud();
    const path = fm.joinPath(fm.documentsDirectory(), LOG_FILENAME);
    const log  = loadLog(fm, path);

    if (log.length === 0) {
      const a = new Alert();
      a.title   = 'Pull Log';
      a.message = 'No expired items logged yet.';
      a.addAction('OK');
      await a.presentAlert();
      return;
    }

    const lines = log
      .slice(-30)                            // show last 30 entries
      .reverse()
      .map(e => `${e.product} (${e.code}) — ${e.expiredOn}`)
      .join('\n');

    const a = new Alert();
    a.title   = `Pull Log (${log.length} total)`;
    a.message = lines;
    a.addAction('OK');
    a.addDestructiveAction('Clear Log');
    const choice = await a.presentAlert();
    if (choice === 1) {
      saveLog(fm, path, []);
    }
  } catch (e) {
    const a = new Alert();
    a.title   = 'Error';
    a.message = 'Could not read log: ' + e;
    a.addAction('OK');
    await a.presentAlert();
  }
}

// ─── Interactive session (standalone / no Shortcut param) ────────────────────

async function runInteractive() {
  const menu = new Alert();
  menu.title   = 'Tobacco Expiry Checker';
  menu.message = 'Enter a product code to check, or view the pull log.';
  menu.addAction('Check Code');
  menu.addAction('View Pull Log');
  menu.addCancelAction('Done');

  while (true) {
    const choice = await menu.presentSheet();
    if (choice === -1) break;             // Done / cancelled

    if (choice === 1) {
      await showPullLog();
      continue;
    }

    // Check Code flow
    const input = new Alert();
    input.title   = 'Enter Code';
    input.message = 'Format: [letter][digit]\nExamples: F5  |  cigar F5  |  dip A6';
    input.addTextField('Code', '');
    input.addAction('Check');
    input.addCancelAction('Back');
    const resp = await input.presentAlert();
    if (resp === -1) continue;

    const code   = input.textFieldValue(0).trim();
    const result = evaluateExpiry(code);

    if (result.status === 'expired' && result.logEntry) {
      appendPullEntry(result.logEntry);
    }

    const out = new Alert();
    out.title   = result.emoji + '  ' + result.status.toUpperCase();
    out.message = result.spoken;
    out.addAction('Check Another');
    out.addCancelAction('Done');
    const next = await out.presentAlert();
    if (next === -1) break;
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const shortcutInput = args.shortcutParameter;

  if (shortcutInput) {
    // Called from Apple Shortcuts — fast path, no UI
    const result = evaluateExpiry(String(shortcutInput));

    if (result.status === 'expired' && result.logEntry) {
      appendPullEntry(result.logEntry);
    }

    // Send spoken verdict back to the Shortcut
    Script.setShortcutOutput(result.spoken);

  } else {
    // Launched directly in Scriptable — show interactive UI
    await runInteractive();
  }

  Script.complete();
}

await main();
