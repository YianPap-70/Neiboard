// =========================================================================
// UTILS — pure logic, no JSX
// =========================================================================
// Persistence (localStorage), formatters, the demo-data generator, and a
// few app-wide constants. No React components live here. Imported by
// App.jsx, primitives.jsx, and modals.jsx wherever these are needed.
// =========================================================================

const systemDate = new Date();

// ─── PERSISTENCE LAYER ─────────────────────────────────────────────────────
// Single versioned localStorage key holds residents, building expenses, and
// user settings together so Export/Import can operate on one consistent blob.
const STORAGE_KEY = 'neiboard-data';
const STORAGE_VERSION = 1;

function loadPersistedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.residents) || !Array.isArray(parsed.buildingExpenses)) return null;
    return parsed;
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

// FIX [Unnecessary #4]: Collapsed EASING object to the single function actually used.
// easeOutCubic, easeOutQuint, and easeInOutCubic were dead code.
const easeInOutQuad = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Formats a numeric amount — integer displayed without decimals, float trimmed
function formatAmount(amount) {
  const num = parseFloat(amount);
  if (num % 1 === 0) return num.toString();
  return num.toFixed(2).replace(/\.?0+$/, '');
}

// FIX [Unnecessary #4]: Removed the easing parameter — only easeInOutQuad is used.
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

// ─── DEMO DATA GENERATOR ─────────────────────────────────────────────────
// Intentional: generates random test residents for development/testing.
// cardCount is capped at APARTMENTS.length to prevent an infinite loop.
function generateInitialResidents(monthNames, currentMonthString, currentMonthKey) {
  const SURNAMES      = ['Ramirez','Chen','Marcus','Patel','Kowalski','Nguyen','Ferreira','Schmidt','Okafor','Petrov'];
  const EXPENSE_NAMES = ['Monthly Maintenance','Heating Oil','Elevator Repair','Water Balance','Shared Repairs','Stairwell Lighting'];
  const APARTMENTS    = ['1A','1B','1C','2A','2B','2C','3A','3B','3C'];

  const rand       = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick       = (arr)      => arr[Math.floor(Math.random() * arr.length)];
  const pickUnique = (arr, n)   => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

  const today      = new Date();
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
    let expCounter = 0;

    pickUnique(EXPENSE_NAMES, rand(1, 2)).forEach(name => {
      expenses.push({
        id: `exp-${i}-${expCounter++}`, description: name,
        amount: rand(40, 150), paid: Math.random() > 0.4,
        month: currentMonthString, monthKey: currentMonthKey,
      });
    });

    pickUnique(EXPENSE_NAMES, rand(0, 2)).forEach(name => {
      const past = pick(pastMonths);
      expenses.push({
        id: `exp-${i}-${expCounter++}`, description: name,
        amount: rand(40, 150), paid: false,
        month: past.label, monthKey: past.monthKey,
      });
    });

    residents.push({ id: `R${i}`, name: `${surname} Family`, apartment: `Apt ${apt}`, notes: '', expenses });
  });

  return residents;
}

// ─── EXPORTS ───────────────────────────────────────────────────────────────
export {
  systemDate,
  STORAGE_KEY,
  STORAGE_VERSION,
  loadPersistedData,
  savePersistedData,
  formatDateStamp,
  CALENDAR_START_YEAR,
  CALENDAR_END_YEAR,
  TIMELINE_YEARS,
  DEFAULT_MONTH_NAMES,
  formatAmount,
  smoothScrollTo,
  generateInitialResidents,
};
