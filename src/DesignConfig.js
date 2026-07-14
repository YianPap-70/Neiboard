// =========================================================================
// DESIGN CONFIGURATION - SINGLE SOURCE OF TRUTH FOR ALL STYLING
// =========================================================================
// This file contains ALL colors, spacing, animations, and component styles.
// No hex values should appear anywhere else in the application.
// =========================================================================

// ─── COLOR THEMES (ONLY PLACE HEX VALUES MAY APPEAR) ───────────────────────
// Each theme maps the same token keys to a distinct hex palette. Theme 0 is
// the original/default palette. Themes are injected as CSS custom properties
// scoped under [data-theme="N"] on the app root, so switching themes is just
// a matter of changing that attribute — no React re-render of color values
// is required, and the change can transition smoothly via CSS.
const THEMES = [
  {
    name: 'Midnight', // default
    tokens: {
      'color-text-prim': '#BDD4E0',
      'color-text-dim': '#78909F',
      'color-cardback-dim': '#374F5F',
      'color-cardback-prim': '#2C3E4D',
      'color-extra': '#466A7C',
      'color-background': '#18202A',
      'color-accent-1': '#9CE66B',
      'color-accent-2': '#F2C454',
      'color-accent-3': '#E25344',
    },
  },
  {
    name: 'Grey',
    tokens: {
      'color-text-prim': '#DADBDC',
      'color-text-dim': '#848484',
      'color-cardback-dim': '#3D4146',
      'color-cardback-prim': '#2B2F35',
      'color-extra': '#466566',
      'color-background': '#000000',
      'color-accent-1': '#4AA04A',
      'color-accent-2': '#F4A640',
      'color-accent-3': '#BC392B',
    },
  },
  {
    name: 'Mocha',
    tokens: {
      'color-text-prim': '#FFF2E9',
      'color-text-dim': '#CEB7AB',
      'color-cardback-dim': '#54453D',
      'color-cardback-prim': '#41362F',
      'color-extra': '#695850',
      'color-background': '#1E1B19',
      'color-accent-1': '#91DB61',
      'color-accent-2': '#FFC543',
      'color-accent-3': '#F2662F',
    },
  },
];

// ─── INJECT CSS CUSTOM PROPERTIES FOR EACH THEME ───────────────────────────
// :root carries the default (Midnight) values so the app renders correctly
// even before the theme system initializes. Each additional theme is scoped
// under html[data-theme="N"] and overrides the same variable names.
(function injectThemeVariables() {
  if (document.querySelector('style[data-design-theme-vars]')) return;
  const toCssVars = (tokens) =>
    Object.entries(tokens).map(([key, val]) => `--${key}: ${val};`).join('\n    ');

  const blocks = THEMES.map((theme, idx) => {
    const selector = idx === 0 ? ':root' : `html[data-theme="${idx}"]`;
    return `  ${selector} {\n    ${toCssVars(theme.tokens)}\n  }`;
  }).join('\n');

  const style = document.createElement('style');
  style.setAttribute('data-design-theme-vars', 'true');
  style.textContent = `\n${blocks}\n  html {\n    transition: background-color 0.3s ease-in-out;\n  }\n  html * {\n    transition: background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, color 0.3s ease-in-out;\n  }\n  `;
  document.head.appendChild(style);
})();

// ─── ACTIVE THEME APPLICATION ───────────────────────────────────────────────
// Sets the data-theme attribute on <html>, which the injected CSS above uses
// to swap variable values with a smooth ease-in-out transition.
function applyTheme(index) {
  const safeIndex = THEMES[index] ? index : 0;
  document.documentElement.setAttribute('data-theme', String(safeIndex));
}

// ─── COLOR TOKEN REFERENCES ─────────────────────────────────────────────────
// These resolve to CSS variables (not raw hex) so every consumer of
// window.DESIGN.colors automatically follows the active theme.
const COLORS = {
  'color-text-prim': 'var(--color-text-prim)',
  'color-text-dim': 'var(--color-text-dim)',
  'color-cardback-dim': 'var(--color-cardback-dim)',
  'color-extra': 'var(--color-extra)',
  'color-cardback-prim': 'var(--color-cardback-prim)',
  'color-background': 'var(--color-background)',
  'color-accent-1': 'var(--color-accent-1)',
  'color-accent-2': 'var(--color-accent-2)',
  'color-accent-3': 'var(--color-accent-3)',
};

// ─── UNIFIED LABEL SYSTEM ──────────────────────────────────────────────────
const LABELS = {
  primary:           `font-normal truncate text-sm text-[${COLORS['color-text-dim']}]`,
  primarySuccess:    `font-normal truncate text-sm text-[${COLORS['color-text-dim']}]`,
  secondary:         `font-normal truncate text-sm text-[${COLORS['color-text-prim']}]/70`,
  empty:             `text-center py-4 text-sm text-[${COLORS['color-text-dim']}]`,
  modal:             `font-normal text-sm text-[${COLORS['color-text-dim']}] tracking-wide`,
  strikethroughPaid: `line-through decoration-[${COLORS['color-accent-1']}] decoration-1`,
};

