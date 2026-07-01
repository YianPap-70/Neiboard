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
  systemDate, STORAGE_KEY, STORAGE_VERSION,
  loadPersistedData, savePersistedData, formatDateStamp,
  TIMELINE_YEARS, DEFAULT_MONTH_NAMES,
  formatAmount, smoothScrollTo, generateInitialResidents,
} from './utils.js';
import {
  SpriteIcon, NavigationPill, Drawer, ModalWrapper,
  PaidStatusIcon, CurrencySymbol, AmountSpan,
} from './primitives.jsx';
import {
  CardProfileModal, DeleteCardConfirmModal, ExpenseModal,
  MonthYearPickerModal, DeleteRangeModal, SettingsModal,
} from './modals.jsx';

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
function BuildingExpenses({ expenses, currentMonthString, currentMonthKey, isPastExpense, activeCurrencySymbol, openBuildingModal, t }) {
  const BE = window.DESIGN.buildingExpenses;

  const currentExpenses    = expenses.filter(exp => exp.monthKey === currentMonthKey);
  const pastUnpaidExpenses = expenses.filter(exp => isPastExpense(exp.monthKey) && !exp.paid);

  const allUnpaid   = expenses.filter(exp => !exp.paid);
  const showTotal   = allUnpaid.length >= 2;
  const totalUnpaid = allUnpaid.reduce((sum, exp) => sum + exp.amount, 0);

  const hasCurrent = currentExpenses.length > 0;
  const hasPast    = pastUnpaidExpenses.length > 0;

  return (
    <div className={BE.listContainer}>

      <div className={BE.cardContainer} style={{ marginBottom: hasPast ? BE.cardContainerGap : undefined }}>
        <div className={BE.labelRow} style={{ paddingTop: BE.sectionPaddingTop, marginBottom: hasCurrent ? '0px' : BE.addBtnGap }}>
          <span className={BE.sectionLabel}>
            {hasCurrent ? t('expenses') : t('no_expenses_this_month_building')}
          </span>
          {showTotal && (
            <span className={BE.totalLabel}>
              {t('total')}<CurrencySymbol activeSymbol={activeCurrencySymbol} className={BE.totalCurrencyMod} />
              <span className={BE.totalAmount}>{formatAmount(totalUnpaid)}</span>
            </span>
          )}
        </div>

        {hasCurrent && (
          <div className={BE.itemsWrapper} style={{ marginBottom: BE.addBtnGap }}>
            {currentExpenses.map((exp, idx) => (
              <div
                key={exp.id}
                className={`${BE.itemRow} ${idx > 0 ? BE.itemRowDivider : ''}`}
                onClick={() => openBuildingModal('edit', exp.id, exp.amount.toString(), exp.description, exp.paid)}
              >
                <div className={BE.itemLeft}>
                  <div className={BE.itemIconArea}><PaidStatusIcon paid={exp.paid} /></div>
                  <span className={BE.itemDescription(exp.paid)}>{exp.description}</span>
                </div>
                <span className={BE.itemAmount(exp.paid)}>
                  <CurrencySymbol activeSymbol={activeCurrencySymbol} className={BE.itemCurrencyMod} />
                  <AmountSpan amount={exp.amount} isPaid={exp.paid} />
                </span>
              </div>
            ))}
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
                onClick={() => openBuildingModal('edit', exp.id, exp.amount.toString(), exp.description, exp.paid)}
              >
                <div className={BE.itemLeft}>
                  <div className={BE.itemIconArea}><PaidStatusIcon paid={exp.paid} /></div>
                  <div className={BE.prevItemTextCol}>
                    <span className={BE.itemDescription(exp.paid)}>{exp.description}</span>
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

        const monthLabelText  = hasNoDebts
          ? `${t('no_debts')} / ${currentMonthString}`
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
                  <span style={CARD.caretRotationStyle(isDrawerOpen, A)}>
                    <SpriteIcon id="icon-caret" className={ICN.caretIconSize} />
                  </span>
                  <div className={DRW.toggleBarLabelArea}>
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
  const [translations,     setTranslations]     = useState(null);
  const [currentLanguage,  setCurrentLanguage]  = useState('en');

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
    fetch('/lang.json')
      .then(res => res.json())
      .then(data => setTranslations(data))
      .catch(err => console.error('Failed to load lang.json:', err));
  }, []);

  useEffect(() => {
    if (LAYOUT?.appBackgroundHex) document.body.style.backgroundColor = LAYOUT.appBackgroundHex;
  }, []);

  // ─── DATE / MONTH STATE ────────────────────────────────────────────────
  const monthNames         = translations ? t('months') : DEFAULT_MONTH_NAMES;
  const [currentMonthIdx,  setCurrentMonthIdx]  = useState(systemDate.getMonth());
  const [currentYear,      setCurrentYear]      = useState(systemDate.getFullYear());
  const currentMonthString = monthNames.length ? `${monthNames[currentMonthIdx]} ${currentYear}` : '';
  const currentMonthKey    = currentYear * 12 + currentMonthIdx;

  const isFilteredAwayFromToday = currentMonthIdx !== systemDate.getMonth() || currentYear !== systemDate.getFullYear();

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
      setCurrentMonthIdx(systemDate.getMonth());
      setCurrentYear(systemDate.getFullYear());
    }
  };

  // ─── DATA STATE ────────────────────────────────────────────────────────
  const [residents,       setResidents]       = useState([]);
  const [buildingExpenses, setBuildingExpenses] = useState([]);

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

  // ─── PERSISTENCE-AWARE INITIAL LOAD ─────────────────────────────────────
  // FIX [Bug #1] (carried forward): effect derives everything it needs from
  // `translations` directly rather than closing over outer-scope values.
  // On first run: hydrate from localStorage if a saved blob exists; otherwise
  // fall back to the original demo-data generator (first-run experience).
  // NOTE: must be declared after the state hooks above (currentSortBy,
  // currencyIndex, themeIndex, currentLanguage) since their setters/values
  // are referenced directly in these effects' bodies and dependency arrays.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!translations) return;
    if (residents.length > 0 || buildingExpenses.length > 0) return;

    const persisted = loadPersistedData();
    if (persisted) {
      setResidents(persisted.residents);
      setBuildingExpenses(persisted.buildingExpenses);
      const s = persisted.settings || {};
      if (s.language === 'en' || s.language === 'gr') setCurrentLanguage(s.language);
      if (s.sortBy === 'Tag' || s.sortBy === 'Debt') setCurrentSortBy(s.sortBy);
      if (typeof s.currencyIndex === 'number') setCurrencyIndex(s.currencyIndex);
      if (typeof s.themeIndex === 'number') setThemeIndex(s.themeIndex);
    } else {
      const names  = translations['months']['en'];
      const now    = new Date();
      const key    = now.getFullYear() * 12 + now.getMonth();
      const str    = `${names[now.getMonth()]} ${now.getFullYear()}`;
      setResidents(generateInitialResidents(names, str, key));
    }
    initializedRef.current = true;
  }, [translations]);

  // ─── DEBOUNCED PERSISTENCE SAVE ──────────────────────────────────────────
  // Skips writes until the initial hydration above has run, so we never
  // clobber a saved backup with the transient empty initial state.
  useEffect(() => {
    if (!initializedRef.current) return;
    const timer = setTimeout(() => {
      savePersistedData({
        residents,
        buildingExpenses,
        settings: {
          language: currentLanguage,
          sortBy: currentSortBy,
          currencyIndex,
          themeIndex,
        },
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [residents, buildingExpenses, currentLanguage, currentSortBy, currencyIndex, themeIndex]);

  const headerRef       = useRef(null);
  const cardRefs        = useRef({});
  // FIX [Bug #6]: Refs to track and cancel in-flight setTimeout handles,
  // preventing stale callbacks from firing after rapid view-toggle or card taps.
  const viewTransTimerRef = useRef(null);
  const scrollTimerRef    = useRef(null);

  // FIX [Bug #6]: Clear the previous timer before scheduling a new one so rapid
  // clicks on the flip button don't stack multiple state-reset callbacks.
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
  const handleExportData = () => {
    const payload = JSON.stringify({
      version: STORAGE_VERSION,
      residents,
      buildingExpenses,
      settings: { language: currentLanguage, sortBy: currentSortBy, currencyIndex, themeIndex },
    });
    const blob = new Blob([payload], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `neiboard-backup-${formatDateStamp(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || !Array.isArray(parsed.residents) || !Array.isArray(parsed.buildingExpenses)) {
          console.error('Invalid backup file: missing residents/buildingExpenses arrays.');
          return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...parsed }));
        window.location.reload();
      } catch (err) {
        console.error('Failed to parse imported backup file:', err);
      }
    };
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
  };

  const totalAllDebts = useMemo(
    () => residents.reduce((total, resident) =>
      total + resident.expenses.filter(exp => !exp.paid).reduce((sum, exp) => sum + exp.amount, 0), 0),
    [residents]
  );

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
  // FIX [Bug #2]: Track the scroll timer in a ref and clear it before scheduling
  // a new one. Without this, rapid card taps queue multiple timers that all fire,
  // causing jumpy scroll behaviour and attempting to scroll to unmounted elements.
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
      setOpenPreviousDrawer(prev => ({ ...prev, [residentId]: !prev[residentId] }));
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
    });
  };

  const openResidentModal = (type, residentId, expenseId = null, amount = '', description = '', paid = false) => {
    openExpenseModal('resident', type, { residentId, expenseId, amount, description, paid });
  };

  const openBuildingModal = (type, expenseId = null, amount = '', description = '', paid = false) => {
    openExpenseModal('building', type, { expenseId, amount, description, paid });
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
          expenses.push({ id: 'exp-' + Date.now(), description: desc, amount: parsedAmount, paid, month: currentMonthString, monthKey: currentMonthKey });
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

  const handleConfirmBuildingExpense = ({ amount, description, paid }) => {
    const parsedAmount = parseFloat(amount) || 0;
    const desc         = description.trim() || t('building_expense_default');
    if (expenseModal.type === 'add') {
      setBuildingExpenses(prev => [...prev, { id: 'bexp-' + Date.now(), description: desc, amount: parsedAmount, paid, month: currentMonthString, monthKey: currentMonthKey }]);
    } else if (expenseModal.type === 'edit' && expenseModal.expenseId) {
      setBuildingExpenses(prev => prev.map(exp =>
        exp.id === expenseModal.expenseId ? { ...exp, description: desc, amount: parsedAmount, paid } : exp
      ));
    }
    closeExpenseModal();
  };

  const handleDeleteBuildingExpense = () => {
    if (!expenseModal.expenseId) return;
    setBuildingExpenses(prev => prev.filter(exp => exp.id !== expenseModal.expenseId));
    closeExpenseModal();
  };

  // ─── CARD MODAL STATE ──────────────────────────────────────────────────
  const [cardModalState, setCardModalState] = useState({ type: null, residentId: null });

  const closeCardModal    = () => setCardModalState({ type: null, residentId: null });
  const handleOpenAddCard = () => setCardModalState({ type: 'addCard',  residentId: null });

  const handleOpenEditCard = (residentId, e) => {
    e.stopPropagation();
    setCardModalState({ type: 'editCard', residentId });
  };

  const createResident = ({ name, apartment, notes }) => ({
    id:        'R-' + Date.now(),
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

  // ─── LOADING SCREEN ────────────────────────────────────────────────────
  if (!translations) {
    return (
      <div style={{ fontFamily: D.fontFamily }} className={LAYOUT.appWrapper}>
        <div style={LAYOUT.appMaxWidthStyle} className={LAYOUT.appInnerContainer}>
          <div style={LAYOUT.loadingTextStyle}>Loading...</div>
        </div>
      </div>
    );
  }

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
      expenses={buildingExpenses}
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
    <div style={{ fontFamily: D.fontFamily }} className={LAYOUT.appWrapper}>
      <div style={LAYOUT.appMaxWidthStyle} className={LAYOUT.appInnerContainer}>

        {/* ─── STICKY HEADER ─────────────────────────────────────────── */}
<header ref={headerRef} style={HDR.stickyContainerStyle} className={HDR.stickyContainer}>
  <div className={HDR.topRow}>
    <div className={HDR.leftActionGroup}>
      <button className={HDR.touchTargetBtn} onClick={() => setIsMainMenuOpen(true)}>
        <SpriteIcon id="icon-hamburger" className={ICN.actionIconSize} />
      </button>
      <WalletFlipButton onToggle={handleToggleView} t={t} />
      <button
        className={isBuildingView ? HDR.touchTargetBtnDisabled : HDR.touchTargetBtn}
        onClick={isBuildingView ? undefined : handleOpenAddCard}
      >
        <SpriteIcon
          id="icon-button-add-user"
          className={ICN.actionIconSize}
          style={isBuildingView ? { color: COLORS['main-color-3'] } : {}}
        />
      </button>
    </div>

    <div className={HDR.debtSection}>
      <span className={HDR.totalDebtLabel}>{t('total_debt')}</span>
      <span className={HDR.totalDebtAmount}>
        <CurrencySymbol activeSymbol={activeCurrencySymbol} className={HDR.currencySizeMod} />
        {formatAmount(totalAllDebts)}
      </span>
    </div>

    <div className={HDR.syncIconWrapper}>
      {/* TODO: wire up cloud sync when backend is available */}
      <button className={HDR.touchTargetBtn} onClick={() => {}}>
        <SpriteIcon id="icon-synced" className={ICN.syncIconSize} style={IC.synced} />
      </button>
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
        {/* FIX [Bug #7]: `key` prop forces ExpenseModal to remount when the target
            expense changes. Without this, useState inside ExpenseModal ignores
            updated initialData when switching between expenses, showing stale values. */}
        <ModalWrapper
          isOpen={expenseModal.type !== null}
          onClose={closeExpenseModal}
        >
          <ExpenseModal
            key={expenseModal.expenseId ?? `new-${expenseModal.context}`}
            initialData={{ type: expenseModal.type, amount: expenseModal.amount, description: expenseModal.description, paid: expenseModal.paid }}
            context={expenseModal.context}
            onConfirm={expenseModal.context === 'resident' ? handleConfirmResidentExpense : handleConfirmBuildingExpense}
            onClose={closeExpenseModal}
            onDelete={expenseModal.context === 'resident' ? handleDeleteResidentExpense : handleDeleteBuildingExpense}
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

      </div>
    </div>
  );
}
