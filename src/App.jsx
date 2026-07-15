// =========================================================================
// MAIN APPLICATION CONTROLLER
// =========================================================================
// Manages residents, expenses, navigation state, and user interactions.
// All styling references use window.DESIGN tokens — no hardcoded hex values.
//
// WalletFlipButton, BuildingExpenses, and ResidentListView live in this file
// (rather than primitives.jsx/modals.jsx) because they're tightly bound to
// the dashboard's own state and layout, not generic reusable pieces.
// =========================================================================

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  getSystemDate, STORAGE_KEY, STORAGE_VERSION,
  loadPersistedData, savePersistedData, formatDateStamp,
  TIMELINE_YEARS, DEFAULT_MONTH_NAMES,
  formatAmount, smoothScrollTo, generateInitialResidents,
  makeId, isValidBackupShape,
} from './utils.js';
import {
  SpriteIcon, NavigationPill, Drawer, ModalWrapper,
  PaidStatusIcon, CurrencySymbol, AmountSpan,
} from './primitives.jsx';
import {
  CardProfileModal, DeleteCardConfirmModal, ExpenseModal,
  MonthYearPickerModal, DeleteRangeModal, SettingsModal,
} from './modals.jsx';
import ReportOverlay from './report.jsx';

// Translations are bundled directly into the app (rather than fetched over
// the network at startup) so the app never depends on a network request —
// or on a file path that happens to resolve correctly — just to show text.
// This matters a lot once the app is wrapped for Android: fetching local
// files like this can silently fail inside a native WebView depending on
// how the app is packaged, which would otherwise leave the whole app stuck
// on a loading screen forever.
//
// NOTE: this import assumes lang.json lives in the same folder as this file
// (next to App.jsx, main.jsx, etc). If it currently lives in a separate
// "public" folder, move it next to these files for this import to work.
import translationsData from './lang.json';

// ─── 3D FLIP BUTTON (CARDS ↔ BUILDING VIEW) ──────────────────────────────
function WalletFlipButton({ onToggle, t }) {
  const WFB = window.DESIGN.walletFlipBtn;
  const A   = window.DESIGN.animation;
  const [isFlipped, setIsFlipped] = useState(false);

  const handlePress = () => { setIsFlipped(prev => !prev); onToggle(); };

  return (
    <button
      style={WFB.containerStyle}
      className={WFB.container}
      onClick={handlePress}
      aria-label={isFlipped ? t('show_resident_cards') : t('show_building_expenses')}
    >
      <div style={WFB.flipperStyle(isFlipped, A.coinFlipDuration)}>
        <div style={WFB.faceBase}>
          <SpriteIcon id="expenses-icn"     className={WFB.faceIconSize} />
        </div>
        <div style={WFB.backFaceStyle}>
          <SpriteIcon id="resident-card-icn" className={WFB.faceIconSize} />
        </div>
      </div>
    </button>
  );
}