const RADIUS_STANDARD = '12px';
const MODAL_MAX_WIDTH = '376px';

// ─── GLOBAL STYLES (KEYFRAMES + ANDROID-FRIENDLY TOUCH BEHAVIOR) ─────────
// Injected once into <head>. The `id` check means this safely does nothing
// if it somehow runs a second time (e.g. during development hot-reloading),
// instead of piling up duplicate <style> tags.
(function injectGlobalStyles() {
  if (document.getElementById('design-config-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'design-config-global-styles';
  style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes modalContentIn {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes menuContentIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes viewExitRecede {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes viewEnterFromRight {
    from { opacity: 0; transform: translateX(60px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes viewEnterFromLeft {
    from { opacity: 0; transform: translateX(-60px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes inputShake {
    0%   { transform: translateX(0); }
    20%  { transform: translateX(-6px); }
    40%  { transform: translateX(6px); }
    60%  { transform: translateX(-4px); }
    80%  { transform: translateX(4px); }
    100% { transform: translateX(0); }
  }

  /* Stops the whole page from bouncing/glowing past its edges when someone
     scrolls past the top or bottom — mainly noticeable as an odd rubber-band
     or glow effect inside an Android WebView, where the app is expected to
     feel like a native screen rather than a scrollable web page. */
  html, body {
    overscroll-behavior: contain;
  }

  /* Buttons, cards, and rows throughout this app are tap targets, not text
     to select. Without this, a long-press on Android (which normally starts
     text selection or shows a copy/share menu) can interrupt what should be
     a simple tap-and-hold interaction. Text inputs and textareas are
     explicitly excluded so people can still select and edit what they type. */
  button, a, [role="button"] {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  input, textarea {
    -webkit-user-select: text;
    user-select: text;
  }
  `;
  document.head.appendChild(style);
})();

// ─── ICON SIZE TOKENS ────────────────────────────────────────────────────
const icons = {
  statusIconSize:  "w-5 h-5",
  rollerArrowSize: "w-[18px] h-[18px]",
  caretIconSize:   `w-4 h-4 text-[${COLORS['color-text-prim']}]`,
  actionIconSize:  `w-7 h-7 text-[${COLORS['color-text-prim']}]`,
  syncIconSize:    "w-8 h-8",
  iconColorClasses: {
    check:   `text-[${COLORS['color-accent-1']}]`,
    warning: `text-[${COLORS['color-accent-2']}]`,
  }
};

// ─── MULTI-COLOR ICON STYLES ─────────────────────────────────────────────
const iconColors = {
  warningFilled: { '--color-accent-1': COLORS['color-accent-2'] },
  check:         { '--color-accent-1': COLORS['color-accent-1'] },
  avatarDebt:    { '--avatar-debt-badge': COLORS['color-accent-2'], '--avatar-debt-body': COLORS['color-text-dim'] },
  avatarNoDebt:  { '--avatar-nodebt-check': COLORS['color-accent-1'], '--avatar-nodebt-body': COLORS['color-text-dim'] },
  synced:        { '--color-accent-1': COLORS['color-accent-1'] },
};

// ─── GLOBAL SETTINGS ─────────────────────────────────────────────────────
const currencyOptions = [
  { label: 'EUR €', symbol: '€' },
  { label: 'USD $', symbol: '$' },
  { label: 'GBP £', symbol: '£' },
  { label: 'Yen ¥', symbol: '¥' },
  { label: 'None',  symbol: '' },
];

const fontFamily = "'Roboto', sans-serif";

// ─── ANIMATION TIMING CONFIGURATION ──────────────────────────────────────
const animation = {
  drawerCurve:            'cubic-bezier(0.25, 1, 0.5, 1)',
  drawerDuration:         '0.5s',
  caretDuration:          '500ms',
  modalCurve:             'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  modalDuration:          '0.45s',
  autoTextareaCurve:      'cubic-bezier(0.25, 1, 0.5, 1)',
  autoTextareaDuration:   '0.2s',
  rollerTransition:       'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
  viewTransitionDuration: '0.6s',
  viewTransitionCurve:    'cubic-bezier(0.4, 0, 0.2, 1)',
  coinFlipDuration:       '0.5s',
  inputShake:             'inputShake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
};

// ─── LAYOUT & APP CONTAINER ──────────────────────────────────────────────
const layout = {
  appBackgroundHex:  COLORS['color-background'],
  appWrapper:        "min-h-screen antialiased flex justify-center pb-12",
  // Adds a little extra bottom space equal to the phone's gesture-nav-bar
  // height (env(safe-area-inset-bottom)) so the last card/button on screen
  // isn't crowded by the system's home-gesture bar.
  appWrapperStyle:   { paddingBottom: 'env(safe-area-inset-bottom)' },
  appInnerContainer: "w-full relative px-4 text-left",
  appMaxWidthStyle:  { maxWidth: '440px' },
  loadingTextStyle:  { color: COLORS['color-text-prim'], textAlign: 'center', marginTop: '100px' },
};

// ─── HEADER COMPONENT ────────────────────────────────────────────────────
const header = {
  stickyContainer:          "sticky top-0 z-40 w-full mx-auto pb-2 flex flex-col gap-2",
  // paddingTop reserves extra space above the header equal to the phone's
  // status bar / camera cutout height (env(safe-area-inset-top)), so the
  // hamburger/add/sync buttons are never drawn underneath it. `max(12px, ...)`
  // keeps the original ~12px of breathing room on devices that report no
  // safe-area inset at all (e.g. a regular desktop browser).
  stickyContainerStyle:     { backgroundColor: COLORS['color-background'], paddingTop: 'max(12px, env(safe-area-inset-top))' },
  touchTargetBtn:           "w-[52px] h-[52px] flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity cursor-pointer",
  touchTargetBtnDisabled:   "w-[52px] h-[52px] flex items-center justify-center shrink-0 cursor-default opacity-40 pointer-events-none",
  topRow:                   "flex items-center pl-[2px] pr-[2px] w-full",
  leftActionGroup:          "flex items-center gap-2",
  debtSection:              "flex items-baseline gap-2 ml-auto",
  totalDebtLabel:           `font-normal whitespace-nowrap text-sm leading-none text-[${COLORS['color-text-prim']}]`,
  totalDebtAmount:          `truncate font-normal text-sm/[1.25rem] text-[${COLORS['color-accent-2']}]`,
  currencySizeMod:          "text-[0.9em] mr-1",
  syncIconWrapper:          "ml-2",
  bottomRow:                "flex items-center pl-[2px] pr-[2px] w-full",
  bottomRowStyle:           { display: 'flex', alignItems: 'center', gap: '16px' },
  monthTextBtn:             "font-normal tracking-wide text-left text-xl hover:opacity-80 transition-opacity select-none truncate",
  monthTextBtnStyle:        { flexShrink: 0 },
  monthTextBtnCurrentColor: COLORS['color-text-prim'],
  monthTextBtnOtherColor:   COLORS['color-accent-2'],
};

// ─── NAVIGATION PILL (UNIFIED FOR MONTHS & YEARS) ──────────────────────
const navigationPill = {
  container: "flex items-center shrink-0",
  containerStyle: (variant = 'default') => ({
    padding: '0 8px',
    borderRadius: '9999px',
    backgroundColor: variant === 'transparent' ? 'transparent' : COLORS['color-cardback-dim'],
    border: variant === 'transparent' ? `2px solid ${COLORS['color-cardback-dim']}` : 'none',
    height: '52px',
    width: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0',
  }),
  btn: "flex items-center justify-center shrink-0 outline-none select-none",
  btnStyle: {
    width: '52px', height: '52px',
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: '9999px', transition: 'opacity 0.2s',
  },
  btnDisabled: "flex items-center justify-center shrink-0 outline-none select-none",
  btnDisabledStyle: {
    width: '52px', height: '52px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: 0.5,
  },
  icon: "w-6 h-6",
  iconStyle:        { color: COLORS['color-text-prim'] },
  iconDisabledStyle:{ color: COLORS['color-text-prim'], opacity: 0.4 },
};

// ─── GLOBAL SPACING ──────────────────────────────────────────────────────
const spacing = {
  headerToListGap: '16px',
};

// ─── DIVIDER / SEPARATOR LINES ─────────────────────────────────────────────
// A single, consistent separator used between expense items (current and past)
// in all views: resident cards, history drawers, and building expenses.
// Applied as a top border on all but the first item in a list.
const divider = {
  itemDivider: `border-t border-solid border-[${COLORS['color-text-dim']}]/50`,
};

// ─── MAIN SETTINGS MODAL (9-ROW REDESIGN) ────────────────────────────────
const settingsModal = {
  contentAnimation: (A) => ({ animation: `menuContentIn ${A.modalDuration} ${A.modalCurve}` }),
  boxContainer:      `w-full flex flex-col bg-[${COLORS['color-cardback-prim']}] text-[${COLORS['color-text-prim']}] select-none`,
  boxContainerStyle: { borderRadius: RADIUS_STANDARD, maxWidth: '376px', padding: '16px' },
  rowGap:            '16px',

  // Row 1 — header (logo + report button)
  headerRow:        "flex items-center justify-between w-full",
  headerRowGap:      '20px',
  logoIcon:          `text-[${COLORS['color-text-prim']}]`,
logoIconStyle:     { height: '42px', width: 'auto', aspectRatio: '91 / 24' },
  reportBtn:         `h-[52px] px-4 rounded-[9999px] flex items-center justify-center gap-2 bg-transparent ring-2 ring-[${COLORS['color-accent-1']}] text-[${COLORS['color-text-prim']}] font-normal text-base outline-none select-none transition-transform active:scale-95 shrink-0`,
  reportIcon:        "h-6 w-6",

  // Shared "pill row" base used by rows 2-9
  pillRow:           `w-full h-[52px] rounded-[9999px] flex items-center bg-transparent ring-2 ring-[${COLORS['color-cardback-dim']}] outline-none select-none transition-all duration-300 cursor-pointer`,
  pillRowFilled:      `w-full h-[52px] rounded-[9999px] flex items-center bg-[${COLORS['color-extra']}] outline-none select-none transition-all duration-300 cursor-pointer`,
  pillRowDanger:      `w-full h-[52px] rounded-[9999px] flex items-center bg-transparent ring-2 ring-[${COLORS['color-accent-3']}] outline-none select-none transition-all duration-300 cursor-pointer`,
  pillPaddingX:       '16px',
  pillLabel:          `font-normal text-base text-[${COLORS['color-text-prim']}] whitespace-nowrap`,
  pillIcon:           `h-6 w-6 text-[${COLORS['color-text-prim']}] shrink-0`,
  pillCenterText:     `flex-1 text-center font-normal text-base text-[${COLORS['color-text-prim']}]`,

  // Roller value (rows 2-5): sliding/rolling dynamic value display.
  // Shrink-wraps to its content and sits left-aligned immediately after the
  // label's 8px gap (rather than flex-growing to fill the row), so a single
  // trailing flex-1 spacer is what pushes the trailing icon to the right edge.
  rollerWrapper:     "h-6 overflow-hidden relative flex items-start min-w-0 justify-start shrink-0",
  rollerTrack:        (activeIdx, A) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    transform: `translateY(-${activeIdx * 24}px)`,
    transition: A.rollerTransition,
  }),
  rollerItem:        `h-6 leading-6 font-normal text-base text-[${COLORS['color-accent-1']}] whitespace-nowrap text-left`,
};

// ─── DELETE DATA RANGE SUB-MODAL ─────────────────────────────────────────
const deleteRangeModal = {
  boxContainer:      `w-full flex flex-col bg-[${COLORS['color-cardback-prim']}] text-[${COLORS['color-text-prim']}] select-none`,
  boxContainerStyle: { borderRadius: RADIUS_STANDARD, maxWidth: '376px', padding: '16px' },
  rowGap:            '16px',

  boundaryBtn:        `w-full h-[52px] rounded-[9999px] flex items-center justify-center bg-[${COLORS['color-cardback-dim']}] outline-none select-none transition-all duration-300 cursor-pointer font-normal text-base text-[${COLORS['color-text-prim']}]`,
  boundaryBtnSetRing: `ring-2 ring-[${COLORS['color-accent-2']}]`,

  resetBtn:           `w-full h-[52px] rounded-[9999px] flex items-center justify-center gap-2 bg-transparent ring-2 ring-[${COLORS['color-accent-1']}] outline-none select-none transition-transform active:scale-95 cursor-pointer font-normal text-base text-[${COLORS['color-text-prim']}]`,
  resetIcon:           `h-6 w-6 text-[${COLORS['color-text-prim']}]`,

  deleteBtnBase:       `w-full h-[52px] rounded-[9999px] flex items-center justify-center gap-2 bg-transparent outline-none select-none transition-all duration-300 font-normal text-base`,
  deleteBtnDisabled:   `ring-2 ring-[${COLORS['color-cardback-dim']}] text-[${COLORS['color-text-dim']}] cursor-not-allowed opacity-60`,
  deleteBtnEnabled:    `ring-2 ring-[${COLORS['color-accent-3']}] text-[${COLORS['color-text-prim']}] cursor-pointer transition-transform active:scale-95`,
  deleteIcon:          `h-6 w-6 text-[${COLORS['color-text-prim']}]`,

  exitBtn:             `w-full h-[52px] rounded-[9999px] flex items-center justify-center bg-transparent ring-2 ring-[${COLORS['color-cardback-dim']}] outline-none select-none transition-transform active:scale-95 cursor-pointer font-normal text-base text-[${COLORS['color-text-prim']}]`,
};

// ─── RESIDENT CARD COMPONENT ─────────────────────────────────────────────
const residentCard = {
  cardListContainer:       "flex flex-col gap-4",
  cardWrapper:             "flex flex-col overflow-hidden",
  cardBody:                `bg-[${COLORS['color-cardback-prim']}]`,
  cardInnerPadding:        "p-4",
  cardHeaderContainer:     "flex items-start gap-3",
  cardHeaderContent:       "flex-1 min-w-0 flex flex-col gap-[2px]",
  cardTopRow:              "flex items-start justify-between gap-3 cursor-pointer select-none flex-1 min-w-0",
  cardBottomRow:           "flex justify-end cursor-pointer select-none",
  avatarBtn:               "shrink-0 h-[52px] w-[52px] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity active:scale-95",
  avatarIcon:              "w-[42px] h-[42px] pointer-events-none",
  avatarIconNoDebt:        `w-[42px] h-[42px] pointer-events-none text-[${COLORS['color-text-prim']}]`,
  textMetaArea:            "min-w-0 flex-1",
  residentName:            `font-normal tracking-wide truncate text-lg text-[${COLORS['color-text-prim']}]`,
  apartmentNumber:         `font-normal truncate text-sm text-[${COLORS['color-text-dim']}]`,
  totalDebtText:           `font-normal text-[22px]/[22px] text-[${COLORS['color-accent-2']}]`,
  totalDebtCurrencyMod:    "text-[0.7em]/[22px] mr-0.5 font-normal",
  noDebtText:              `font-normal text-[16px] text-[${COLORS['color-accent-1']}]`,
  caretRotationStyle:      (isExpanded, A) => ({
    display: 'inline-block',
    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: `transform ${A.caretDuration} ${A.drawerCurve}`,
  }),
  monthActionRow:          "flex items-center justify-between py-2.5",
  monthActionLabel:        LABELS.primary,
  monthActionLabelNoDebt:  LABELS.primarySuccess,
  addExpenseBtn:           `w-[100px] h-[44px] rounded-[22px] bg-[${COLORS['color-cardback-dim']}] font-normal text-sm text-[${COLORS['color-text-prim']}] flex items-center justify-center outline-none shrink-0 transition-transform active:scale-95`,
  noExpensesFallback:      LABELS.empty,
  itemRowWrapper:          "w-full flex items-center justify-between py-3 first:pt-0 cursor-pointer select-none transition-colors active:bg-white/5",
  itemRowDividerStyle: divider.itemDivider,
  interactiveIconArea:     "flex items-center min-w-0 gap-3 pointer-events-none",
  iconStateBtn:            "shrink-0 h-5 flex items-center pointer-events-none",
  expenseDescription:      (isPaid) => `font-normal truncate pr-2 text-base ${isPaid ? `text-[${COLORS['color-text-dim']}] line-through decoration-[${COLORS['color-accent-1']}] decoration-1` : `text-[${COLORS['color-text-prim']}]`}`,
  expenseValueAmount:      (isPaid) => `font-normal shrink-0 text-lg pointer-events-none ${isPaid ? `text-[${COLORS['color-text-dim']}]` : `text-[${COLORS['color-text-prim']}]`}`,
  expenseValueCurrencyMod: "text-[0.7em] mr-0.5 font-normal",
};

// ─── DRAWER COMPONENT ────────────────────────────────────────────────────
const drawer = {
  containerStyle: { overflow: 'hidden' },
};

// ─── AUTO-TEXTAREA COMPONENT ─────────────────────────────────────────────
const autoTextarea = {
  minHeight: '50px',
  maxLines:  5,
};

// ─── HISTORICAL DRAWER (PAST UNPAID EXPENSES) ────────────────────────────
const historyDrawer = {
  drawerWrapper:              `bg-[${COLORS['color-cardback-dim']}] px-4`,
  rowItemWrapper:             "w-full flex items-center justify-between py-3 cursor-pointer select-none transition-colors active:bg-white/5",
  rowItemFirst:               "pt-3 pb-3",
  rowItemDividerStyle: divider.itemDivider,
  metaSubTextGroup:           "flex flex-col min-w-0 pr-2 pointer-events-none",
  pastMonthLabel:             `font-normal truncate text-[12px] text-[${COLORS['color-text-dim']}]`,
  toggleBar:                  `w-full flex items-center justify-between cursor-pointer hover:opacity-90 select-none bg-[${COLORS['color-cardback-dim']}] py-2 px-4`,
  toggleBarLabelArea:         "flex items-center min-w-0 gap-1.5",
  toggleBarText:              LABELS.secondary,
  toggleBarAmount:            `font-normal shrink-0 text-base text-[${COLORS['color-text-prim']}]/70`,
  toggleBarCurrencyMod:       "text-[0.7em] mr-0.5",
  cardRoundingContainerStyle: (hasPastUnpaidItems) => ({
    borderRadius: hasPastUnpaidItems ? `${RADIUS_STANDARD} ${RADIUS_STANDARD} 0 0` : RADIUS_STANDARD,
    overflow: 'hidden',
  }),
  toggleBarRoundingStyle: {
    borderBottomLeftRadius:  RADIUS_STANDARD,
    borderBottomRightRadius: RADIUS_STANDARD,
  },
};

// ─── MODAL BASE (SHARED MODAL BEHAVIOR) ──────────────────────────────────
const modalBase = {
  backdropOverlay:      "fixed inset-0 flex items-start justify-center px-4 z-50 bg-black/70",
  backdropOverlayStyle: { paddingTop: 'max(32px, env(safe-area-inset-top))' },
  backdropAnimation:    (A) => ({ animation: `fadeIn ${A.modalDuration} ease-out` }),
  contentAnimation:     (A) => ({ animation: `modalContentIn ${A.modalDuration} ${A.modalCurve}` }),
  boxContainer:         `w-full relative shrink-0 bg-[${COLORS['color-cardback-prim']}]`,
  boxContainerStyle:    { borderRadius: RADIUS_STANDARD, maxWidth: MODAL_MAX_WIDTH, padding: '16px' },
};

// ─── EXPENSE MODAL ───────────────────────────────────────────────────────
const modal = {
  expenseModal: {
    containerPadding:         '16px',
    containerMaxWidth:        MODAL_MAX_WIDTH,
    headerRow:                `flex items-center gap-3 mb-3`,
    headerIcon:               `w-6 h-6 shrink-0 text-[${COLORS['color-text-dim']}]`,
    headerTitle:              LABELS.modal,
    amountWrapper:            `h-[52px] px-4 rounded-[6px] bg-[${COLORS['color-cardback-dim']}] w-full flex items-center`,
    amountWrapperErrorStyle:  { outline: `2px solid ${COLORS['color-accent-3']}`, outlineOffset: '0px' },
    amountInput:              `bg-transparent w-full focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[38px] font-normal text-[${COLORS['color-text-prim']}]`,
    descriptionWrapper:       `h-[52px] px-4 rounded-[6px] bg-[${COLORS['color-cardback-dim']}] w-full flex items-center`,
    descriptionInput:         `bg-transparent w-full focus:outline-none text-[16px] font-normal text-[${COLORS['color-text-prim']}]`,
    statusPill:               `w-full h-[52px] rounded-[9999px] flex items-center justify-center gap-2 transition-all duration-300 outline-none select-none cursor-pointer bg-transparent`,
    statusPillRingUnpaid:     `ring-2 ring-[${COLORS['color-accent-3']}]`,
    statusPillRingPaid:       `ring-2 ring-[${COLORS['color-accent-1']}]`,
    statusPillText:           `text-[16px] font-normal text-[${COLORS['color-text-prim']}]`,
    actionRow:                `flex items-center gap-3 w-full`,
    actionBtn:                `h-[52px] rounded-[9999px] font-normal text-[${COLORS['color-text-prim']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none cursor-pointer`,
    okBtn:                    `flex-1 bg-[${COLORS['color-cardback-dim']}] ring-2 ring-[${COLORS['color-accent-1']}]`,
    cancelBtn:                `flex-1 bg-[${COLORS['color-cardback-dim']}]`,
    deleteBtn:                `w-[52px] h-[52px] shrink-0 rounded-[9999px] bg-[${COLORS['color-cardback-dim']}] ring-2 ring-[${COLORS['color-accent-3']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none cursor-pointer`,
    deleteIcon:               `w-6 h-6 text-[${COLORS['color-text-prim']}]`,
  },
  deletePromptTitle:          `font-normal mb-6 text-xl text-[${COLORS['color-text-prim']}] text-center`,
  actionsFlexRow:             `flex items-center gap-3 w-full`,
  deleteYesBtn:               `flex-1 font-normal transition-transform active:scale-95 h-12 rounded-[9999px] text-[${COLORS['color-text-prim']}]`,
  deleteYesBtnStyle:          { backgroundColor: COLORS['color-accent-3'] },
  deleteNoBtn:                `flex-1 font-normal transition-transform active:scale-95 h-12 rounded-[9999px] bg-[${COLORS['color-cardback-dim']}] text-[${COLORS['color-text-prim']}]`,
  amountToDescriptionGap:     '12px',
  descriptionToActionsGap:    '16px',
  calendar: {
    containerMaxWidth:        '376px',
    containerPadding:         '16px',
    yearFontSize:             '36px',
    yearFontWeight:           'bold',
    yearColor:                COLORS['color-text-prim'],
    monthGridGap:             '10px',
    monthButtonHeight:        '52px',
    monthButtonMinWidth:      '52px',
    monthButtonRadius:        '9999px',
    monthButtonBg:            COLORS['color-cardback-dim'],
    monthButtonColor:         COLORS['color-text-prim'],
    monthButtonFontSize:      '13px',
    monthButtonFontWeight:    'bold',
    monthButtonLetterSpacing: '0.025em',
    monthButtonActiveRing:    `2px solid ${COLORS['color-accent-1']}`,
    footerGap:                '16px',
    footerButtonHeight:       '52px',
    footerButtonRadius:       '9999px',
    footerButtonBg:           COLORS['color-cardback-dim'],
    footerButtonColor:        COLORS['color-text-prim'],
    footerButtonFontSize:     '16px',
    footerButtonFontWeight:   'bold',
    footerOKRing:             `2px solid ${COLORS['color-accent-1']}`,
  },
};

// ─── CARD PROFILE MODAL (ADD/EDIT RESIDENT) ──────────────────────────────
const cardModal = {
  wrapper:              `w-full max-w-[${MODAL_MAX_WIDTH}]`,
  containerPadding:     '12px',
  containerGap:         '16px',
  headerRow:            "flex items-center gap-3 mb-0",
  headerIcon:           `w-6 h-6 shrink-0 text-[${COLORS['color-text-dim']}]`,
  headerLabel:          LABELS.modal,
  fieldsContainer:      "flex flex-col",
  fieldGap:             '8px',
  notesSectionGap:      '16px',
  fieldWrapper:         `bg-[${COLORS['color-cardback-dim']}] rounded-[6px] w-full`,
  fieldInput:           `w-full bg-transparent focus:outline-none`,
  fieldHeight:          '52px',
  fieldPadding:         '12px 16px',
  nameFieldInput:       `font-normal text-[18px] text-[${COLORS['color-text-prim']}]`,
  apartmentFieldInput:  `font-normal text-[18px] text-[${COLORS['color-text-prim']}]`,
  placeholderStyle: `text-[16px] font-normal placeholder:text-[${COLORS['color-text-dim']}]`,
  notesSection:         "flex flex-col",
  notesTitleRow:        "flex items-center gap-2 mb-2",
  notesIcon:            `w-6 h-6 text-[${COLORS['color-text-dim']}]`,
  notesTitle:           `text-sm font-normal text-[${COLORS['color-text-dim']}]`,
  notesFieldWrapper:    `bg-[${COLORS['color-cardback-dim']}] rounded-[6px] w-full`,
  notesField:           `w-full bg-transparent focus:outline-none resize-none overflow-hidden text-[16px] font-normal text-[${COLORS['color-text-prim']}]`,
  notesFieldPadding:    '12px 16px',
  notesFieldMinHeight:  '52px',
  buttonRow:            "flex items-center gap-3 w-full mt-0",
  buttonGap:            '16px',
  baseBtn:              `h-[44px] rounded-[9999px] font-normal text-[${COLORS['color-text-prim']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none`,
  okBtn:                `flex-1 bg-[${COLORS['color-cardback-dim']}] ring-2 ring-[${COLORS['color-accent-1']}]`,
  nextBtn:              `flex-1 bg-[${COLORS['color-cardback-dim']}] text-[${COLORS['color-background']}]`,
  cancelTextBtn:        `flex-1 bg-[${COLORS['color-cardback-dim']}] text-[${COLORS['color-text-prim']}]`,
  trashBtn:             `w-[44px] h-[44px] shrink-0 rounded-[9999px] bg-[${COLORS['color-cardback-dim']}] ring-2 ring-[${COLORS['color-accent-3']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none`,
  trashIconSize:        `w-5 h-5 text-[${COLORS['color-text-prim']}]`,
  deleteConfirmBoxStyle:{ borderRadius: RADIUS_STANDARD, maxWidth: MODAL_MAX_WIDTH, padding: '20px' },
  deleteConfirmTitle:   `font-normal text-xl text-[${COLORS['color-text-prim']}] text-center mb-6 leading-snug`,
  deleteConfirmRow:     "flex items-center gap-4",
  deleteConfirmYesBtn:  `flex-1 h-[44px] rounded-[9999px] bg-[${COLORS['color-extra']}] ring-2 ring-[${COLORS['color-accent-3']}] font-normal text-[${COLORS['color-text-prim']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none`,
  deleteConfirmNoBtn:   `flex-1 h-[44px] rounded-[9999px] bg-[${COLORS['color-extra']}] font-normal text-[${COLORS['color-text-prim']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none`,
};

// ─── WALLET FLIP BUTTON (3D TOGGLE) ──────────────────────────────────────
const _flipFaceBase = {
  position: 'absolute',
  top: 0, left: 0,
  width: '100%', height: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

const walletFlipBtn = {
  container:      "w-[52px] h-[52px] flex items-center justify-center shrink-0",
  containerStyle: { perspective: '200px' },
  flipperStyle:   (isBuilding, duration) => ({
    transition:     `transform ${duration} cubic-bezier(0.25, 1, 0.5, 1)`,
    transform:      isBuilding ? 'rotateY(180deg)' : 'rotateY(0deg)',
    transformStyle: 'preserve-3d',
    width:          '28px',
    height:         '28px',
  }),
  faceBase:      { ..._flipFaceBase },
  backFaceStyle: { ..._flipFaceBase, transform: 'rotateY(180deg)' },
  faceIconSize:  `w-8 h-8 text-[${COLORS['color-text-prim']}]`,
};

// ─── VIEW TRANSITION (CARDS ↔ BUILDING) ──────────────────────────────────
const viewTransition = {
  outerStyle:           { position: 'relative' },
  exitStyle:            (duration, curve) => ({
    position: 'absolute', top: 0, left: 0, right: 0,
    pointerEvents: 'none',
    animation: `viewExitRecede ${duration} ${curve} forwards`,
    zIndex: 0,
  }),
  enterFromRightStyle:  (duration, curve) => ({
    animation: `viewEnterFromRight ${duration} ${curve} forwards`,
    zIndex: 1, position: 'relative',
  }),
  enterFromLeftStyle:   (duration, curve) => ({
    animation: `viewEnterFromLeft ${duration} ${curve} forwards`,
    zIndex: 1, position: 'relative',
  }),
};

// ─── BUILDING EXPENSES VIEW ──────────────────────────────────────────────
const buildingExpenses = {
  listContainer:        "flex flex-col",
  labelRow:             "flex items-center justify-between w-full",
  sectionLabel:         LABELS.primary,
  totalLabel:           LABELS.primary,
  totalAmount:          `font-normal text-[18px] text-[${COLORS['color-accent-2']}] ml-1`,
  totalCurrencyMod:     `font-normal text-[${COLORS['color-accent-2']}] text-[0.7em] mr-0.5`,
  addBtn:               `w-[100px] h-[44px] rounded-[22px] bg-[${COLORS['color-cardback-dim']}] ring-2 ring-[${COLORS['color-accent-1']}] font-normal text-sm text-[${COLORS['color-text-prim']}] flex items-center justify-center outline-none shrink-0 transition-transform active:scale-95`,
  addBtnWrapper:        "flex",
  addBtnGap:            '30px',
  itemsWrapper:         "flex flex-col",
  itemRow:              "w-full flex items-center justify-between py-3 cursor-pointer select-none transition-colors active:bg-white/5",
  itemRowDivider: divider.itemDivider,
  itemLeft:             "flex items-center min-w-0 gap-3 pointer-events-none",
  itemIconArea:         "shrink-0 h-5 flex items-center pointer-events-none",
  itemDescription:      (isPaid) => `font-normal truncate pr-2 text-base ${isPaid ? `text-[${COLORS['color-text-dim']}] line-through decoration-[${COLORS['color-accent-1']}] decoration-1` : `text-[${COLORS['color-text-prim']}]`}`,
  itemAmount:           (isPaid) => `font-normal shrink-0 text-lg pointer-events-none ${isPaid ? `text-[${COLORS['color-text-dim']}]` : `text-[${COLORS['color-text-prim']}]`}`,
  itemCurrencyMod:      "text-[0.7em] mr-0.5 font-normal",
  cardContainer:        `bg-[${COLORS['color-cardback-prim']}] rounded-[12px] overflow-hidden px-4`,
  cardContainerGap:     '16px',
  prevLabel:            LABELS.primary,
  prevLabelWrapper:     "flex items-center justify-between w-full",
  prevItemTextCol:      "flex flex-col min-w-0",
  prevMonthSubLabel:    `font-normal truncate text-[12px] text-[${COLORS['color-text-dim']}]`,
  sectionPaddingTop:    '16px',
  sectionPaddingBottom: '16px',
};

// ─── EXPENSE MODAL CONTEXT CONFIGS ───────────────────────────────────────
const expenseModalConfigs = {
  resident: { deleteModeType: 'delete' },
  building: { deleteModeType: 'buildingDelete' },
};

// ─── EXPORT ALL DESIGN TOKENS ────────────────────────────────────────────
const DESIGN = {
  colors: COLORS,
  themes: THEMES,
  applyTheme,
  labels: LABELS,
  icons,
  iconColors,
  currencyOptions,
  fontFamily,
  animation,
  layout,
  header,
  spacing,
  navigationPill,
  settingsModal,
  deleteRangeModal,
  residentCard,
  drawer,
  autoTextarea,
  divider,
  historyDrawer,
  modalBase,
  modal,
  cardModal,
  walletFlipBtn,
  viewTransition,
  buildingExpenses,
  expenseModalConfigs,
};

window.DESIGN = DESIGN;

export default DESIGN;