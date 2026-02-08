const PRODUCT_RULES = {
  cigarette: { name: 'Cigarettes', months: 6 },
  cigar: { name: 'Cigars', months: 12 },
  dip: { name: 'Smokeless or Dip', months: 4 }
};

const WARNING_DAYS = 30;
const LOG_KEY = 'expiry-log';

export function monthIndex(code) {
  return {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    F: 5,
    G: 6,
    H: 7,
    I: 8,
    J: 9,
    K: 10,
    L: 11
  }[code];
}

export function inferYear(digit, now = new Date()) {
  const year = now.getFullYear();
  const decade = Math.floor(year / 10) * 10;
  let y = decade + digit;

  if (y > year + 5) y -= 10;
  if (y < year - 5) y += 10;

  return y;
}

export function parseInput(raw) {
  if (!raw) return null;

  const t = String(raw).trim().toUpperCase();

  const product =
    t.includes('CIGAR') ? 'cigar' : t.includes('DIP') ? 'dip' : 'cigarette';

  const m = t.match(/([A-L])\s*([0-9])$/);
  if (!m) return null;

  return {
    product,
    monthCode: m[1],
    yearDigit: Number(m[2])
  };
}

export function formatMonthYear(date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function daysBetween(a, b) {
  return Math.ceil((b - a) / 86400000);
}

export function loadLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logExpired(entry) {
  const log = loadLog();
  log.push(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(log, null, 2));
}

export function evaluateExpiry(input, now = new Date()) {
  const parsed = parseInput(input);

  if (!parsed) {
    return {
      status: 'invalid',
      spoken:
        'Invalid code. Please say a letter A to L and a number, for example F five.'
    };
  }

  const rule = PRODUCT_RULES[parsed.product];
  const mIndex = monthIndex(parsed.monthCode);
  const year = inferYear(parsed.yearDigit, now);

  const manufacture = new Date(year, mIndex, 1);
  const expiry = new Date(manufacture);
  expiry.setMonth(expiry.getMonth() + rule.months);
  expiry.setDate(1);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const expired = today >= expiry;
  const daysLeft = daysBetween(today, expiry);

  if (expired) {
    const spoken = `Pull product. ${rule.name}. Expired ${formatMonthYear(expiry)}.`;
    const logEntry = {
      product: rule.name,
      code: parsed.monthCode + parsed.yearDigit,
      expiredOn: formatMonthYear(expiry),
      checkedAt: new Date().toISOString()
    };
    logExpired(logEntry);

    return {
      status: 'expired',
      spoken,
      parsed,
      expiry,
      logEntry
    };
  }

  if (daysLeft <= WARNING_DAYS) {
    return {
      status: 'warning',
      spoken: `Warning. ${rule.name}. Expires in ${daysLeft} days, ${formatMonthYear(expiry)}.`,
      parsed,
      expiry,
      daysLeft
    };
  }

  return {
    status: 'ok',
    spoken: `Keep product. ${rule.name}. Expires ${formatMonthYear(expiry)}.`,
    parsed,
    expiry,
    daysLeft
  };
}
