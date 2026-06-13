// =========================================================================
// ARCHITECTURAL SOURCE OF TRUTH: APPLICATION CONTROLLER
// This component manages core business data, state modifications, and logic flows.
// ALL styling tokens, configurations, and Tailwind strings are abstracted to DesignConfig.js.
// =========================================================================

const { useState, useCallback, useMemo, useRef, useEffect } = React;

// systemDate is captured once at load. Fine for single-session use;
// if the app is ever kept open across midnight, re-evaluate.
const systemDate = new Date();

// ─── TEST DATA GENERATOR ──────────────────────────────────────────────────
// Lazy initialiser called inside useState(() => ...) so it runs once on mount.
// Receives the DESIGN config as an argument to avoid a hidden global dependency.
function generateInitialResidents(D) {
  const SURNAMES = ['Ramirez', 'Chen', 'Marcus', 'Patel', 'Kowalski', 'Nguyen', 'Ferreira', 'Schmidt', 'Okafor', 'Petrov'];
  const EXPENSE_NAMES = ['Monthly Maintenance', 'Heating Oil', 'Elevator Repair', 'Water Balance', 'Shared Repairs', 'Stairwell Lighting'];
  const APARTMENTS = ['1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C'];

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pickUnique = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

  const today = new Date();
  const currentMonth = D.monthNames[today.getMonth()];
  const currentYear = today.getFullYear();

  const pastMonths = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    pastMonths.push(`${D.monthNames[d.getMonth()]} ${d.getFullYear()}`);
  }

  const usedApartments = [];
  const cardCount = rand(5, 8);
  const residents = [];

  for (let i = 0; i < cardCount; i++) {
    let apt;
    do { apt = pick(APARTMENTS); } while (usedApartments.includes(apt));
    usedApartments.push(apt);

    const surname = SURNAMES[i] || `Family ${i + 1}`;
    const expenses = [];
    let expCounter = 0;

    pickUnique(EXPENSE_NAMES, rand(1, 2)).forEach((name) => {
      expenses.push({ id: `exp-${i}-${expCounter++}`, description: name, amount: rand(40, 150), paid: Math.random() > 0.4, month: `${currentMonth} ${currentYear}` });
    });
    pickUnique(EXPENSE_NAMES, rand(0, 2)).forEach((name) => {
      expenses.push({ id: `exp-${i}-${expCounter++}`, description: name, amount: rand(40, 150), paid: false, month: pick(pastMonths) });
    });

    residents.push({ id: `R${i}`, name: `${surname} Family`, apartment: `Apt ${apt}`, notes: '', expenses });
  }
  return residents;
}

function formatAmount(amount) {
  const num = parseFloat(amount);
  if (num % 1 === 0) return num.toString();
  return num.toFixed(2).replace(/\.?0+$/, '');
}

// ─── SPRITE ICON COMPONENT ────────────────────────────────────────────────
// Single source of truth for all icon rendering.
// - id: the symbol id from icons.svg (e.g. "icon-caret")
// - className: Tailwind size + color classes (e.g. "w-6 h-6 text-gray-400")
// - style: optional React style object for CSS variable overrides on multi-color icons
function SpriteIcon({ id, className = '', style }) {
  return (
    <svg className={className} style={style} aria-hidden="true" focusable="false">
      <use href={`#${id}`} />
    </svg>
  );
}

// Multi-color icon CSS variable palettes and shared icon size tokens live in
// DesignConfig.js as window.DESIGN.iconColors / window.DESIGN.icons.

// ─── PAID/UNPAID STATUS ICON ──────────────────────────────────────────────
// Shared by resident card expenses, the history drawer, and building
// expenses — all four call sites previously repeated this same ternary.
function PaidStatusIcon({ paid }) {
  const ICN = window.DESIGN.icons;
  const IC  = window.DESIGN.iconColors;
  return paid
    ? <SpriteIcon id="icon-check" className={ICN.statusIconSize} style={IC.check} />
    : <SpriteIcon id="icon-warning-filled" className={ICN.statusIconSize} style={IC.warningFilled} />;
}

function CurrencySymbol({ activeSymbol, className = '' }) {
  if (activeSymbol === '') return null;
  return <span className={className}>{activeSymbol}</span>;
}

