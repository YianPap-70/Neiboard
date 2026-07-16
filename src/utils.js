// =========================================================================
// UTILS — pure logic, no JSX
// =========================================================================
// Persistence (localStorage), date helpers, formatters, ID generation, the
// demo-data generator, and a few app-wide constants. No React components
// live here. Imported by App.jsx, primitives.jsx, and modals.jsx wherever
// these are needed.
// =========================================================================

// Returns a fresh "right now" Date every time it's called.
//
// Why this exists instead of a single shared `const systemDate = new Date()`:
// this app can stay open in memory for a long time (especially once it's
// wrapped as a native Android app, where the process isn't reloaded just
// because a new day started). A Date created once at startup slowly becomes
// wrong — "today" would keep pointing at whatever day the app happened to
// launch on. Calling getSystemDate() everywhere we need "today" guarantees
// the app always sees the real current date/time, no matter how long it's
// been running.
function getSystemDate() {
  return new Date();
}

// ─── PERSISTENCE LAYER ─────────────────────────────────────────────────────
// Single versioned localStorage key holds residents, building expenses, and
// user settings together so Export/Import can operate on one consistent blob.
const STORAGE_KEY = 'neiboard-data';

// Bump this number whenever the *shape* of the saved data changes (for
// example: renaming a field, changing how expenses are structured, etc).
// migrateStoredData() below is where you teach the app how to upgrade
// older saved data to the new shape, so people who saved data with an
// older version of the app don't lose it or crash the app when they update.
const STORAGE_VERSION = 1;

// Upgrades older saved data to match the current STORAGE_VERSION.
// Add one `if (data.version === N)` block per past version as the data
// shape evolves. Each block should bring the data one step closer to the
// current shape and bump data.version, so migrations can be applied one
// after another (e.g. version 1 -> 2 -> 3) without skipping steps.
// Right now there is only ever version 1, so there is nothing to migrate.
function migrateStoredData(data) {
  const migrated = { ...data };

  // Ensure the arrays exist
  if (!migrated.fixedTemplates) migrated.fixedTemplates = [];
  if (!migrated.fixedAmountOverrides) migrated.fixedAmountOverrides = [];
  if (!migrated.fixedPaidStatuses) migrated.fixedPaidStatuses = [];
  // fixedSkippedMonths: per-month exceptions where a recurring template is
  // turned into a one-time expense for a single month, without affecting
  // any other month of that same template. See isValidBackupShape below
  // for the shape of each entry.
  if (!migrated.fixedSkippedMonths) migrated.fixedSkippedMonths = [];

  // Add startMonthKey to existing templates (default to 0 for old data)
migrated.fixedTemplates = migrated.fixedTemplates.map(t => ({
  ...t,
  startMonthKey: t.startMonthKey ?? 0,
}));

  // Future migrations can be added here

  migrated.version = STORAGE_VERSION;
  return migrated;
}

// Checks that a piece of data loaded from storage (or an imported backup
// file) actually looks like a resident/expense list the app can safely use.
// This protects the app from crashing later if the file is corrupted,
// half-written, or edited by hand incorrectly.
function isValidExpense(exp) {
  return (
    exp && typeof exp === 'object' &&
    typeof exp.id === 'string' &&
    typeof exp.description === 'string' &&
    typeof exp.amount === 'number' && !Number.isNaN(exp.amount) &&
    typeof exp.paid === 'boolean' &&
    typeof exp.monthKey === 'number'
  );
}

function isValidResident(res) {
  return (
    res && typeof res === 'object' &&
    typeof res.id === 'string' &&
    typeof res.name === 'string' &&
    typeof res.apartment === 'string' &&
    Array.isArray(res.expenses) &&
    res.expenses.every(isValidExpense)
  );
}

// Full shape check used both when loading from localStorage and when a
// user imports a backup file. Returns true only if every resident and every
// expense has the fields the rest of the app expects.
function isValidBackupShape(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  if (!Array.isArray(parsed.residents) || !Array.isArray(parsed.buildingExpenses)) return false;
  if (!parsed.residents.every(isValidResident)) return false;
  if (!parsed.buildingExpenses.every(isValidExpense)) return false;

  // New arrays are optional – if they exist, validate their shape
  const templates = parsed.fixedTemplates || [];
  const overrides = parsed.fixedAmountOverrides || [];
  const paidStatuses = parsed.fixedPaidStatuses || [];
  const skippedMonths = parsed.fixedSkippedMonths || [];

  if (!Array.isArray(templates) || !templates.every(t =>
  t && typeof t === 'object' &&
  typeof t.id === 'string' &&
  typeof t.description === 'string' &&
  typeof t.baseAmount === 'number' &&
  (t.deletedAt === null || typeof t.deletedAt === 'number') &&
  typeof t.startMonthKey === 'number'
)) return false;

  if (!Array.isArray(overrides) || !overrides.every(o =>
    o && typeof o === 'object' &&
    typeof o.id === 'string' &&
    typeof o.templateId === 'string' &&
    typeof o.monthKey === 'number' &&
    typeof o.newAmount === 'number'
  )) return false;

  if (!Array.isArray(paidStatuses) || !paidStatuses.every(p =>
    p && typeof p === 'object' &&
    typeof p.id === 'string' &&
    typeof p.templateId === 'string' &&
    typeof p.monthKey === 'number' &&
    typeof p.paid === 'boolean'
  )) return false;

  // Each entry marks one specific month where a recurring template should
  // be treated as skipped/inactive, without affecting any other month.
  if (!Array.isArray(skippedMonths) || !skippedMonths.every(sm =>
    sm && typeof sm === 'object' &&
    typeof sm.id === 'string' &&
    typeof sm.templateId === 'string' &&
    typeof sm.monthKey === 'number'
  )) return false;

  return true;
}

function loadPersistedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidBackupShape(parsed)) return null;
    return migrateStoredData(parsed);
  } catch (e) {
    console.error('Failed to load persisted data:', e);
    return null;
  }
}

function savePersistedData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...data }));
    return true;
  } catch (e) {
    console.error('Failed to save persisted data:', e);
    return false;
  }
}

function formatDateStamp(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Calendar year range configuration
const CALENDAR_START_YEAR = 2015;
const CALENDAR_END_YEAR   = 2045;
const TIMELINE_YEARS = Array.from(
  { length: CALENDAR_END_YEAR - CALENDAR_START_YEAR + 1 },
  (_, i) => CALENDAR_START_YEAR + i
);
window.TIMELINE_YEARS = TIMELINE_YEARS;

// Default English month names — used only as a loading fallback
const DEFAULT_MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// Easing curve used by smoothScrollTo — starts slow, speeds up, ends slow.
const easeInOutQuad = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Formats a numeric amount for display — whole numbers show with no
// decimals, others are trimmed to at most 2 decimal places (e.g. 40 -> "40",
// 40.5 -> "40.5", 40.501 -> "40.5"). Falls back to "0" for anything that
// isn't a usable number (for example, if corrupted or hand-edited data ever
// reaches this function), so the app never displays the text "NaN" to a user.
function formatAmount(amount) {
  const num = parseFloat(amount);
  if (Number.isNaN(num)) return '0';
  if (num % 1 === 0) return num.toString();
  return num.toFixed(2).replace(/\.?0+$/, '');
}

// Smoothly scrolls the page to a target vertical position over `duration`
// milliseconds, using the easing curve above. Skips the animation (jumps
// straight there) if the distance is tiny enough not to be noticeable.
function smoothScrollTo(targetY, duration = 700) {
  const startY   = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 10) { window.scrollTo(0, targetY); return; }

  const startTime = performance.now();

  const animate = (currentTime) => {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutQuad(progress));
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

// Generates a unique ID for a new resident or expense. Uses the browser's
// built-in crypto.randomUUID() when available (all modern browsers and the
// Android System WebView support it), which guarantees no two IDs ever
// collide. Falls back to a timestamp + random suffix on the rare older
// environment that lacks it, which is unique enough in practice.
function makeId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// ─── DEMO DATA GENERATOR ─────────────────────────────────────────────────
// Intentional: generates random sample residents so the app has something
// to show the first time it's opened with no saved data yet (handy for
// development/testing/demos). cardCount is capped at APARTMENTS.length to
// prevent an infinite loop when picking unique apartments.
function generateInitialResidents(monthNames, currentMonthString, currentMonthKey) {
  const SURNAMES      = ['Ramirez','Chen','Marcus','Patel','Kowalski','Nguyen','Ferreira','Schmidt','Okafor','Petrov'];
  const EXPENSE_NAMES = ['Monthly Maintenance','Heating Oil','Elevator Repair','Water Balance','Shared Repairs','Stairwell Lighting'];
  const APARTMENTS    = ['1A','1B','1C','2A','2B','2C','3A','3B','3C'];

  const rand       = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick       = (arr)      => arr[Math.floor(Math.random() * arr.length)];
  const pickUnique = (arr, n)   => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

  const today      = getSystemDate();
  const pastMonths = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    pastMonths.push({
      label:    `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      monthKey: d.getFullYear() * 12 + d.getMonth(),
    });
  }

  const cardCount      = Math.min(rand(5, 8), APARTMENTS.length);
  const shuffledApts   = [...APARTMENTS].sort(() => Math.random() - 0.5).slice(0, cardCount);
  const residents      = [];

  shuffledApts.forEach((apt, i) => {
    const surname = SURNAMES[i] || `Family ${i + 1}`;
    const expenses = [];

    pickUnique(EXPENSE_NAMES, rand(1, 2)).forEach(name => {
      expenses.push({
        id: makeId('exp'), description: name,
        amount: rand(40, 150), paid: Math.random() > 0.4,
        month: currentMonthString, monthKey: currentMonthKey,
      });
    });

    pickUnique(EXPENSE_NAMES, rand(0, 2)).forEach(name => {
      const past = pick(pastMonths);
      expenses.push({
        id: makeId('exp'), description: name,
        amount: rand(40, 150), paid: false,
        month: past.label, monthKey: past.monthKey,
      });
    });

    residents.push({ id: makeId('R'), name: `${surname} Family`, apartment: `Apt ${apt}`, notes: '', expenses });
  });

  return residents;
}

// ─── EXPORTS ───────────────────────────────────────────────────────────────
export {
  getSystemDate,
  STORAGE_KEY,
  STORAGE_VERSION,
  isValidBackupShape,
  loadPersistedData,
  savePersistedData,
  formatDateStamp,
  CALENDAR_START_YEAR,
  CALENDAR_END_YEAR,
  TIMELINE_YEARS,
  DEFAULT_MONTH_NAMES,
  formatAmount,
  smoothScrollTo,
  makeId,
  generateInitialResidents,
};