// ─── BUILDING EXPENSES VIEW ───────────────────────────────────────────────
function BuildingExpenses({ regularExpenses, fixedExpenses, currentMonthString, currentMonthKey, isPastExpense, activeCurrencySymbol, openBuildingModal, t }) {
  const BE = window.DESIGN.buildingExpenses;
  const today = getSystemDate();
  const todayMonthKey = today.getFullYear() * 12 + today.getMonth();
  const isFutureMonth = currentMonthKey > todayMonthKey;

  // Combine regular and fixed expenses; fixed ones are marked with isRecurring
  const allExpenses = [...regularExpenses, ...fixedExpenses];

  // Separate current vs past unpaid (for regular + fixed)
  const currentExpenses = allExpenses.filter(exp => exp.monthKey === currentMonthKey);
  const pastUnpaidExpenses = allExpenses.filter(exp => isPastExpense(exp.monthKey) && !exp.paid);

  // For future month, we exclude unpaid fixed expenses from totals but still show them greyed out
  const hasCurrent = currentExpenses.length > 0;
  const hasPast = pastUnpaidExpenses.length > 0;

  return (
    <div className={BE.listContainer}>

      <div className={BE.cardContainer} style={{ marginBottom: hasPast ? BE.cardContainerGap : undefined }}>
        <div className={BE.labelRow} style={{ paddingTop: BE.sectionPaddingTop, marginBottom: hasCurrent ? '0px' : BE.addBtnGap }}>
          <span className={BE.sectionLabel}>
            {hasCurrent ? t('expenses') : t('no_expenses_this_month_building')}
          </span>
        </div>

        {hasCurrent && (
          <div className={BE.itemsWrapper} style={{ marginBottom: BE.addBtnGap }}>
            {currentExpenses.map((exp, idx) => {
              // Determine if clickable: only when not future-unpaid
              const isClickable = !(exp.isRecurring && exp.isFutureUnpaid);
              const rowClassName = `${BE.itemRow} ${idx > 0 ? BE.itemRowDivider : ''}`;

              return (
                <div
                  key={exp.id}
                  className={rowClassName}
                  onClick={() => {
                    if (isClickable) {
                      openBuildingModal(exp.isRecurring ? 'editFixed' : 'edit', exp);
                    }
                  }}
                  style={exp.isFutureUnpaid ? { opacity: 0.5, cursor: 'default' } : {}}
                >
                  <div className={BE.itemLeft}>
                    <div className={BE.itemIconArea} style={BE.itemIconAreaStyle}><PaidStatusIcon paid={exp.paid} /></div>
                    {exp.isRecurring && !exp.isFutureUnpaid && (
  <SpriteIcon
    id="recurring-icn"
    className={BE.recurringIcon.class}
    style={{
      ...BE.recurringIcon.style,
      color: BE.recurringIconColor[exp.paid ? 'paid' : 'unpaid']
    }}
  />
)}
                    <span className={BE.itemDescription(exp.paid)}>
                      {exp.description}
                    </span>
                  </div>
                  <span className={BE.itemAmount(exp.paid)}>
                    <CurrencySymbol activeSymbol={activeCurrencySymbol} className={BE.itemCurrencyMod} />
                    <AmountSpan amount={exp.amount} isPaid={exp.paid} />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className={BE.addBtnWrapper} style={{ paddingBottom: BE.sectionPaddingBottom }}>
          <button className={BE.addBtn} onClick={() => openBuildingModal('add')}>{t('add_expense')}</button>
        </div>
      </div>

      {hasPast && (
        <div className={BE.cardContainer}>
          <div className={BE.prevLabelWrapper} style={{ paddingTop: BE.sectionPaddingTop, marginBottom: '0px' }}>
            <span className={BE.prevLabel}>{t('unpaid_from_previous_months')}</span>
          </div>
          <div className={BE.itemsWrapper} style={{ paddingBottom: BE.sectionPaddingBottom }}>
            {pastUnpaidExpenses.map((exp, idx) => (
              <div
                key={exp.id}
                className={`${BE.itemRow} ${idx > 0 ? BE.itemRowDivider : ''}`}
                onClick={() => openBuildingModal(exp.isRecurring ? 'editFixed' : 'edit', exp)}
              >
                <div className={BE.itemLeft}>
                  <div className={BE.itemIconArea} style={BE.itemIconAreaStyle}><PaidStatusIcon paid={exp.paid} /></div>
                  {exp.isRecurring && (
  <SpriteIcon
    id="recurring-icn"
    className={BE.recurringIcon.class}
    style={{
      ...BE.recurringIcon.style,
      color: BE.recurringIconColor[exp.paid ? 'paid' : 'unpaid']
    }}
  />
)}
                  <div className={BE.prevItemTextCol}>
                    <span className={BE.itemDescription(exp.paid)}>
                      {exp.description}
                    </span>
                    <span className={BE.prevMonthSubLabel}>{exp.month}</span>
                  </div>
                </div>
                <span className={BE.itemAmount(exp.paid)}>
                  <CurrencySymbol activeSymbol={activeCurrencySymbol} className={BE.itemCurrencyMod} />
                  <AmountSpan amount={exp.amount} isPaid={exp.paid} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── RESIDENT LIST VIEW ───────────────────────────────────────────────────
// Renders all resident cards, their expense rows, and past-debt drawers.
function ResidentListView({
  processedResidents, currentMonthKey, currentMonthString,
  expandedResident, openPreviousDrawer,
  activeCurrencySymbol, cardRefs,
  onResidentHeaderClick, onTogglePreviousDrawer,
  onOpenResidentModal, onOpenEditCard,
  isPastExpense, t,
}) {
  const D    = window.DESIGN;
  const CARD = D.residentCard;
  const DRW  = D.historyDrawer;
  const A    = D.animation;
  const IC   = D.iconColors;
  const ICN  = D.icons;

  return (
    <div className={CARD.cardListContainer}>
      {processedResidents.map(resident => {
        const isExpanded   = expandedResident === resident.id;
        const isDrawerOpen = isExpanded && (openPreviousDrawer[resident.id] || false);

        const currentMonthExpenses = resident.expenses.filter(exp => exp.monthKey === currentMonthKey);
        const pastUnpaidExpenses   = resident.expenses.filter(exp => isPastExpense(exp.monthKey) && !exp.paid);

        const currentUnpaidTotal = currentMonthExpenses.filter(exp => !exp.paid).reduce((sum, exp) => sum + exp.amount, 0);
        const pastUnpaidTotal    = pastUnpaidExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalResidentDebt  = currentUnpaidTotal + pastUnpaidTotal;

        const hasCurrentExpenses  = currentMonthExpenses.length > 0;
        const allCurrentPaid      = hasCurrentExpenses && currentMonthExpenses.every(exp => exp.paid);
        const hasNoDebts          = !hasCurrentExpenses || allCurrentPaid;

        const monthLabelText = hasNoDebts
  ? t('no_debts', { month: currentMonthString })
  : t('debts_for_month', { month: currentMonthString });
        const monthLabelClass = hasNoDebts ? CARD.monthActionLabelNoDebt : CARD.monthActionLabel;

        const combinedCurrentExpenses  = [...currentMonthExpenses].sort((a, b) => a.paid - b.paid);
        const hasPastUnpaidItems       = pastUnpaidExpenses.length > 0;

        return (
          <div
            key={resident.id}
            ref={el => cardRefs.current[resident.id] = el}
            style={DRW.cardRoundingContainerStyle(hasPastUnpaidItems)}
            className={CARD.cardWrapper}
          >
            <div className={CARD.cardBody}>
              <div className={CARD.cardInnerPadding}>

                <div className={CARD.cardHeaderContainer}>
                  <button className={CARD.avatarBtn} onClick={e => onOpenEditCard(resident.id, e)}>
                    {totalResidentDebt > 0
                      ? <SpriteIcon id="icon-avatar-debt"   className={CARD.avatarIcon}      style={IC.avatarDebt} />
                      : <SpriteIcon id="icon-avatar-nodebt" className={CARD.avatarIconNoDebt} style={IC.avatarNoDebt} />
                    }
                  </button>

                  <div className={CARD.cardHeaderContent}>
                    <div className={CARD.cardTopRow} onClick={() => onResidentHeaderClick(resident.id)}>
                      <div className={CARD.textMetaArea}>
                        <h2 className={CARD.residentName}>{resident.name}</h2>
                        <p className={CARD.apartmentNumber}>{resident.apartment}</p>
                      </div>
                      <span style={CARD.caretRotationStyle(isExpanded, A)}>
                        <SpriteIcon id="icon-caret" className={ICN.caretIconSize} />
                      </span>
                    </div>

                    <div className={CARD.cardBottomRow} onClick={() => onResidentHeaderClick(resident.id)}>
                      {totalResidentDebt > 0
                        ? <span className={CARD.totalDebtText}>
                            <CurrencySymbol activeSymbol={activeCurrencySymbol} className={CARD.totalDebtCurrencyMod} />
                            {formatAmount(totalResidentDebt)}
                          </span>
                        : <span className={CARD.noDebtText}>{t('no_debt')}</span>
                      }
                    </div>
                  </div>
                </div>

                <Drawer isOpen={isExpanded}>
                  <div>
                    <div className={CARD.monthActionRow}>
                      <span className={monthLabelClass}>{monthLabelText}</span>
                      <button onClick={() => onOpenResidentModal('add', resident.id)} className={CARD.addExpenseBtn}>
                        {t('add_expense')}
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      {combinedCurrentExpenses.length > 0 && (
                        <div>
                          {combinedCurrentExpenses.map((expense, idx) => (
                            <div
                              key={expense.id}
                              className={`${idx === 0 ? '' : CARD.itemRowDividerStyle} ${CARD.itemRowWrapper}`}
                              onClick={() => onOpenResidentModal('edit', resident.id, expense.id, expense.amount.toString(), expense.description, expense.paid)}
                            >
                              <div className={CARD.interactiveIconArea}>
                                <div className={CARD.iconStateBtn}><PaidStatusIcon paid={expense.paid} /></div>
                                <span className={CARD.expenseDescription(expense.paid)}>{expense.description}</span>
                              </div>
                              <span className={CARD.expenseValueAmount(expense.paid)}>
                                <CurrencySymbol activeSymbol={activeCurrencySymbol} className={CARD.expenseValueCurrencyMod} />
                                <AmountSpan amount={expense.amount} isPaid={expense.paid} />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Drawer>

              </div>
            </div>

            {hasPastUnpaidItems && (
              <div>
                <Drawer isOpen={isDrawerOpen}>
                  <div className={DRW.drawerWrapper}>
                    {pastUnpaidExpenses.map((pastExpense, idx) => (
                      <div
                        key={pastExpense.id}
                        className={`${idx === 0 ? DRW.rowItemFirst : DRW.rowItemDividerStyle} ${DRW.rowItemWrapper}`}
                        onClick={() => onOpenResidentModal('edit', resident.id, pastExpense.id, pastExpense.amount.toString(), pastExpense.description, pastExpense.paid)}
                      >
                        <div className={CARD.interactiveIconArea}>
                          <div className={CARD.iconStateBtn}><PaidStatusIcon paid={pastExpense.paid} /></div>
                          <div className={DRW.metaSubTextGroup}>
                            <span className={CARD.expenseDescription(pastExpense.paid)}>{pastExpense.description}</span>
                            <span className={DRW.pastMonthLabel}>{pastExpense.month}</span>
                          </div>
                        </div>
                        <div className={CARD.expenseValueAmount(pastExpense.paid)}>
                          <CurrencySymbol activeSymbol={activeCurrencySymbol} className={CARD.expenseValueCurrencyMod} />
                          <AmountSpan amount={pastExpense.amount} isPaid={pastExpense.paid} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Drawer>

                <div onClick={() => onTogglePreviousDrawer(resident.id)} style={DRW.toggleBarRoundingStyle} className={DRW.toggleBar}>
                  <div className={DRW.toggleBarLabelArea} style={{ marginLeft: 'auto' }}>
                    <span className={DRW.toggleBarText}>{t('previous_months_total')}</span>
                    <span className={DRW.toggleBarAmount}>
                      <CurrencySymbol activeSymbol={activeCurrencySymbol} className={DRW.toggleBarCurrencyMod} />
                      {formatAmount(pastUnpaidTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ─── MAIN APP ─────────────────────────────────────────────────────────────
export default function App() {
  const D      = window.DESIGN;
  const LAYOUT = D.layout;
  const HDR    = D.header;
  const MB     = D.modalBase;
  const A      = D.animation;
  const CM     = D.cardModal;
  const SPC    = D.spacing;
  const IC     = D.iconColors;
  const ICN    = D.icons;
  const COLORS = D.colors;

  // ─── LOCALIZATION ──────────────────────────────────────────────────────
  // `translations` comes from the bundled lang.json import above, so it's
  // always available immediately — there's no "still loading" state to
  // handle for this anymore.
  const translations = translationsData;
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Looks up a piece of UI text by key, in the currently selected language,
  // falling back to English and then to the raw key itself if a translation
  // is ever missing. `replacements` lets a caller fill in placeholders, e.g.
  // t('debts_for_month', { month: 'May 2026' }) turns "Debts / {month}" into
  // "Debts / May 2026".
  const t = useCallback((key, replacements = {}) => {
    if (!translations || !translations[key]) return key;
    let value = translations[key][currentLanguage] || translations[key]['en'] || key;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      Object.keys(replacements).forEach(ph => { value = value.replace(`{${ph}}`, replacements[ph]); });
    }
    return value;
  }, [translations, currentLanguage]);

  useEffect(() => {
    if (LAYOUT?.appBackgroundHex) document.body.style.backgroundColor = LAYOUT.appBackgroundHex;
  }, []);

  // ─── DATE / MONTH STATE ────────────────────────────────────────────────
  const monthNames = translations?.months ? t('months') : DEFAULT_MONTH_NAMES;
  const [currentMonthIdx,  setCurrentMonthIdx]  = useState(() => getSystemDate().getMonth());
  const [currentYear,      setCurrentYear]      = useState(() => getSystemDate().getFullYear());
  const currentMonthString = monthNames.length ? `${monthNames[currentMonthIdx]} ${currentYear}` : '';
  const currentMonthKey    = currentYear * 12 + currentMonthIdx;

  // Recomputed on every render (rather than compared against a date that
  // was only ever captured once) so this stays correct even if the app has
  // been sitting open for days — which is normal for a native Android app
  // that isn't reloaded just because the calendar day changed.
  const isFilteredAwayFromToday = currentMonthIdx !== getSystemDate().getMonth() || currentYear !== getSystemDate().getFullYear();

  const handlePrevMonth = () => {
    if (currentMonthIdx === 0)  { setCurrentMonthIdx(11); setCurrentYear(y => y - 1); }
    else setCurrentMonthIdx(m => m - 1);
  };
  const handleNextMonth = () => {
    if (currentMonthIdx === 11) { setCurrentMonthIdx(0);  setCurrentYear(y => y + 1); }
    else setCurrentMonthIdx(m => m + 1);
  };
  const handleGoToCurrentMonth = () => {
    if (isFilteredAwayFromToday) {
      setCurrentMonthIdx(getSystemDate().getMonth());
      setCurrentYear(getSystemDate().getFullYear());
    }
  };

  // ─── DATA STATE ────────────────────────────────────────────────────────
  const [residents,       setResidents]       = useState([]);
  const [buildingExpenses, setBuildingExpenses] = useState([]);
  const [fixedTemplates, setFixedTemplates] = useState([]);
  const [fixedAmountOverrides, setFixedAmountOverrides] = useState([]);
  const [fixedPaidStatuses, setFixedPaidStatuses] = useState([]);

  // ─── VIEW STATE ────────────────────────────────────────────────────────
  const [isMainMenuOpen,       setIsMainMenuOpen]       = useState(false);
  const [isBuildingView,       setIsBuildingView]       = useState(false);
  const [buildingViewAnimState, setBuildingViewAnimState] = useState('idle');
  const [expandedResident,     setExpandedResident]     = useState(null);
  const [openPreviousDrawer,   setOpenPreviousDrawer]   = useState({});
  const [currentSortBy,        setCurrentSortBy]        = useState('Tag');
  const [currencyIndex,        setCurrencyIndex]        = useState(0);
  const [themeIndex,           setThemeIndex]           = useState(0);
  const [isHeaderPickerOpen,   setIsHeaderPickerOpen]   = useState(false);
  const [isReportOpen,         setIsReportOpen]         = useState(false);

  // ─── PERSISTENCE-AWARE INITIAL LOAD ─────────────────────────────────────
  // Runs once, right after the app first mounts: loads previously saved data
  // from localStorage if there is any; otherwise fills the app with sample
  // demo residents so there's something to look at on a first run.
  // This effect intentionally has an empty dependency array ([]) so it only
  // ever runs a single time — translations are always available immediately
  // now (see the bundled `translationsData` import above), so there's no
  // need to wait for anything to finish loading first.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (residents.length > 0 || buildingExpenses.length > 0) return;

    const persisted = loadPersistedData();
    if (persisted) {
      setResidents(persisted.residents);
      setBuildingExpenses(persisted.buildingExpenses);
      setFixedTemplates(persisted.fixedTemplates || []);
      setFixedAmountOverrides(persisted.fixedAmountOverrides || []);
      setFixedPaidStatuses(persisted.fixedPaidStatuses || []);
      const s = persisted.settings || {};
      if (s.language === 'en' || s.language === 'gr') setCurrentLanguage(s.language);
      if (s.sortBy === 'Tag' || s.sortBy === 'Debt') setCurrentSortBy(s.sortBy);
      if (typeof s.currencyIndex === 'number') setCurrencyIndex(s.currencyIndex);
      if (typeof s.themeIndex === 'number') setThemeIndex(s.themeIndex);
    } else {
      const names = translationsData['months']['en'];
      const now   = getSystemDate();
      const key   = now.getFullYear() * 12 + now.getMonth();
      const str   = `${names[now.getMonth()]} ${now.getFullYear()}`;
      setResidents(generateInitialResidents(names, str, key));
    }
    initializedRef.current = true;
  }, []);

  // ─── DEBOUNCED PERSISTENCE SAVE ──────────────────────────────────────────
  // Skips writes until the initial hydration above has run, so we never
  // clobber a saved backup with the transient empty initial state.
  useEffect(() => {
    if (!initializedRef.current) return;
    const timer = setTimeout(() => {
      savePersistedData({
        residents,
        buildingExpenses,
        fixedTemplates,
        fixedAmountOverrides,
        fixedPaidStatuses,
        settings: {
          language: currentLanguage,
          sortBy: currentSortBy,
          currencyIndex,
          themeIndex,
        },
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [residents, buildingExpenses, fixedTemplates, fixedAmountOverrides, fixedPaidStatuses, currentLanguage, currentSortBy, currencyIndex, themeIndex]);

  const headerRef       = useRef(null);
  const cardRefs        = useRef({});
  // Remember the currently-scheduled "view transition finished" and
  // "scroll to this card" timers, so that if the user taps again before a
  // timer fires, we can cancel the old one first. Without this, rapidly
  // tapping the flip button or a resident card would queue up multiple
  // timers that all eventually fire, causing the view-transition state or
  // scroll position to jump around unexpectedly.
  const viewTransTimerRef = useRef(null);
  const scrollTimerRef    = useRef(null);

  // Flips between the resident-cards view and the building-expenses view,
  // with a short animated transition in between. Cancels any transition
  // still in progress from a previous tap before starting a new one.
  const handleToggleView = useCallback(() => {
    clearTimeout(viewTransTimerRef.current);
    const duration = parseFloat(A.viewTransitionDuration) * 1000;
    window.scrollTo({ top: 0 });
    setExpandedResident(null);
    setOpenPreviousDrawer({});
    setBuildingViewAnimState('transitioning');
    viewTransTimerRef.current = setTimeout(() => setBuildingViewAnimState('idle'), duration);
    setIsBuildingView(prev => !prev);
  }, [A.viewTransitionDuration]);

  const activeCurrencySymbol = useMemo(
    () => D.currencyOptions[currencyIndex]?.symbol ?? '€',
    [currencyIndex]
  );

  const cycleCurrency = (direction) => {
    setCurrencyIndex(prev => {
      let next = prev + direction;
      if (next < 0) next = D.currencyOptions.length - 1;
      if (next >= D.currencyOptions.length) next = 0;
      return next;
    });
  };

  // ─── SETTINGS: LANGUAGE / SORT / THEME ──────────────────────────────────
  const toggleLanguage = () => setCurrentLanguage(prev => (prev === 'en' ? 'gr' : 'en'));
  const toggleSortBy   = () => setCurrentSortBy(prev => (prev === 'Tag' ? 'Debt' : 'Tag'));
  const cycleCurrencyForward = () => cycleCurrency(1);

  // Applies the active color theme as soon as it changes (and on initial
  // hydration from persisted settings), using the CSS-variable transition
  // configured in DesignConfig.js.
  useEffect(() => {
    if (D.applyTheme) D.applyTheme(themeIndex);
  }, [themeIndex]);

  const cycleTheme = () => {
    const count = D.themes?.length || 1;
    setThemeIndex(prev => (prev + 1) % count);
  };

  // ─── SETTINGS: EXPORT / IMPORT DATA BACKUP ──────────────────────────────
  // Builds the full backup payload (all residents, building expenses, and
  // settings) as a plain object. Shared by both the export button and the
  // native bridge below, so there's only one place that defines what a
  // backup contains.
  const buildBackupPayload = () => ({
    version: STORAGE_VERSION,
    residents,
    buildingExpenses,
    fixedTemplates,
    fixedAmountOverrides,
    fixedPaidStatuses,
    settings: { language: currentLanguage, sortBy: currentSortBy, currencyIndex, themeIndex },
  });

  // Saves a backup file of all the app's data.
  //
  // In a normal web browser, this creates the file in memory and triggers a
  // regular browser download.
  //
  // Inside a native Android wrapper, browser downloads like this often
  // aren't shown to the person using the app unless the native side is set
  // up to handle them — so instead, if the native app has installed a
  // `window.NativeBridge.saveBackupFile` function, we hand the data to that
  // function and let the native side decide how to save it (e.g. showing
  // Android's own "Save file" screen). If that bridge isn't there (for
  // example, during regular web development), it falls back to the normal
  // browser download exactly as before.
  const handleExportData = () => {
    const payload = JSON.stringify(buildBackupPayload());
    const fileName = `neiboard-backup-${formatDateStamp(getSystemDate())}.json`;

    if (window.NativeBridge && typeof window.NativeBridge.saveBackupFile === 'function') {
      window.NativeBridge.saveBackupFile(fileName, payload);
      return;
    }

    const blob = new Blob([payload], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reads a backup JSON file the person selected (or one handed to us by a
  // native "open file" bridge) and restores it. `isValidBackupShape` checks
  // that every resident and expense actually has the fields the rest of the
  // app expects, so a corrupted or hand-edited file can't sneak in broken
  // data that would crash the app later.
  const restoreFromBackupText = (jsonText) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!isValidBackupShape(parsed)) {
        console.error('Invalid backup file: it is missing fields the app needs, or has the wrong shape.');
        window.alert('That backup file could not be read — it may be damaged or from an incompatible version of the app.');
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...parsed }));
      window.location.reload();
    } catch (err) {
      console.error('Failed to parse imported backup file:', err);
      window.alert('That file could not be read as a Neiboard backup.');
    }
  };

  // Triggered by the "Import Data" button. On the web this reads a file the
  // person picked with the browser's own file picker. Inside a native
  // Android wrapper, opening a file picker from inside a WebView normally
  // requires the native side to handle it — so if a
  // `window.NativeBridge.pickBackupFile` function has been installed, we
  // ask it to obtain the file's text for us instead, and restore from that.
  const handleImportFile = (file) => {
    if (window.NativeBridge && typeof window.NativeBridge.pickBackupFile === 'function') {
      window.NativeBridge.pickBackupFile().then(restoreFromBackupText);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => restoreFromBackupText(e.target.result);
    reader.readAsText(file);
  };

  // ─── SETTINGS: RANGE-BASED DATA DELETION ────────────────────────────────
  // Receives { monthIdx, year } boundaries from the Delete Range sub-modal.
  // Mirrors the original swap-safety behavior: reversed ranges are
  // normalized rather than silently deleting everything.
  const handleDeleteDataRange = (fromDate, toDate) => {
    const rawStart = fromDate.year * 12 + fromDate.monthIdx;
    const rawEnd   = toDate.year * 12 + toDate.monthIdx;
    const startKey = Math.min(rawStart, rawEnd);
    const endKey   = Math.max(rawStart, rawEnd);

    setResidents(prev =>
      prev.map(res => ({
        ...res,
        expenses: res.expenses.filter(exp => exp.monthKey < startKey || exp.monthKey > endKey),
      }))
    );
    setBuildingExpenses(prev =>
      prev.filter(exp => exp.monthKey < startKey || exp.monthKey > endKey)
    );
    // Also delete fixed templates that were created within the range? We'll keep them separate for now.
    // For simplicity, we'll not delete fixed templates automatically; users can stop them manually.
  };

  const totalAllDebts = useMemo(
  () => residents.reduce((total, resident) =>
    total + resident.expenses.filter(exp => !exp.paid).reduce((sum, exp) => sum + exp.amount, 0), 0),
  [residents]
);

const totalBuildingDebt = useMemo(() => {
  const today = getSystemDate();
  const todayMonthKey = today.getFullYear() * 12 + today.getMonth();
  // Regular expenses: always count unpaid
  const regularUnpaid = buildingExpenses.filter(exp => !exp.paid).reduce((sum, exp) => sum + exp.amount, 0);
  // Fixed expenses: count unpaid only if they are NOT future (monthKey <= todayMonthKey)
  const fixedUnpaid = fixedTemplates.reduce((sum, template) => {
    // Skip if deleted before today
    if (template.deletedAt !== null && template.deletedAt <= todayMonthKey) return sum;
    // Find amount for today (or closest override)
    let amount = template.baseAmount;
    const override = fixedAmountOverrides
      .filter(o => o.templateId === template.id && o.monthKey <= todayMonthKey)
      .sort((a, b) => b.monthKey - a.monthKey)[0];
    if (override) amount = override.newAmount;
    // Check if this month's instance is paid
    const paidEntry = fixedPaidStatuses.find(p => p.templateId === template.id && p.monthKey === todayMonthKey);
    const isPaid = paidEntry ? paidEntry.paid : false;
    if (!isPaid) return sum + amount;
    return sum;
  }, 0);
  return regularUnpaid + fixedUnpaid;
}, [buildingExpenses, fixedTemplates, fixedAmountOverrides, fixedPaidStatuses]);

  const isPastExpense = useCallback(
    (monthKey) => monthKey < currentMonthKey,
    [currentMonthKey]
  );

  const processedResidents = useMemo(() => {
    const copy = [...residents];
    if (currentSortBy === 'Tag') {
      return copy.sort((a, b) => a.apartment.localeCompare(b.apartment, undefined, { numeric: true, sensitivity: 'base' }));
    }
    if (currentSortBy === 'Debt') {
      return copy.sort((a, b) => {
        const debtA = a.expenses.reduce((sum, exp) => sum + (!exp.paid ? exp.amount : 0), 0);
        const debtB = b.expenses.reduce((sum, exp) => sum + (!exp.paid ? exp.amount : 0), 0);
        return debtB - debtA;
      });
    }
    return copy;
  }, [residents, currentSortBy]);

  // ─── CARD SCROLL HELPER ────────────────────────────────────────────────
  // Waits for the expand-drawer animation to finish, then smoothly scrolls
  // so the tapped resident card sits just below the sticky header. Clears
  // any previously scheduled scroll first, so tapping several cards quickly
  // in a row only ever scrolls to the most recently tapped one, instead of
  // stacking up several scroll attempts (some of which could otherwise try
  // to scroll to a card that isn't on screen anymore).
  const scrollCardIntoView = (residentId) => {
    clearTimeout(scrollTimerRef.current);
    const drawerDurationMs = parseFloat(A.drawerDuration) * 1000;
    scrollTimerRef.current = setTimeout(() => {
      const cardEl      = cardRefs.current[residentId];
      if (!cardEl) return;
      const headerHeight  = headerRef.current?.offsetHeight ?? 90;
      const gapPx         = parseInt(D.spacing.headerToListGap);
      const cardTopAbs    = cardEl.getBoundingClientRect().top + window.scrollY;
      smoothScrollTo(cardTopAbs - headerHeight - gapPx, 700);
    }, drawerDurationMs);
  };

  const handleResidentHeaderClick = (residentId) => {
    if (expandedResident === residentId) {
      setExpandedResident(null);
      setOpenPreviousDrawer({});
    } else {
      setExpandedResident(residentId);
      setOpenPreviousDrawer(prev => ({ ...prev, [residentId]: true }));
      scrollCardIntoView(residentId);
    }
  };

  const togglePreviousDrawer = (residentId) => {
    if (expandedResident !== residentId) {
      setExpandedResident(residentId);
      setOpenPreviousDrawer(prev => ({ ...prev, [residentId]: true }));
      scrollCardIntoView(residentId);
    } else {
      setExpandedResident(null);
      setOpenPreviousDrawer({});
    }
  };

  const closePastDrawerIfEmpty = (updatedResidents, residentId) => {
    const resident = updatedResidents.find(r => r.id === residentId);
    if (!resident) return;
    const hasPast = resident.expenses.some(exp => isPastExpense(exp.monthKey) && !exp.paid);
    if (!hasPast) setOpenPreviousDrawer(prev => ({ ...prev, [residentId]: false }));
  };

  // ─── EXPENSE MODAL STATE ───────────────────────────────────────────────
  // expenseModal.type drives which modal is visible:
  //   'add' | 'edit' | 'delete' | 'buildingDelete' | 'calendar' | null
  const [expenseModal, setExpenseModal] = useState({
    type: null, context: null, residentId: null,
    expenseId: null, amount: '', description: '', paid: false,
    isRecurring: false, templateId: null, monthKey: null,
  });

  const closeExpenseModal = () => setExpenseModal(m => ({ ...m, type: null }));

  // Single unified opener — handles both resident and building contexts
  const openExpenseModal = (context, type, options = {}) => {
    setExpenseModal({
      type,
      context,
      residentId:  options.residentId  ?? null,
      expenseId:   options.expenseId   ?? null,
      amount:      options.amount      ?? '',
      description: options.description ?? '',
      paid:        options.paid        ?? false,
      isRecurring: options.isRecurring ?? false,
      templateId:  options.templateId  ?? null,
      monthKey:    options.monthKey    ?? null,
    });
  };

  const openResidentModal = (type, residentId, expenseId = null, amount = '', description = '', paid = false) => {
    openExpenseModal('resident', type, { residentId, expenseId, amount, description, paid });
  };

  const openBuildingModal = (type, expenseOrId, amount = '', description = '', paid = false) => {
    // If second argument is an object (expense), extract fields
    if (typeof expenseOrId === 'object' && expenseOrId !== null) {
      const exp = expenseOrId;
      setExpenseModal({
        type, // 'edit' or 'editFixed'
        context: 'building',
        residentId: null,
        expenseId: exp.id,
        amount: exp.amount.toString(),
        description: exp.description,
        paid: exp.paid,
        isRecurring: exp.isRecurring || false,
        templateId: exp.templateId || null,
        monthKey: exp.monthKey || null,
      });
      return;
    }
    // Otherwise, it's an add or edit with explicit fields
    setExpenseModal({
      type,
      context: 'building',
      residentId: null,
      expenseId: expenseOrId || null,
      amount: amount || '',
      description: description || '',
      paid: paid || false,
      isRecurring: false,
      templateId: null,
      monthKey: null,
    });
  };

  // ─── EXPENSE HANDLERS ──────────────────────────────────────────────────
  const handleConfirmResidentExpense = ({ amount, description, paid }) => {
    if (!expenseModal.residentId) return;
    const parsedAmount = parseFloat(amount) || 0;
    const desc         = description.trim() || t('monthly_fee_default');

    setResidents(prev => {
      const updated = prev.map(res => {
        if (res.id !== expenseModal.residentId) return res;
        let expenses = [...res.expenses];
        if (expenseModal.type === 'add') {
          expenses.push({ id: makeId('exp'), description: desc, amount: parsedAmount, paid, month: currentMonthString, monthKey: currentMonthKey });
        } else if (expenseModal.type === 'edit' && expenseModal.expenseId) {
          expenses = expenses.map(exp =>
            exp.id === expenseModal.expenseId ? { ...exp, description: desc, amount: parsedAmount, paid } : exp
          );
        }
        return { ...res, expenses };
      });
      closePastDrawerIfEmpty(updated, expenseModal.residentId);
      return updated;
    });
    closeExpenseModal();
  };

  const handleDeleteResidentExpense = () => {
    if (!expenseModal.residentId || !expenseModal.expenseId) return;
    setResidents(prev => {
      const updated = prev.map(res =>
        res.id === expenseModal.residentId
          ? { ...res, expenses: res.expenses.filter(exp => exp.id !== expenseModal.expenseId) }
          : res
      );
      closePastDrawerIfEmpty(updated, expenseModal.residentId);
      return updated;
    });
    closeExpenseModal();
  };

      const handleConfirmBuildingExpense = ({ amount, description, paid, isRecurring }) => {
    const parsedAmount = parseFloat(amount) || 0;
    const desc = description.trim() || t('building_expense_default');

    if (isRecurring) {
      // --- RECURRING EXPENSE ---
      const { templateId, expenseId } = expenseModal;
      
      if (expenseModal.type === 'add' || !templateId) {
        // CASE: Add new recurring, OR edit a one-time expense and toggle to recurring
        
        // If we are editing a ONE-TIME expense and turning it into a recurring,
        // we need to remove the original one-time expense from buildingExpenses.
        if (expenseModal.type === 'edit' && expenseId) {
          setBuildingExpenses(prev => prev.filter(exp => exp.id !== expenseId));
        }
        
        // Create a new template
        const newTemplate = {
          id: makeId('ft'),
          description: desc,
          baseAmount: parsedAmount,
          deletedAt: null,
          startMonthKey: currentMonthKey,
        };
        setFixedTemplates(prev => [...prev, newTemplate]);
        
      } else if (expenseModal.type === 'editFixed') {
        // CASE: Editing an existing recurring template
        const existingTemplate = fixedTemplates.find(t => t.id === templateId);
        if (!existingTemplate) return;
        
        const targetMonthKey = expenseModal.monthKey ?? currentMonthKey;
        
        // Amount change → add override
        if (existingTemplate.baseAmount !== parsedAmount) {
          setFixedAmountOverrides(prev => [
            ...prev,
            { id: makeId('fo'), templateId, monthKey: targetMonthKey, newAmount: parsedAmount }
          ]);
        }
        
        // Description change → update template
        if (existingTemplate.description !== desc) {
          setFixedTemplates(prev =>
            prev.map(t => t.id === templateId ? { ...t, description: desc } : t)
          );
        }
        
        // Paid status: toggle for the specific month
        const existingPaid = fixedPaidStatuses.find(p => p.templateId === templateId && p.monthKey === targetMonthKey);
        if (paid && !existingPaid) {
          setFixedPaidStatuses(prev => [...prev, { id: makeId('fp'), templateId, monthKey: targetMonthKey, paid: true }]);
        } else if (!paid && existingPaid) {
          setFixedPaidStatuses(prev => prev.filter(p => !(p.templateId === templateId && p.monthKey === targetMonthKey)));
        }
      }
      
    } else {
      // --- ONE-TIME EXPENSE ---
      const { templateId, expenseId, monthKey } = expenseModal;

      // If this was a recurring expense being turned into one-time (editFixed)
      if (expenseModal.type === 'editFixed' && templateId) {
        // 1. Mark the template as deleted from this month onward
        const stopMonth = monthKey ?? currentMonthKey;
        setFixedTemplates(prev =>
          prev.map(t =>
            t.id === templateId ? { ...t, deletedAt: stopMonth } : t
          )
        );

        // 2. Create a one-time expense for the current month
        setBuildingExpenses(prev => [
          ...prev,
          { 
            id: makeId('bexp'), 
            description: desc, 
            amount: parsedAmount, 
            paid, 
            month: currentMonthString, 
            monthKey: stopMonth 
          }
        ]);

        closeExpenseModal();
        return;
      }

      // CASE: Regular one-time add or edit (no recurring involved)
      if (expenseModal.type === 'add') {
        setBuildingExpenses(prev => [...prev, { 
          id: makeId('bexp'), 
          description: desc, 
          amount: parsedAmount, 
          paid, 
          month: currentMonthString, 
          monthKey: currentMonthKey 
        }]);
      } else if (expenseModal.type === 'edit' && expenseId) {
        setBuildingExpenses(prev => prev.map(exp =>
          exp.id === expenseId ? { ...exp, description: desc, amount: parsedAmount, paid } : exp
        ));
      }
    }
    closeExpenseModal();
  };

  const handleDeleteBuildingExpense = () => {
    if (!expenseModal.expenseId) return;
    setBuildingExpenses(prev => prev.filter(exp => exp.id !== expenseModal.expenseId));
    closeExpenseModal();
  };

  // ─── STOP RECURRING (set deletedAt) ─────────────────────────────────────
  const handleStopRecurring = () => {
    const { templateId, monthKey } = expenseModal;
    if (!templateId) return;
    // Confirm before stopping
    if (!window.confirm('Stop this recurring expense? It will no longer appear from this month onward.')) return;
    const stopMonth = monthKey ?? currentMonthKey;
    setFixedTemplates(prev =>
      prev.map(t =>
        t.id === templateId ? { ...t, deletedAt: stopMonth } : t
      )
    );
    closeExpenseModal();
  };

  // ─── GENERATE FIXED (RECURRING) EXPENSES FOR A GIVEN MONTH ──────────────
  const generateFixedExpenses = useCallback((monthKey) => {
    const result = [];
    const today = getSystemDate();
    const todayMonthKey = today.getFullYear() * 12 + today.getMonth();
    const isFutureMonth = monthKey > todayMonthKey;

    // Loop through all templates
    fixedTemplates.forEach(template => {
      // Skip if deleted before this month
      if (template.deletedAt !== null && template.deletedAt <= monthKey) return;

      // Skip if this month is before the template's start
if (template.startMonthKey > monthKey) return;

      // Find the applicable amount override (highest monthKey <= monthKey)
      let amount = template.baseAmount;
      const applicableOverride = fixedAmountOverrides
        .filter(o => o.templateId === template.id && o.monthKey <= monthKey)
        .sort((a, b) => b.monthKey - a.monthKey)[0];
      if (applicableOverride) amount = applicableOverride.newAmount;

      // Find paid status for this specific month
      const paidEntry = fixedPaidStatuses.find(p => p.templateId === template.id && p.monthKey === monthKey);
      const isPaid = paidEntry ? paidEntry.paid : false;

      // For future unpaid items, they are greyed out and excluded from totals
      const isFutureUnpaid = isFutureMonth && !isPaid;

      result.push({
        id: `fixed-${template.id}-${monthKey}`,
        description: template.description,
        amount: amount,
        paid: isPaid,
        monthKey: monthKey,
        month: `${monthNames[monthKey % 12]} ${Math.floor(monthKey / 12)}`, // For display
        isRecurring: true,
        templateId: template.id,
        isFutureUnpaid: isFutureUnpaid,
      });
    });

    return result;
  }, [fixedTemplates, fixedAmountOverrides, fixedPaidStatuses, monthNames]);

  // ─── CARD MODAL STATE ──────────────────────────────────────────────────
  const [cardModalState, setCardModalState] = useState({ type: null, residentId: null });

  const closeCardModal    = () => setCardModalState({ type: null, residentId: null });
  const handleOpenAddCard = () => setCardModalState({ type: 'addCard',  residentId: null });

  const handleOpenEditCard = (residentId, e) => {
    e.stopPropagation();
    setCardModalState({ type: 'editCard', residentId });
  };

  const createResident = ({ name, apartment, notes }) => ({
    id:        makeId('R'),
    name:      name      || t('new_resident_default'),
    apartment: apartment || '—',
    notes:     notes     || '',
    expenses:  [],
  });

  const handleConfirmAddCard  = (fields) => { setResidents(prev => [...prev, createResident(fields)]); closeCardModal(); };
  const handleNextAddCard     = (fields) => { setResidents(prev => [...prev, createResident(fields)]); };

  const handleConfirmEditCard = ({ name, apartment, notes }) => {
    setResidents(prev => prev.map(res =>
      res.id === cardModalState.residentId
        ? { ...res, name: name || res.name, apartment: apartment || res.apartment, notes }
        : res
    ));
    closeCardModal();
  };

  const handleDeleteCardRequest = () => setCardModalState(prev => ({ ...prev, type: 'deleteCard' }));

  const handleConfirmDeleteCard = () => {
    setResidents(prev => prev.filter(res => res.id !== cardModalState.residentId));
    if (expandedResident === cardModalState.residentId) {
      setExpandedResident(null);
      setOpenPreviousDrawer({});
    }
    closeCardModal();
  };

  const handleCancelDeleteCard = () => setCardModalState(prev => ({ ...prev, type: 'editCard' }));

  const editingResident = useMemo(
    () => cardModalState.residentId ? residents.find(r => r.id === cardModalState.residentId) || null : null,
    [cardModalState.residentId, residents]
  );

  const cardModalContentAnim = MB.contentAnimation(A);

  // ─── ANDROID BACK-BUTTON SUPPORT (for later native wrapping) ───────────
  // This app has several full-screen overlays (settings, the month/year
  // picker, the expense/card modals, the printable report) but no browser
  // history entries for them, since it's a single-page app. On a phone,
  // people expect the back button/gesture to close whatever's currently
  // open on top, one layer at a time, instead of leaving the app entirely.
  //
  // A regular web browser's back button can't know about any of this. So
  // instead, this effect installs a function at window.NativeBridge.
  // handleBackPress that the native Android wrapper can call whenever the
  // system back button/gesture is pressed. It closes whatever overlay is
  // currently on top (checked in the order they'd visually sit above one
  // another) and reports back whether it closed something:
  //   - returns true  -> the native app should NOT exit/navigate back,
  //                      because we just closed something in-app instead.
  //   - returns false -> nothing was open, so the native app should go
  //                      ahead with its normal back behavior (e.g. exiting).
  // This re-registers on every render so it always has access to the
  // latest state, without the caller needing to know anything about that.
  useEffect(() => {
    window.NativeBridge = window.NativeBridge || {};
    window.NativeBridge.handleBackPress = () => {
      if (isReportOpen)               { setIsReportOpen(false); return true; }
      if (isHeaderPickerOpen)         { setIsHeaderPickerOpen(false); return true; }
      if (cardModalState.type)        { closeCardModal(); return true; }
      if (expenseModal.type !== null) { closeExpenseModal(); return true; }
      if (isMainMenuOpen)             { setIsMainMenuOpen(false); return true; }
      if (expandedResident !== null)  { setExpandedResident(null); setOpenPreviousDrawer({}); return true; }
      return false;
    };
  });

  // ─── VIEW TRANSITION RENDER ────────────────────────────────────────────
  const isTransitioning = buildingViewAnimState === 'transitioning';
  const VT              = D.viewTransition;
  const dur             = A.viewTransitionDuration;
  const curve           = A.viewTransitionCurve;
  const enterStyle      = isBuildingView ? VT.enterFromRightStyle(dur, curve) : VT.enterFromLeftStyle(dur, curve);
  const exitStyle       = VT.exitStyle(dur, curve);

  const cardsView = (
    <ResidentListView
      processedResidents={processedResidents}
      currentMonthKey={currentMonthKey}
      currentMonthString={currentMonthString}
      expandedResident={expandedResident}
      openPreviousDrawer={openPreviousDrawer}
      activeCurrencySymbol={activeCurrencySymbol}
      cardRefs={cardRefs}
      onResidentHeaderClick={handleResidentHeaderClick}
      onTogglePreviousDrawer={togglePreviousDrawer}
      onOpenResidentModal={openResidentModal}
      onOpenEditCard={handleOpenEditCard}
      isPastExpense={isPastExpense}
      t={t}
    />
  );

  const buildingView = (
    <BuildingExpenses
      regularExpenses={buildingExpenses}
      fixedExpenses={generateFixedExpenses(currentMonthKey)}
      currentMonthString={currentMonthString}
      currentMonthKey={currentMonthKey}
      isPastExpense={isPastExpense}
      activeCurrencySymbol={activeCurrencySymbol}
      openBuildingModal={openBuildingModal}
      t={t}
    />
  );

  const contentArea = isTransitioning
    ? (
      <div style={VT.outerStyle}>
        <div style={exitStyle}>{isBuildingView ? cardsView : buildingView}</div>
        <div style={enterStyle}>{isBuildingView ? buildingView : cardsView}</div>
      </div>
    )
    : (isBuildingView ? buildingView : cardsView);

  // ─── MAIN RENDER ───────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: D.fontFamily, ...LAYOUT.appWrapperStyle }} className={LAYOUT.appWrapper}>
      <div style={LAYOUT.appMaxWidthStyle} className={LAYOUT.appInnerContainer}>

        {/* ─── STICKY HEADER ─────────────────────────────────────────── */}
<header ref={headerRef} style={HDR.stickyContainerStyle} className={HDR.stickyContainer}>
  <div className={HDR.topRow}>
    <div className={HDR.leftActionGroup}>
  <button className={HDR.touchTargetBtn} onClick={() => setIsMainMenuOpen(true)}>
    <SpriteIcon id="main-settings" className={ICN.actionIconSize} />
  </button>
  <WalletFlipButton onToggle={handleToggleView} t={t} />
  <button
    className={isBuildingView ? HDR.touchTargetBtnDisabled : HDR.touchTargetBtn}
    onClick={isBuildingView ? undefined : handleOpenAddCard}
  >
    <SpriteIcon
      id="icon-button-add-user"
      className={ICN.actionIconSize}
      style={isBuildingView ? { color: COLORS['color-cardback-dim'] } : {}}
    />
  </button>
</div>

<div className={HDR.debtSection} style={{ marginLeft: 'auto' }}>
  <span className={HDR.totalDebtLabel}>
    {isBuildingView ? t('expenses') : t('total_debt')}
  </span>
  <span className={HDR.totalDebtAmount}>
    <CurrencySymbol activeSymbol={activeCurrencySymbol} className={HDR.currencySizeMod} />
    {formatAmount(isBuildingView ? totalBuildingDebt : totalAllDebts)}
  </span>
</div>
  </div>

  {/* BOTTOM ROW - Fixed layout */}
  <div className={HDR.bottomRow} style={HDR.bottomRowStyle}>
    <button
      className={HDR.monthTextBtn}
      style={{ 
        color: isFilteredAwayFromToday ? HDR.monthTextBtnOtherColor : HDR.monthTextBtnCurrentColor,
        ...HDR.monthTextBtnStyle
      }}
      onClick={() => setIsHeaderPickerOpen(true)}
    >
      {currentMonthString}
    </button>
    
    <div style={{ flex: 1 }} /> {/* Spacer */}
    
    <NavigationPill
      type="month"
      currentValue={currentMonthIdx}
      totalOptions={12}
      onPrev={handlePrevMonth}
      onNext={handleNextMonth}
      onGoToday={isFilteredAwayFromToday ? handleGoToCurrentMonth : undefined}
      canGoToday={isFilteredAwayFromToday}
      variant="transparent"
    />
  </div>
</header>

        <div style={{ height: SPC.headerToListGap }} />

        {contentArea}

        {/* ─── EXPENSE MODAL ─────────────────────────────────────────── */}
        {/* The `key` prop below forces React to throw away and recreate
            ExpenseModal whenever the target expense changes, instead of
            reusing the same component instance. This matters because
            ExpenseModal keeps its own internal copy of the amount/
            description/paid fields in useState — without a changing key,
            switching from editing one expense straight to another would
            keep showing the first expense's values until the modal is
            fully closed and reopened. */}
        <ModalWrapper
          isOpen={expenseModal.type !== null}
          onClose={closeExpenseModal}
        >
          <ExpenseModal
            key={expenseModal.expenseId ?? `new-${expenseModal.context}`}
            initialData={{
              type: expenseModal.type,
              amount: expenseModal.amount,
              description: expenseModal.description,
              paid: expenseModal.paid,
              isRecurring: expenseModal.isRecurring || false,
            }}
            context={expenseModal.context}
            onConfirm={expenseModal.context === 'resident' ? handleConfirmResidentExpense : handleConfirmBuildingExpense}
            onClose={closeExpenseModal}
            onDelete={expenseModal.context === 'resident' ? handleDeleteResidentExpense : handleDeleteBuildingExpense}
            onStopRecurring={expenseModal.context === 'building' && expenseModal.isRecurring ? handleStopRecurring : undefined}
            t={t}
          />
        </ModalWrapper>

        {/* ─── MAIN SETTINGS MODAL ───────────────────────────────────── */}
        <ModalWrapper isOpen={isMainMenuOpen} onClose={() => setIsMainMenuOpen(false)}>
          <SettingsModal
            t={t}
            monthNames={monthNames}
            currentLanguage={currentLanguage}
            onToggleLanguage={toggleLanguage}
            currentSortBy={currentSortBy}
            onToggleSort={toggleSortBy}
            currencyIndex={currencyIndex}
            onCycleCurrency={cycleCurrencyForward}
            currencyOptions={D.currencyOptions}
            themeIndex={themeIndex}
            onCycleTheme={cycleTheme}
            onExport={handleExportData}
            onImportFile={handleImportFile}
            onConfirmDeleteRange={handleDeleteDataRange}
            onExitAll={() => setIsMainMenuOpen(false)}
            onReport={() => { setIsMainMenuOpen(false); setIsReportOpen(true); }}
          />
        </ModalWrapper>

        {/* ─── HEADER MONTH/YEAR PICKER (sets the dashboard's active month) ── */}
        <MonthYearPickerModal
          isOpen={isHeaderPickerOpen}
          initialMonthIdx={currentMonthIdx}
          initialYear={currentYear}
          onConfirm={(monthIdx, year) => {
            setCurrentMonthIdx(monthIdx);
            setCurrentYear(year);
            setIsHeaderPickerOpen(false);
          }}
          onClose={() => setIsHeaderPickerOpen(false)}
          t={t}
        />

        {/* ─── CARD MODAL ────────────────────────────────────────────── */}
        <ModalWrapper isOpen={!!cardModalState.type} onClose={closeCardModal}>
          <div className={CM.wrapper} onClick={e => e.stopPropagation()}>
            {cardModalState.type === 'addCard' && (
              <CardProfileModal
                mode="add"
                residentData={null}
                onConfirm={handleConfirmAddCard}
                onNext={handleNextAddCard}
                onCancel={closeCardModal}
                animStyle={cardModalContentAnim}
                t={t}
              />
            )}
            {cardModalState.type === 'editCard' && editingResident && (
              <CardProfileModal
                mode="edit"
                residentData={editingResident}
                onConfirm={handleConfirmEditCard}
                onNext={null}
                onCancel={closeCardModal}
                onDeleteRequest={handleDeleteCardRequest}
                animStyle={cardModalContentAnim}
                t={t}
              />
            )}
            {cardModalState.type === 'deleteCard' && (
              <DeleteCardConfirmModal
                onConfirm={handleConfirmDeleteCard}
                onCancel={handleCancelDeleteCard}
                animStyle={cardModalContentAnim}
                t={t}
              />
            )}
          </div>
        </ModalWrapper>

        {/* ─── PRINTABLE / PDF REPORT ─────────────────────────────────── */}
        <ReportOverlay
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          t={t}
          residents={processedResidents}
          buildingExpenses={buildingExpenses}
          currentMonthString={currentMonthString}
          currentMonthKey={currentMonthKey}
          currentYear={currentYear}
          currentMonthIdx={currentMonthIdx}
          isPastExpense={isPastExpense}
          activeCurrencySymbol={activeCurrencySymbol}
          totalAllDebts={totalAllDebts}
        />

      </div>
    </div>
  );
}