function Drawer({ isOpen, children }) {
  const [height, setHeight] = useState(0);
  const contentRef = useRef(null);
  const A = window.DESIGN.animation;
  const drawerConfig = window.DESIGN.drawer;

  useEffect(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    const update = () => setHeight(isOpen ? el.scrollHeight : 0);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen, children]);

  return (
    <div
      style={{
        height: height + 'px',
        transition: `height ${A.drawerDuration} ${A.drawerCurve}`,
        ...drawerConfig.containerStyle
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

function AutoTextarea({ value, onChange, placeholder, className, style }) {
  const ref = useRef(null);
  const A = window.DESIGN.animation;
  const textareaConfig = window.DESIGN.autoTextarea;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 21;
    const maxHeight = lineHeight * textareaConfig.maxLines + 28;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      style={{
        ...style,
        transition: `height ${A.autoTextareaDuration} ${A.autoTextareaCurve}`,
        minHeight: textareaConfig.minHeight
      }}
      rows={1}
    />
  );
}

function CardProfileModal({ mode, residentData, onConfirm, onNext, onCancel, onDeleteRequest, animStyle }) {
  const CM = window.DESIGN.cardModal;
  const MB = window.DESIGN.modalBase;

  const [name, setName] = useState(residentData?.name || '');
  const [apartment, setApartment] = useState(residentData?.apartment || '');
  const [notes, setNotes] = useState(residentData?.notes || '');

  const fieldGap = CM.fieldGap;
  const fieldToButtonGap = CM.fieldToButtonGap;

  const handleConfirm = () => {
    onConfirm({ name: name.trim(), apartment: apartment.trim(), notes: notes.trim() });
  };

  // Saves the current fields as a new resident and resets the form so the
  // user can immediately enter another. The parent distinguishes "OK" (close)
  // from "+ Next" (stay open) via separate onConfirm / onNext props.
  const handleNext = () => {
    onNext({ name: name.trim(), apartment: apartment.trim(), notes: notes.trim() });
    setName('');
    setApartment('');
    setNotes('');
  };

  const isAdd = mode === 'add';

  return (
    // Placeholder and input text styles are defined statically in styles.css
    // via the .card-modal-input class, keeping style injection out of render.
    <div
      style={{ ...MB.boxContainerStyle, ...animStyle }}
      className={MB.boxContainer}
    >
      {/* HEADER ROW */}
      <div className={CM.headerRow}>
        <SpriteIcon
          id={isAdd ? 'icon-button-add-user' : 'icon-edit'}
          className={CM.headerIcon}
        />
        <span className={CM.headerLabel}>{isAdd ? 'Add Card' : 'Edit Card'}</span>
      </div>

      {/* NAME / TITLE FIELD */}
      <div className={CM.fieldWrapper} style={{ marginBottom: fieldGap }}>
        <input
          type="text"
          placeholder="Name / Title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`card-modal-input ${CM.singleLineField}`}
        />
      </div>

      {/* APARTMENT OR TAG FIELD */}
      <div className={CM.fieldWrapper} style={{ marginBottom: fieldGap }}>
        <input
          type="text"
          placeholder="Apartment or Tag"
          value={apartment}
          onChange={(e) => setApartment(e.target.value)}
          className={`card-modal-input ${CM.singleLineField}`}
        />
      </div>

      {/* NOTES FIELD — auto-expanding up to 5 lines */}
      <div className={CM.fieldWrapper} style={{ marginBottom: fieldToButtonGap }}>
        <AutoTextarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className={`card-modal-input ${CM.notesField}`}
        />
      </div>

      {/* BUTTON ROW */}
      <div className={CM.buttonRow}>
        {isAdd ? (
          <>
            <button className={CM.okBtn} onClick={handleConfirm}>OK</button>
            <button className={CM.okBtn} onClick={handleNext}>+ Next</button>
            <button className={CM.cancelIconBtn} onClick={onCancel}>
              <SpriteIcon id="icon-ex" className={CM.cancelIconSize} />
            </button>
          </>
        ) : (
          <>
            <button className={CM.okBtn} onClick={handleConfirm}>OK</button>
            <button className={CM.cancelTextBtn} onClick={onCancel}>Cancel</button>
            <button className={CM.trashBtn} onClick={onDeleteRequest}>
              <SpriteIcon id="icon-trash" className={CM.trashIconSize} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DeleteCardConfirmModal({ onConfirm, onCancel, animStyle }) {
  const CM = window.DESIGN.cardModal;
  const MB = window.DESIGN.modalBase;
  return (
    <div
      style={{ ...CM.deleteConfirmBoxStyle, ...animStyle }}
      className={MB.boxContainer}
    >
      <p className={CM.deleteConfirmTitle}>Are you sure you want to delete this Card?</p>
      <div className={CM.deleteConfirmRow}>
        <button className={CM.deleteConfirmYesBtn} onClick={onConfirm}>Yes</button>
        <button className={CM.deleteConfirmNoBtn} onClick={onCancel}>No</button>
      </div>
    </div>
  );
}

function WalletFlipButton({ onToggle }) {
  const WFB = window.DESIGN.walletFlipBtn;
  const A = window.DESIGN.animation;
  const [isFlipped, setIsFlipped] = useState(false);

  const handlePress = () => {
    setIsFlipped(prev => !prev);
    onToggle();
  };

  return (
    <button
      style={WFB.containerStyle}
      className={WFB.container}
      onClick={handlePress}
      aria-label={isFlipped ? 'Show resident cards' : 'Show building expenses'}
    >
      <div style={WFB.flipperStyle(isFlipped, A.coinFlipDuration)}>
        {/* Front face: Wallet */}
        <div style={WFB.faceBase}>
          <SpriteIcon id="icon-wallet" className={WFB.faceIconSize} />
        </div>
        {/* Back face: ResidentCard */}
        <div style={WFB.backFaceStyle}>
          <SpriteIcon id="icon-residentcard" className={WFB.faceIconSize} />
        </div>
      </div>
    </button>
  );
}

// Shared modal used by both resident expenses and building expenses.
// The only behavioural difference between the two contexts is which
// "unpaid" icon to show, passed via the `unpaidIconId` prop.
function ExpenseModal({ modalState, setModalState, onConfirm, onClose, onDelete, unpaidIconId, unpaidIconColors }) {
  const MDL = window.DESIGN.modal;
  const MB  = window.DESIGN.modalBase;
  const IC  = window.DESIGN.iconColors;

  const isAddOrEdit = modalState.type === 'add' || modalState.type === 'edit';
  const isDelete    = modalState.type === 'delete' || modalState.type === 'buildingDelete';

  if (!isAddOrEdit && !isDelete) return null;

  return (
    <div style={MB.backdropAnimation(window.DESIGN.animation)} className={MB.backdropOverlay} onClick={onClose}>

      {isAddOrEdit && (
        <div style={{ ...MB.boxContainerStyle, ...MB.contentAnimation(window.DESIGN.animation) }} className={MB.boxContainer} onClick={(e) => e.stopPropagation()}>

          <div className={MDL.headerRow}>
            <SpriteIcon id="icon-edit" className={MDL.headerIcon} />
            <span className={MDL.headerTitle}>
              {modalState.type === 'add' ? 'Add expense' : 'Edit expense'}
            </span>
          </div>

          <div className={MDL.actionsFlexRow} style={{ marginBottom: MDL.amountToDescriptionGap }}>
            <div style={MDL.amountInputBoxStyle} className={MDL.amountInputBox}>
              <input
                type="number"
                placeholder="0.00"
                value={modalState.amount}
                onChange={(e) => setModalState(m => ({ ...m, amount: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); }}
                className={MDL.amountInputField}
                autoFocus
                style={MDL.amountPlaceholderStyle}
              />
            </div>
            <button onClick={() => setModalState(m => ({ ...m, paid: !m.paid }))} className={MDL.paidStateToggleBtn}>
              {modalState.paid ? (
                <SpriteIcon id="icon-button-paid" className={MDL.paidToggleIcon} style={IC.buttonPaid} />
              ) : (
                <SpriteIcon id={unpaidIconId} className={MDL.paidToggleIcon} style={unpaidIconColors} />
              )}
            </button>
          </div>

          <div style={{ ...MDL.descriptionInputBoxStyle, marginBottom: MDL.descriptionToActionsGap }} className={MDL.descriptionInputBox}>
            <input
              type="text"
              placeholder="Edit description (Optional)"
              value={modalState.description}
              onChange={(e) => setModalState(m => ({ ...m, description: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); }}
              className={MDL.descriptionInputField}
              style={MDL.descriptionPlaceholderStyle}
            />
          </div>

          <div className={MDL.actionsFlexRow}>
            <button onClick={onConfirm} className={MDL.confirmBtn}>OK</button>
            <button onClick={onClose} className={MDL.cancelBtn}>Cancel</button>
            {modalState.type === 'edit' && (
              <button
                onClick={() => setModalState(m => ({ ...m, type: isDelete ? m.type : (unpaidIconId === 'icon-button-unpaid' ? 'delete' : 'buildingDelete') }))}
                className={`${MDL.deleteActionBtn} ${MDL.deleteActionBtnRingClass}`}
              >
                <SpriteIcon id="icon-trash" className={MDL.deleteActionIcon} />
              </button>
            )}
          </div>
        </div>
      )}

      {isDelete && (
        <div style={{ ...MB.boxContainerStyle, ...MB.contentAnimation(window.DESIGN.animation) }} className={MB.boxContainer} onClick={(e) => e.stopPropagation()}>
          <h4 className={MDL.deletePromptTitle}>Are you sure you want to delete this expense?</h4>
          <div className={MDL.actionsFlexRow}>
            <button onClick={onDelete} style={MDL.deleteYesBtnStyle} className={MDL.deleteYesBtn}>Yes</button>
            <button onClick={() => setModalState(m => ({ ...m, type: 'edit' }))} className={MDL.deleteNoBtn}>No</button>
          </div>
        </div>
      )}

    </div>
  );
}

function BuildingExpenses({ expenses, currentMonthString, isPastExpense, activeCurrencySymbol, openBuildingModal }) {
  const BE = window.DESIGN.buildingExpenses;

  const currentExpenses    = expenses.filter(exp => exp.month === currentMonthString);
  const pastUnpaidExpenses = expenses.filter(exp => isPastExpense(exp.month) && !exp.paid);

  const allUnpaid   = expenses.filter(exp => !exp.paid);
  const showTotal   = allUnpaid.length >= 2;
  const totalUnpaid = allUnpaid.reduce((sum, exp) => sum + exp.amount, 0);

  const hasCurrent = currentExpenses.length > 0;
  const hasPast    = pastUnpaidExpenses.length > 0;

  return (
    <div className={BE.listContainer}>

      {/* ── CURRENT MONTH SECTION ── */}
      <div className={BE.cardContainer} style={{ marginBottom: hasPast ? BE.cardContainerGap : undefined }}>

        {/* Label row */}
        <div className={BE.labelRow} style={{ paddingTop: BE.sectionPaddingTop, marginBottom: hasCurrent ? '0px' : BE.addBtnGap }}>
          <span className={BE.sectionLabel}>
            {hasCurrent ? 'Expenses' : 'No expenses for this month'}
          </span>
          {showTotal && (
              <span className={BE.totalLabel}>
                total<CurrencySymbol activeSymbol={activeCurrencySymbol} className={BE.totalCurrencyMod} />
                <span className={BE.totalAmount}>{formatAmount(totalUnpaid)}</span>
              </span>
          )}
        </div>

        {/* Current expense items */}
        {hasCurrent && (
          <div className={BE.itemsWrapper} style={{ marginBottom: BE.addBtnGap }}>
            {currentExpenses.map((exp, idx) => (
              <div
                key={exp.id}
                className={`${BE.itemRow} ${idx > 0 ? BE.itemRowDivider : ''}`}
                onClick={() => openBuildingModal('edit', exp.id, exp.amount.toString(), exp.description, exp.paid)}
              >
                <div className={BE.itemLeft}>
                  <div className={BE.itemIconArea}>
                    <PaidStatusIcon paid={exp.paid} />
                  </div>
                  <span className={BE.itemDescription(exp.paid)}>{exp.description}</span>
                </div>
                <span className={BE.itemAmount(exp.paid)}>
                  <CurrencySymbol activeSymbol={activeCurrencySymbol} className={BE.itemCurrencyMod} />{formatAmount(exp.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* +Add button */}
        <div className={BE.addBtnWrapper} style={{ paddingBottom: BE.sectionPaddingBottom }}>
          <button className={BE.addBtn} onClick={() => openBuildingModal('add')}>
            + Add
          </button>
        </div>

      </div>

      {/* ── PREVIOUS MONTHS SECTION ── */}
      {hasPast && (
        <div className={BE.cardContainer}>
          <div className={BE.prevLabelWrapper} style={{ paddingTop: BE.sectionPaddingTop, marginBottom: '0px' }}>
            <span className={BE.prevLabel}>Unpaid from previous months</span>
          </div>
          <div className={BE.itemsWrapper} style={{ paddingBottom: BE.sectionPaddingBottom }}>
            {pastUnpaidExpenses.map((exp, idx) => (
              <div
                key={exp.id}
                className={`${BE.itemRow} ${idx > 0 ? BE.itemRowDivider : ''}`}
                onClick={() => openBuildingModal('edit', exp.id, exp.amount.toString(), exp.description, exp.paid)}
              >
                <div className={BE.itemLeft}>
                  <div className={BE.itemIconArea}>
                    <PaidStatusIcon paid={exp.paid} />
                  </div>
                  <div className={BE.prevItemTextCol}>
                    <span className={BE.itemDescription(exp.paid)}>{exp.description}</span>
                    {/* Month sub-label shown beneath the expense description in previous-months rows */}
                    <span className={BE.prevMonthSubLabel}>{exp.month}</span>
                  </div>
                </div>
                <span className={BE.itemAmount(exp.paid)}>
                  <CurrencySymbol activeSymbol={activeCurrencySymbol} className={BE.itemCurrencyMod} />{formatAmount(exp.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

window.App = function App() {
  const D      = window.DESIGN;
  const LAYOUT = D.layout;
  const HDR    = D.header;
  const CARD   = D.residentCard;
  const DRW    = D.historyDrawer;
  const MDL    = D.modal;
  const MB     = D.modalBase;
  const CAL    = D.modal.calendar;
  const MNU    = D.mainMenu;
  const A      = D.animation;
  const CM     = D.cardModal;
  const SPC    = D.spacing;
  const IC     = D.iconColors;
  const ICN    = D.icons;

  // Ref attached to the sticky header so its rendered height can be measured
  // when calculating scroll offsets after a card expands.
  const headerRef = useRef(null);

  useEffect(() => {
    if (LAYOUT && LAYOUT.appBackgroundHex) {
      document.body.style.backgroundColor = LAYOUT.appBackgroundHex;
    }
  }, []);

  const [isMainMenuOpen, setIsMainMenuOpen]     = useState(false);
  const [isBuildingView, setIsBuildingView]     = useState(false);
  const [buildingExpenses, setBuildingExpenses] = useState([]);
  const [buildingViewAnimState, setBuildingViewAnimState] = useState('idle');

  // Resident list seeded with test data on first mount via lazy initialiser.
  const [residents, setResidents]                     = useState(() => generateInitialResidents(D));
  const [expandedResident, setExpandedResident]       = useState(null);
  const [openPreviousDrawer, setOpenPreviousDrawer]   = useState({});

  const handleToggleView = useCallback(() => {
    const duration = parseFloat(A.viewTransitionDuration) * 1000;

    window.scrollTo({ top: 0 });

    setExpandedResident(null);
    setOpenPreviousDrawer({});

    setBuildingViewAnimState('transitioning');
    setTimeout(() => { setBuildingViewAnimState('idle'); }, duration);
    setIsBuildingView(prev => !prev);
  }, [A.viewTransitionDuration]);

  // Language preference — currently controls UI state only.
  // Wire into a localisation map when translations are ready.
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const [currentSortBy, setCurrentSortBy]     = useState('Tag');
  const [currencyIndex, setCurrencyIndex]     = useState(0);

  const activeCurrencySymbol = useMemo(() => {
    return D.currencyOptions[currencyIndex]?.symbol ?? '€';
  }, [currencyIndex, D.currencyOptions]);

  const [fromMonth, setFromMonth]                   = useState('');
  const [toMonth, setToMonth]                       = useState('');
  const [calendarTargetField, setCalendarTargetField] = useState(null);

  const [currentMonthIdx, setCurrentMonthIdx] = useState(systemDate.getMonth());
  const [currentYear, setCurrentYear]         = useState(systemDate.getFullYear());
  const currentMonthString = `${D.monthNames[currentMonthIdx]} ${currentYear}`;

  const [tempYear, setTempYear]           = useState(systemDate.getFullYear());
  const [tempMonthIdx, setTempMonthIdx]   = useState(systemDate.getMonth());

  // Map of residentId → DOM node, used to scroll a card into view after it expands.
  const cardRefs = useRef({});

  const [modal, setModal] = useState({
    type: null, residentId: null, expenseId: null, amount: '', description: '', paid: false
  });

  const [cardModal, setCardModal] = useState({
    type: null,
    residentId: null,
  });

  const handlePrevMonth = () => {
    if (currentMonthIdx === 0) { setCurrentMonthIdx(11); setCurrentYear(p => p - 1); }
    else setCurrentMonthIdx(p => p - 1);
  };
  const handleNextMonth = () => {
    if (currentMonthIdx === 11) { setCurrentMonthIdx(0); setCurrentYear(p => p + 1); }
    else setCurrentMonthIdx(p => p + 1);
  };

  const handleGoToCurrentMonth = () => {
    if (isFilteredAwayFromToday) {
      setCurrentMonthIdx(systemDate.getMonth());
      setCurrentYear(systemDate.getFullYear());
    }
  };

  const isFilteredAwayFromToday = currentMonthIdx !== systemDate.getMonth() || currentYear !== systemDate.getFullYear();

  const isPastExpense = useCallback((expenseMonthStr) => {
    const [expMonthName, expYearStr] = expenseMonthStr.split(' ');
    const expYear    = parseInt(expYearStr) || 0;
    const expMonthIdx = D.monthNames.indexOf(expMonthName);
    if (expYear < currentYear) return true;
    if (expYear === currentYear && expMonthIdx < currentMonthIdx) return true;
    return false;
  }, [currentMonthIdx, currentYear]);

  const totalAllDebts = useMemo(() => {
    return residents.reduce((total, resident) => {
      return total + resident.expenses.filter(exp => !exp.paid).reduce((sum, exp) => sum + exp.amount, 0);
    }, 0);
  }, [residents]);

  const processedResidents = useMemo(() => {
    const listCopy = [...residents];

    if (currentSortBy === 'Tag') {
      return listCopy.sort((a, b) => a.apartment.localeCompare(b.apartment, undefined, { numeric: true, sensitivity: 'base' }));
    } else if (currentSortBy === 'Debt') {
      return listCopy.sort((a, b) => {
        const debtA = a.expenses.reduce((sum, exp) => sum + (!exp.paid ? exp.amount : 0), 0);
        const debtB = b.expenses.reduce((sum, exp) => sum + (!exp.paid ? exp.amount : 0), 0);
        return debtB - debtA;
      });
    }
    return listCopy;
  }, [residents, currentSortBy]);

  // Shared two-phase scroll helper.
  // Phase 1: expansion is already triggered by the caller (state set before calling this).
  // Phase 2: after the drawer finishes animating, check whether the card top is already
  //          sitting at least (headerHeight + gapPx) below the viewport top. If it is,
  //          the card is fully visible and we do nothing. If not, we scroll so its top
  //          lands exactly gapPx (16px) below the sticky header — using native smooth
  //          scroll which is compositor-driven and costs nothing extra.
  const scrollCardIntoViewAfterExpand = (residentId) => {
    const drawerDurationMs = parseFloat(A.drawerDuration) * 1000;
    setTimeout(() => {
      const cardEl = cardRefs.current[residentId];
      if (!cardEl) return;
      const headerHeight = headerRef.current?.offsetHeight ?? 90;
      const gapPx        = parseInt(D.spacing.headerToListGap);
      const cardTopInViewport = cardEl.getBoundingClientRect().top;
      const idealOffset = headerHeight + gapPx;
      if (cardTopInViewport < idealOffset) {
        const cardTopAbsolute = cardEl.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: cardTopAbsolute - idealOffset, behavior: 'smooth' });
      }
    }, drawerDurationMs);
  };

  // When the user taps the drawer toggle bar (left side of card):
  // - If card is collapsed → expand it (Phase 1) then scroll after drawer settles (Phase 2)
  // - If card is already expanded → just toggle the historical "previous months" drawer
  const togglePreviousDrawer = (residentId) => {
    if (expandedResident !== residentId) {
      setExpandedResident(residentId);
      setOpenPreviousDrawer({});
      scrollCardIntoViewAfterExpand(residentId);
    } else {
      setOpenPreviousDrawer(prev => ({ ...prev, [residentId]: !prev[residentId] }));
    }
  };

  // When the user taps the main card header area (right side):
  // - Collapsing: just collapse, no scroll
  // - Expanding: Phase 1 expand in place, Phase 2 scroll after drawer settles
  const handleResidentHeaderClick = (residentId) => {
    if (expandedResident === residentId) {
      setExpandedResident(null);
      setOpenPreviousDrawer({});
    } else {
      setExpandedResident(residentId);
      setOpenPreviousDrawer({});
      scrollCardIntoViewAfterExpand(residentId);
    }
  };

  const openModal = (type, residentId, expenseId = null, amount = '', description = '', paid = false) => {
    if (type === 'calendar') {
      setCalendarTargetField('appCurrent');
      setTempYear(currentYear);
      setTempMonthIdx(currentMonthIdx);
    }
    setModal({ type, residentId, expenseId, amount, description, paid });
  };

  const closeModal = () => setModal(m => ({ ...m, type: null }));

  const closePastDrawerIfEmpty = (updatedResidents, residentId) => {
    const resident = updatedResidents.find(r => r.id === residentId);
    if (!resident) return;
    const hasPast = resident.expenses.some(exp => isPastExpense(exp.month) && !exp.paid);
    if (!hasPast) {
      setOpenPreviousDrawer(prev => ({ ...prev, [residentId]: false }));
    }
  };

  const handleConfirmModal = () => {
    if (!modal.residentId) return;
    const parsedAmount = parseFloat(modal.amount) || 0;
    const desc = modal.description.trim() || 'Monthly Fee';

    setResidents(prev => {
      const updated = prev.map(res => {
        if (res.id !== modal.residentId) return res;
        let expenses = [...res.expenses];
        if (modal.type === 'add') {
          expenses.push({ id: 'exp-' + Date.now(), description: desc, amount: parsedAmount, paid: modal.paid, month: currentMonthString });
        } else if (modal.type === 'edit' && modal.expenseId) {
          expenses = expenses.map(exp => exp.id === modal.expenseId ? { ...exp, description: desc, amount: parsedAmount, paid: modal.paid } : exp);
        }
        return { ...res, expenses };
      });
      closePastDrawerIfEmpty(updated, modal.residentId);
      return updated;
    });
    closeModal();
  };

  const handleDeleteExpense = () => {
    if (!modal.residentId || !modal.expenseId) return;
    setResidents(prev => {
      const updated = prev.map(res =>
        res.id === modal.residentId
          ? { ...res, expenses: res.expenses.filter(exp => exp.id !== modal.expenseId) }
          : res
      );
      closePastDrawerIfEmpty(updated, modal.residentId);
      return updated;
    });
    closeModal();
  };

  // ─── BUILDING EXPENSES MODAL ──────────────────────────────────────────────
  const [buildingModal, setBuildingModal] = useState({
    type: null, expenseId: null, amount: '', description: '', paid: false
  });

  const openBuildingModal = (type, expenseId = null, amount = '', description = '', paid = false) => {
    setBuildingModal({ type, expenseId, amount, description, paid });
  };

  const closeBuildingModal = () => setBuildingModal(m => ({ ...m, type: null }));

  const handleConfirmBuildingModal = () => {
    const parsedAmount = parseFloat(buildingModal.amount) || 0;
    const desc = buildingModal.description.trim() || 'Building Expense';
    if (buildingModal.type === 'add') {
      setBuildingExpenses(prev => [...prev, {
        id: 'bexp-' + Date.now(),
        description: desc,
        amount: parsedAmount,
        paid: buildingModal.paid,
        month: currentMonthString,
      }]);
    } else if (buildingModal.type === 'edit' && buildingModal.expenseId) {
      setBuildingExpenses(prev => prev.map(exp =>
        exp.id === buildingModal.expenseId
          ? { ...exp, description: desc, amount: parsedAmount, paid: buildingModal.paid }
          : exp
      ));
    }
    closeBuildingModal();
  };

  const handleDeleteBuildingExpense = () => {
    if (!buildingModal.expenseId) return;
    setBuildingExpenses(prev => prev.filter(exp => exp.id !== buildingModal.expenseId));
    closeBuildingModal();
  };

  const handleConfirmCalendar = () => {
    const formattedString = `${D.monthNames[tempMonthIdx].substring(0, 3)} ${tempYear}`;
    if (calendarTargetField === 'appCurrent') {
      setCurrentYear(tempYear);
      setCurrentMonthIdx(tempMonthIdx);
    } else if (calendarTargetField === 'rangeFrom') {
      setFromMonth(formattedString);
    } else if (calendarTargetField === 'rangeTo') {
      setToMonth(formattedString);
    }
    closeModal();
  };

  const handleOpenRangePicker = (target) => {
    setCalendarTargetField(target);
    setTempYear(systemDate.getFullYear());
    setTempMonthIdx(systemDate.getMonth());
    setModal({ type: 'calendar', residentId: null, expenseId: null, amount: '', description: '', paid: false });
  };

  // Derives the scroll index for the year roller from the currently selected year.
  const currentTimelineIndex = useMemo(() => {
    const foundIdx = window.TIMELINE_YEARS.indexOf(tempYear);
    return foundIdx !== -1 ? foundIdx : 11;
  }, [tempYear]);

  const cycleCurrency = (direction) => {
    setCurrencyIndex(prev => {
      let next = prev + direction;
      if (next < 0) next = D.currencyOptions.length - 1;
      if (next >= D.currencyOptions.length) next = 0;
      return next;
    });
  };

  // Delete range is active only when both endpoints have been chosen.
  const isDeleteRangeActive = fromMonth !== '' && toMonth !== '';

  const handleDeleteSelectedRangeData = () => {
    if (!isDeleteRangeActive) return;

    const parseMonthString = (str) => {
      if (!str) return { year: 0, monthIdx: 0 };
      const [mStr, yStr] = str.split(' ');
      const year = parseInt(yStr) || 0;
      const shortNames = D.monthNames.map(n => n.substring(0, 3).toUpperCase());
      const monthIdx = shortNames.indexOf(mStr.toUpperCase());
      return { year, monthIdx };
    };

    const fromVal = parseMonthString(fromMonth);
    const toVal   = parseMonthString(toMonth);

    setResidents(prev => {
      return prev.map(res => {
        const filteredExpenses = res.expenses.filter(exp => {
          const [expMonthName, expYearStr] = exp.month.split(' ');
          const expYear    = parseInt(expYearStr) || 0;
          const expMonthIdx = D.monthNames.indexOf(expMonthName);

          const itemTime  = expYear * 12 + expMonthIdx;
          const startTime = fromVal.year * 12 + fromVal.monthIdx;
          const endTime   = toVal.year * 12 + toVal.monthIdx;

          const isInRange = itemTime >= startTime && itemTime <= endTime;
          return !isInRange;
        });
        return { ...res, expenses: filteredExpenses };
      });
    });

    setFromMonth('');
    setToMonth('');
  };

  const handleOpenAddCard = () => {
    setCardModal({ type: 'addCard', residentId: null });
  };

  const handleOpenEditCard = (residentId, e) => {
    e.stopPropagation();
    setCardModal({ type: 'editCard', residentId });
  };

  const closeCardModal = () => {
    setCardModal({ type: null, residentId: null });
  };

  // Builds a new resident object from form fields.
  // Used by both "OK" (close modal) and "+ Next" (keep modal open) flows.
  const createResident = ({ name, apartment, notes }) => ({
    id: 'R-' + Date.now(),
    name: name || 'New Resident',
    apartment: apartment || '—',
    notes: notes || '',
    expenses: [],
  });

  const handleConfirmAddCard = (fields) => {
    setResidents(prev => [...prev, createResident(fields)]);
    closeCardModal();
  };

  const handleNextAddCard = (fields) => {
    setResidents(prev => [...prev, createResident(fields)]);
    // Modal stays open; CardProfileModal resets its own fields after calling onNext.
  };

  const handleConfirmEditCard = ({ name, apartment, notes }) => {
    setResidents(prev => prev.map(res =>
      res.id === cardModal.residentId
        ? { ...res, name: name || res.name, apartment: apartment || res.apartment, notes }
        : res
    ));
    closeCardModal();
  };

  const handleDeleteCardRequest = () => {
    setCardModal(prev => ({ ...prev, type: 'deleteCard' }));
  };

  const handleConfirmDeleteCard = () => {
    setResidents(prev => prev.filter(res => res.id !== cardModal.residentId));
    if (expandedResident === cardModal.residentId) {
      setExpandedResident(null);
      setOpenPreviousDrawer({});
    }
    closeCardModal();
  };

  const handleCancelDeleteCard = () => {
    setCardModal(prev => ({ ...prev, type: 'editCard' }));
  };

  const editingResident = useMemo(() => {
    if (!cardModal.residentId) return null;
    return residents.find(r => r.id === cardModal.residentId) || null;
  }, [cardModal.residentId, residents]);

  const cardModalContentAnim = MB.contentAnimation(A);
  const cardModalBackdropAnim = MB.backdropAnimation(A);

  return (
    <div style={{ fontFamily: D.fontFamily }} className={LAYOUT.appWrapper}>
      <div style={LAYOUT.appMaxWidthStyle} className={LAYOUT.appInnerContainer}>

        {/* Sticky header — ref measured to compute accurate scroll offsets */}
        <header ref={headerRef} style={HDR.stickyContainerStyle} className={HDR.stickyContainer}>
          <div className={HDR.topRow}>
            <div className={HDR.leftActionGroup}>
              <button className={HDR.touchTargetBtn} onClick={() => setIsMainMenuOpen(true)}>
                <SpriteIcon id="icon-hamburger" className={ICN.actionIconSize} />
              </button>
              <button className={HDR.touchTargetBtn} onClick={handleOpenAddCard}>
                <SpriteIcon id="icon-button-add-user" className={ICN.actionIconSize} />
              </button>
              <WalletFlipButton onToggle={handleToggleView} />
            </div>

            <div className={HDR.debtSection}>
              <span className={HDR.totalDebtLabel}>Total Debt</span>
              <span className={HDR.totalDebtAmount}>
                <CurrencySymbol activeSymbol={activeCurrencySymbol} className={HDR.currencySizeMod} />{formatAmount(totalAllDebts)}
              </span>
            </div>

            {/* Sync button — visible but inert until backend sync is implemented */}
            <div className={HDR.syncIconWrapper}>
              <button className={HDR.touchTargetBtn} onClick={() => { /* TODO: implement sync */ }}>
              <SpriteIcon id="icon-synced" className={ICN.syncIconSize} style={IC.synced} />
              </button>
            </div>
          </div>

          <div className={HDR.bottomRow}>
            <button
              className={HDR.monthTextBtn}
              style={{ color: isFilteredAwayFromToday ? HDR.monthTextBtnOtherColor : HDR.monthTextBtnCurrentColor }}
              onClick={() => openModal('calendar', null)}
            >
              {currentMonthString}
            </button>

            <div className={HDR.navPillContainer}>
              <div className={HDR.navPillIconArea}>
                <SpriteIcon id="icon-arrow-left" className={ICN.rollerArrowSize} />
              </div>
              <div className={HDR.navPillIconArea}>
                <SpriteIcon id="icon-arrow-right" className={ICN.rollerArrowSize} />
              </div>
              <div className={HDR.navPillLeftTapZone} onClick={handlePrevMonth} />
              <div className={HDR.navPillRightTapZone} onClick={handleNextMonth} />
            </div>

            <button
              onClick={handleGoToCurrentMonth}
              className={HDR.goTodayFloatBtn}
              style={{ opacity: isFilteredAwayFromToday ? HDR.goTodayActiveOpacity : HDR.goTodayInactiveOpacity }}
            >
              <SpriteIcon id="icon-go-today" className={ICN.actionIconSize} />
            </button>
          </div>
        </header>

        <div style={{ height: SPC.headerToListGap }} />

        {/* ── ANIMATED VIEW: RESIDENT CARDS or BUILDING EXPENSES ── */}
        {(() => {
          const isTransitioning = buildingViewAnimState === 'transitioning';
          const dur   = A.viewTransitionDuration;
          const curve = A.viewTransitionCurve;
          const VT    = D.viewTransition;

          const enterStyle = isBuildingView
            ? VT.enterFromRightStyle(dur, curve)
            : VT.enterFromLeftStyle(dur, curve);

          const exitStyle = VT.exitStyle(dur, curve);

          const cardsView = (
            <div className={CARD.cardListContainer}>
              {processedResidents.map((resident) => {
                const isExpanded   = expandedResident === resident.id;
                const isDrawerOpen = isExpanded && (openPreviousDrawer[resident.id] || false);

                const currentMonthExpenses = resident.expenses.filter(exp => exp.month === currentMonthString);
                // Filtered once and reused for both the hasPastUnpaidItems guard and the drawer list.
                const pastUnpaidExpenses   = resident.expenses.filter(exp => isPastExpense(exp.month) && !exp.paid);

                const currentUnpaidTotal = currentMonthExpenses.filter(exp => !exp.paid).reduce((sum, exp) => sum + exp.amount, 0);
                const pastUnpaidTotal    = pastUnpaidExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                const totalResidentDebt  = currentUnpaidTotal + pastUnpaidTotal;

                const combinedCurrentExpenses = [...currentMonthExpenses].sort((a, b) => a.paid - b.paid);
                const hasPastUnpaidItems      = pastUnpaidExpenses.length > 0;

                return (
                  // Ref callback stores each card's DOM node keyed by residentId,
                  // enabling targeted scroll-into-view after the drawer expands.
                  <div
                    key={resident.id}
                    ref={el => cardRefs.current[resident.id] = el}
                    style={DRW.cardRoundingContainerStyle(hasPastUnpaidItems)}
                    className={CARD.cardWrapper}
                  >
                    <div className={CARD.cardBody}>
                      <div className={CARD.cardInnerPadding}>

                        <div className={CARD.cardHeaderContainer}>
                          <button
                            className={CARD.avatarBtn}
                            onClick={(e) => handleOpenEditCard(resident.id, e)}
                          >
                            {totalResidentDebt > 0 ? (
                              <SpriteIcon
                                id="icon-avatar-debt"
                                className={CARD.avatarIcon}
                                style={IC.avatarDebt}
                              />
                              ) : (
                                <SpriteIcon
                                  id="icon-avatar-nodebt"
                                  className={CARD.avatarIconNoDebt}
                                  style={IC.avatarNoDebt}
                                />
                              )}
                          </button>

                          <div
                            className={CARD.cardHeaderRightArea}
                            onClick={() => handleResidentHeaderClick(resident.id)}
                          >
                            <div className={CARD.textMetaArea}>
                              <h2 className={CARD.residentName}>{resident.name}</h2>
                              <p className={CARD.apartmentNumber}>{resident.apartment}</p>
                            </div>
                            <div className={CARD.balanceArea}>
                              {totalResidentDebt > 0 ? (
                                <span className={CARD.totalDebtText}>
                                  <CurrencySymbol activeSymbol={activeCurrencySymbol} className={CARD.totalDebtCurrencyMod} />{formatAmount(totalResidentDebt)}
                                </span>
                              ) : (
                                <span className={CARD.noDebtText}>No debt</span>
                              )}
                              <span style={CARD.caretRotationStyle(isExpanded, A)}>
                                <SpriteIcon id="icon-caret" className={ICN.caretIconSize} />
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>

                      <Drawer isOpen={isExpanded}>
                        <div>
                          <div className={CARD.monthActionRow}>
                            <span className={CARD.monthActionLabel}>
                              Debts for {currentMonthString}
                            </span>
                            <button onClick={() => openModal('add', resident.id)} className={CARD.addExpenseBtn}>
                              + Add
                            </button>
                          </div>

                          <div className={CARD.itemContainer}>
                            {combinedCurrentExpenses.length === 0 ? (
                              <p className={CARD.noExpensesFallback}>No expenses logged for this month.</p>
                            ) : (
                              <div>
                                {combinedCurrentExpenses.map((expense, idx) => (
                                  <div
                                    key={expense.id}
                                    className={`${idx === 0 ? '' : CARD.itemRowDividerStyle} ${CARD.itemRowWrapper}`}
                                    onClick={() => openModal('edit', resident.id, expense.id, expense.amount.toString(), expense.description, expense.paid)}
                                  >
                                    <div className={CARD.interactiveIconArea}>
                                      <div className={CARD.iconStateBtn}>
                                        <PaidStatusIcon paid={expense.paid} />
                                      </div>
                                      <span className={CARD.expenseDescription(expense.paid)}>
                                        {expense.description}
                                      </span>
                                    </div>
                                    <span className={CARD.expenseValueAmount(expense.paid)}>
                                      <CurrencySymbol activeSymbol={activeCurrencySymbol} className={CARD.expenseValueCurrencyMod} />{formatAmount(expense.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Drawer>
                    </div>

                    {hasPastUnpaidItems && (
                      <div>
                        <Drawer isOpen={isDrawerOpen}>
                          <div className={DRW.drawerWrapper}>
                            {pastUnpaidExpenses.map((pastExpense, idx) => (
                              <div
                                key={pastExpense.id}
                                className={`${idx === 0 ? DRW.rowItemFirst : DRW.rowItemDividerStyle} ${DRW.rowItemWrapper}`}
                                onClick={() => openModal('edit', resident.id, pastExpense.id, pastExpense.amount.toString(), pastExpense.description, pastExpense.paid)}
                              >
                                <div className={CARD.interactiveIconArea}>
                                  <div className={CARD.iconStateBtn}>
                                    <PaidStatusIcon paid={pastExpense.paid} />
                                  </div>
                                  <div className={DRW.metaSubTextGroup}>
                                    <span className={CARD.expenseDescription(pastExpense.paid)}>{pastExpense.description}</span>
                                    <span className={DRW.pastMonthLabel}>{pastExpense.month}</span>
                                  </div>
                                </div>
                                <div className={CARD.expenseValueAmount(pastExpense.paid)}>
                                  <CurrencySymbol activeSymbol={activeCurrencySymbol} className={CARD.expenseValueCurrencyMod} />{formatAmount(pastExpense.amount)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Drawer>

                        <div onClick={() => togglePreviousDrawer(resident.id)} style={DRW.toggleBarRoundingStyle} className={DRW.toggleBar}>
                          <span style={CARD.caretRotationStyle(isDrawerOpen, A)}>
                            <SpriteIcon id="icon-caret" className={ICN.caretIconSize} />
                          </span>
                          <div className={DRW.toggleBarLabelArea}>
                            <span className={DRW.toggleBarText}>
                              previous months total
                            </span>
                            <span className={DRW.toggleBarAmount}>
                              <CurrencySymbol activeSymbol={activeCurrencySymbol} className={DRW.toggleBarCurrencyMod} />{formatAmount(pastUnpaidTotal)}
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

          const buildingView = (
            <BuildingExpenses
              expenses={buildingExpenses}
              currentMonthString={currentMonthString}
              isPastExpense={isPastExpense}
              activeCurrencySymbol={activeCurrencySymbol}
              openBuildingModal={openBuildingModal}
            />
          );

          if (isTransitioning) {
            return (
              <div style={VT.outerStyle}>
                <div style={exitStyle}>
                  {isBuildingView ? cardsView : buildingView}
                </div>
                <div style={enterStyle}>
                  {isBuildingView ? buildingView : cardsView}
                </div>
              </div>
            );
          }

          return isBuildingView ? buildingView : cardsView;
        })()}

        {isMainMenuOpen && (
          <div style={MNU.backdropAnimation(A)} className={MNU.backdropOverlay} onClick={() => setIsMainMenuOpen(false)}>
            <div style={{ ...MNU.boxContainerStyle, ...MNU.contentAnimation(A) }} className={MNU.boxContainer} onClick={(e) => e.stopPropagation()}>

              <div className={MNU.sectionRow}>
                <span className={MNU.sectionLabelLeft}>Language</span>
                <div className={MNU.optionsRightGroup}>
                  {/* Language selector — wire into a localisation map when translations are available */}
                  <button onClick={() => setCurrentLanguage('EN')} className={`${MNU.pillButton} ${currentLanguage === 'EN' ? MNU.activeRingClass : ''}`}>EN</button>
                  <button onClick={() => setCurrentLanguage('GR')} className={`${MNU.pillButton} ${currentLanguage === 'GR' ? MNU.activeRingClass : ''}`}>GR</button>
                </div>
              </div>

              <div className={MNU.sectionRow}>
                <span className={MNU.sectionLabelLeft}>Sort by</span>
                <div className={MNU.optionsRightGroup}>
                  <button onClick={() => setCurrentSortBy('Tag')} className={`${MNU.pillButton} ${currentSortBy === 'Tag' ? MNU.activeRingClass : ''}`}>Tag</button>
                  <button onClick={() => setCurrentSortBy('Debt')} className={`${MNU.pillButton} ${currentSortBy === 'Debt' ? MNU.activeRingClass : ''}`}>Debt</button>
                </div>
              </div>

              <div className={MNU.sectionRow}>
                <span className={MNU.sectionLabelLeft}>Symbol</span>
                <div className={MNU.optionsRightGroup}>
                  <div className={MNU.symbolPill}>
                    <div className={MNU.symbolIconArea}>
                      <SpriteIcon id="icon-arrow-left" className={ICN.rollerArrowSize} />
                    </div>
                    <div className={MNU.symbolRollWrapper}>
                      <div
                        className={MNU.symbolRollContainer}
                        style={{
                          transform: `translateY(-${currencyIndex * 28}px)`,
                          height: `${D.currencyOptions.length * 28}px`,
                          transition: A.rollerTransition,
                          top: '0px'
                        }}
                      >
                        {D.currencyOptions.map(option => (
                          <div key={option.label} className={MNU.symbolText}>{option.label}</div>
                        ))}
                      </div>
                    </div>
                    <div className={MNU.symbolIconArea}>
                      <SpriteIcon id="icon-arrow-right" className={ICN.rollerArrowSize} />
                    </div>
                    <div className={MNU.symbolLeftTapZone} onClick={() => cycleCurrency(-1)} />
                    <div className={MNU.symbolRightTapZone} onClick={() => cycleCurrency(1)} />
                  </div>
                </div>
              </div>

              <div className={MNU.dateRangeSection}>
                <div className={MNU.dateRangeButtonsRow}>
                  <button onClick={() => handleOpenRangePicker('rangeFrom')} className={MNU.dateRangeBtn}>
                    {fromMonth || 'From month'}
                  </button>
                  <button onClick={() => handleOpenRangePicker('rangeTo')} className={MNU.dateRangeBtn}>
                    {toMonth || 'To month'}
                  </button>
                </div>
                <button
                  onClick={handleDeleteSelectedRangeData}
                  disabled={!isDeleteRangeActive}
                  className={`${MNU.deleteBtn} ${isDeleteRangeActive ? MNU.deleteActiveRingClass : ''}`}
                >
                  <SpriteIcon id="icon-trash" className={MNU.deleteIconClass(isDeleteRangeActive)} />
                  <span className={MNU.deleteText(isDeleteRangeActive)}>Delete data</span>
                </button>
              </div>

              <div className={MNU.footerRow}>
                {/* PDF export button — stub until export logic is implemented */}
                <button className={MNU.actionBtn} onClick={() => { /* TODO: implement PDF export */ }}>
                  <SpriteIcon id="icon-download" className={MNU.actionBtnIconSize} /> PDF
                </button>
                <button className={MNU.actionBtn} onClick={() => setIsMainMenuOpen(false)}>
                  Exit
                </button>
              </div>

            </div>
          </div>
        )}

        {modal.type && (
          <div style={MB.backdropAnimation(A)} className={MB.backdropOverlay} onClick={closeModal}>

            {modal.type === 'calendar' && (
              <div style={{ ...MB.boxContainerStyle, ...MB.contentAnimation(A) }} className={MB.boxContainer} onClick={(e) => e.stopPropagation()}>
                <div className={CAL.yearPill}>
                  <div className={CAL.yearIconArea}>
                    <SpriteIcon id="icon-arrow-left" className={ICN.rollerArrowSize} />
                  </div>
                  <div className={CAL.yearRollWrapper}>
                    <div
                      className={CAL.yearRollContainer}
                      style={{
                        transform: `translateY(-${currentTimelineIndex * 28}px)`,
                        height: `${window.TIMELINE_YEARS.length * 28}px`,
                        transition: A.rollerTransition,
                        top: '0px'
                      }}
                    >
                      {window.TIMELINE_YEARS.map(year => (
                        <div key={year} className={CAL.yearText}>{year}</div>
                      ))}
                    </div>
                  </div>
                  <div className={CAL.yearIconArea}>
                    <SpriteIcon id="icon-arrow-right" className={ICN.rollerArrowSize} />
                  </div>
                  <div className={CAL.leftTapZone} onClick={() => setTempYear(y => Math.max(window.TIMELINE_YEARS[0], y - 1))} />
                  <div className={CAL.rightTapZone} onClick={() => setTempYear(y => Math.min(window.TIMELINE_YEARS[window.TIMELINE_YEARS.length - 1], y + 1))} />
                </div>

                <div className={CAL.gridContainer}>
                  {D.monthNames.map((monthName, idx) => {
                    const isSelected = tempMonthIdx === idx;
                    return (
                      <button key={monthName} onClick={() => setTempMonthIdx(idx)} className={`${CAL.monthCircle} ${isSelected ? CAL.monthActiveRing : ''}`}>
                        {monthName.substring(0, 3).toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                <div className={CAL.footerRow}>
                  <button className={CAL.actionBtn} onClick={handleConfirmCalendar}>OK</button>
                  <button className={CAL.actionBtn} onClick={closeModal}>Cancel</button>
                </div>
              </div>
            )}

            {/* Expense modal — handles add / edit / delete for resident expenses */}
            {(modal.type === 'add' || modal.type === 'edit' || modal.type === 'delete') && (
              <ExpenseModal
                modalState={modal}
                setModalState={setModal}
                onConfirm={handleConfirmModal}
                onClose={closeModal}
                onDelete={handleDeleteExpense}
                unpaidIconId="icon-button-unpaid"
                unpaidIconColors={IC.buttonUnpaid}
              />
            )}
          </div>
        )}

        {cardModal.type && (
          <div
            style={cardModalBackdropAnim}
            className={MB.backdropOverlay}
            onClick={closeCardModal}
          >
            {/* Width wrapper prevents Flexbox from collapsing the modal to 0px.
                See the architectural guardrail note in DesignConfig.js for details. */}
            <div className={CM.wrapper} onClick={(e) => e.stopPropagation()}>
              {cardModal.type === 'addCard' && (
                <CardProfileModal
                  mode="add"
                  residentData={null}
                  onConfirm={handleConfirmAddCard}
                  onNext={handleNextAddCard}
                  onCancel={closeCardModal}
                  animStyle={cardModalContentAnim}
                />
              )}

              {cardModal.type === 'editCard' && editingResident && (
                <CardProfileModal
                  mode="edit"
                  residentData={editingResident}
                  onConfirm={handleConfirmEditCard}
                  onNext={null}
                  onCancel={closeCardModal}
                  onDeleteRequest={handleDeleteCardRequest}
                  animStyle={cardModalContentAnim}
                />
              )}

              {cardModal.type === 'deleteCard' && (
                <DeleteCardConfirmModal
                  onConfirm={handleConfirmDeleteCard}
                  onCancel={handleCancelDeleteCard}
                  animStyle={cardModalContentAnim}
                />
              )}
            </div>
          </div>
        )}

        {/* Expense modal — handles add / edit / delete for building expenses */}
        {(buildingModal.type === 'add' || buildingModal.type === 'edit' || buildingModal.type === 'buildingDelete') && (
          <ExpenseModal
            modalState={buildingModal}
            setModalState={setBuildingModal}
            onConfirm={handleConfirmBuildingModal}
            onClose={closeBuildingModal}
            onDelete={handleDeleteBuildingExpense}
            unpaidIconId="icon-building-expenseunpaid"
            unpaidIconColors={IC.buildingExpenseUnpaid}
          />
        )}

      </div>
    </div>
  );
};