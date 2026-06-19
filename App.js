// =========================================================================
// MAIN APPLICATION CONTROLLER
// =========================================================================
// Manages residents, expenses, navigation state, and user interactions.
// All styling references use window.DESIGN tokens - no hardcoded hex values.
// =========================================================================

const { useState, useCallback, useMemo, useRef, useEffect } = React;

const systemDate = new Date();
function getMonthKey(year, month) { return year * 12 + month; }

// Calendar year range configuration
const CALENDAR_START_YEAR = 2015;
const CALENDAR_END_YEAR = 2045;
const TIMELINE_YEARS = Array.from(
  { length: CALENDAR_END_YEAR - CALENDAR_START_YEAR + 1 },
  (_, i) => CALENDAR_START_YEAR + i
);
window.TIMELINE_YEARS = TIMELINE_YEARS;

// Default month names fallback (used only if translations fail to load)
const DEFAULT_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Formats a numeric amount by removing unnecessary decimal places
// Returns integer as string, or float with trailing zeros trimmed
function formatAmount(amount) {
  const num = parseFloat(amount);
  if (num % 1 === 0) return num.toString();
  return num.toFixed(2).replace(/\.?0+$/, '');
}

// ─── SPRITE ICON COMPONENT ────────────────────────────────────────────────
// Renders an SVG sprite icon via <use> tag. The sprite sheet is injected
// into the DOM from icons.svg before React mounts.
function SpriteIcon({ id, className = '', style }) {
  return (
    <svg className={className} style={style} aria-hidden="true" focusable="false">
      <use href={`#${id}`} />
    </svg>
  );
}

// Renders a checkmark for paid status or warning icon for unpaid status
function PaidStatusIcon({ paid }) {
  const ICN = window.DESIGN.icons;
  const IC  = window.DESIGN.iconColors;
  return paid
    ? <SpriteIcon id="icon-check" className={ICN.statusIconSize} style={IC.check} />
    : <SpriteIcon id="icon-warning-filled" className={ICN.statusIconSize} style={IC.warningFilled} />;
}

// Displays currency symbol if one is active (non-empty string)
function CurrencySymbol({ activeSymbol, className = '' }) {
  if (activeSymbol === '') return null;
  return <span className={className}>{activeSymbol}</span>;
}

// Animated expandable container that auto-adjusts height based on content
// Uses ResizeObserver to detect content size changes during animations
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

// Textarea that automatically expands vertically up to a maximum line count
// Height transitions smoothly as user types or content changes
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

// Modal for adding or editing resident card information
// Handles name, apartment/tag, and notes fields with add/edit/delete modes
function CardProfileModal({ mode, residentData, onConfirm, onNext, onCancel, onDeleteRequest, animStyle, t }) {
  const CM = window.DESIGN.cardModal;
  const MB = window.DESIGN.modalBase;

  const [name, setName] = useState(residentData?.name || '');
  const [apartment, setApartment] = useState(residentData?.apartment || '');
  const [notes, setNotes] = useState(residentData?.notes || '');

  const handleConfirm = () => {
    onConfirm({ name: name.trim(), apartment: apartment.trim(), notes: notes.trim() });
  };

  const handleNext = () => {
    onNext({ name: name.trim(), apartment: apartment.trim(), notes: notes.trim() });
    setName('');
    setApartment('');
    setNotes('');
  };

  const isAdd = mode === 'add';

  return (
    <div
      style={{ ...MB.boxContainerStyle, ...animStyle, padding: CM.containerPadding, maxWidth: '376px' }}
      className={MB.boxContainer}
    >
      <div className={CM.headerRow} style={{ marginBottom: CM.containerGap }}>
        <SpriteIcon
          id={isAdd ? 'icon-button-add-user' : 'icon-edit'}
          className={CM.headerIcon}
        />
        <span className={CM.headerLabel}>{isAdd ? t('add_card') : t('edit_card')}</span>
      </div>

      <div className={CM.fieldsContainer} style={{ gap: CM.fieldGap }}>
        <div className={CM.fieldWrapper}>
          <input
            type="text"
            placeholder={t('name_title')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${CM.fieldInput} ${CM.nameFieldInput} ${CM.placeholderStyle}`}
            style={{ height: CM.fieldHeight, padding: CM.fieldPadding }}
          />
        </div>

        <div className={CM.fieldWrapper}>
          <input
            type="text"
            placeholder={t('apartment_tag')}
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
            className={`${CM.fieldInput} ${CM.apartmentFieldInput} ${CM.placeholderStyle}`}
            style={{ height: CM.fieldHeight, padding: CM.fieldPadding }}
          />
        </div>
      </div>

      <div style={{ marginTop: CM.notesSectionGap }}>
        <div className={CM.notesSection}>
          <div className={CM.notesTitleRow}>
            <SpriteIcon id="icon-notes" className={CM.notesIcon} />
            <span className={CM.notesTitle}>{t('notes')}</span>
          </div>

          <div className={CM.notesFieldWrapper}>
            <AutoTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${CM.notesField} ${CM.placeholderStyle}`}
              style={{
                padding: CM.notesFieldPadding,
                minHeight: CM.notesFieldMinHeight
              }}
            />
          </div>
        </div>
      </div>

      <div className={CM.buttonRow} style={{ marginTop: CM.containerGap, gap: CM.buttonGap }}>
        {isAdd ? (
          <>
            <button className={`${CM.baseBtn} ${CM.okBtn}`} onClick={handleConfirm}>
              {t('ok')}
            </button>
            <button className={`${CM.baseBtn} ${CM.nextBtn}`} onClick={handleNext}>
              {t('next')}
            </button>
            <button className={`${CM.baseBtn} ${CM.cancelTextBtn}`} onClick={onCancel}>
  {t('exit')}
</button>
          </>
        ) : (
          <>
            <button className={`${CM.baseBtn} ${CM.okBtn}`} onClick={handleConfirm}>
              {t('ok')}
            </button>
            <button className={`${CM.baseBtn} ${CM.cancelTextBtn}`} onClick={onCancel}>
              {t('cancel')}
            </button>
            <button className={CM.trashBtn} onClick={onDeleteRequest}>
              <SpriteIcon id="icon-trash" className={CM.trashIconSize} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Confirmation modal shown before deleting a resident card
function DeleteCardConfirmModal({ onConfirm, onCancel, animStyle, t }) {
  const CM = window.DESIGN.cardModal;
  const MB = window.DESIGN.modalBase;
  return (
    <div
      style={{ ...CM.deleteConfirmBoxStyle, ...animStyle }}
      className={MB.boxContainer}
    >
      <p className={CM.deleteConfirmTitle}>{t('delete_card_confirm')}</p>
      <div className={CM.deleteConfirmRow}>
        <button className={CM.deleteConfirmYesBtn} onClick={onConfirm}>{t('yes')}</button>
        <button className={CM.deleteConfirmNoBtn} onClick={onCancel}>{t('no')}</button>
      </div>
    </div>
  );
}

// Wraps any modal with consistent backdrop, animation, and click-to-close
function ModalWrapper({ isOpen, onClose, children }) {
  const MB = window.DESIGN.modalBase;
  const A = window.DESIGN.animation;
  
  if (!isOpen) return null;
  
  return (
    <div 
      style={{ ...MB.backdropAnimation(A), ...MB.backdropOverlayStyle }}
      className={MB.backdropOverlay}
      onClick={() => onClose()}
    >
      {children}
    </div>
  );
}

// 3D flip button that toggles between resident cards and building expenses views
function WalletFlipButton({ onToggle, t }) {
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
      aria-label={isFlipped ? t('show_resident_cards') : t('show_building_expenses')}
    >
      <div style={WFB.flipperStyle(isFlipped, A.coinFlipDuration)}>
        <div style={WFB.faceBase}>
          <SpriteIcon id="icon-wallet" className={WFB.faceIconSize} />
        </div>
        <div style={WFB.backFaceStyle}>
          <SpriteIcon id="icon-residentcard" className={WFB.faceIconSize} />
        </div>
      </div>
    </button>
  );
}

// Modal for adding, editing, or deleting expenses (both resident and building)
function ExpenseModal({ modalState, setModalState, onConfirm, onClose, onDelete, unpaidIconId, unpaidIconColors, t }) {
  const MDL = window.DESIGN.modal;
  const MB  = window.DESIGN.modalBase;
  const IC  = window.DESIGN.iconColors;

  const isAddOrEdit = modalState.type === 'add' || modalState.type === 'edit';
  const isDelete    = modalState.type === 'delete' || modalState.type === 'buildingDelete';

  if (!isAddOrEdit && !isDelete) return null;

  return (
    <>
      {isAddOrEdit && (
        <div style={{ ...MB.boxContainerStyle, ...MB.contentAnimation(window.DESIGN.animation) }} className={MB.boxContainer} onClick={(e) => e.stopPropagation()}>

          <div className={MDL.headerRow}>
            <SpriteIcon id="icon-edit" className={MDL.headerIcon} />
            <span className={MDL.headerTitle}>
              {modalState.type === 'add' ? t('add_expense_modal') : t('edit_expense_modal')}
            </span>
          </div>

          <div className={MDL.actionsFlexRow} style={{ marginBottom: MDL.amountToDescriptionGap }}>
            <div style={MDL.amountInputBoxStyle} className={MDL.amountInputBox}>
              <input
                type="number"
                placeholder={t('amount_placeholder')}
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
              placeholder={t('expense_placeholder')}
              value={modalState.description}
              onChange={(e) => setModalState(m => ({ ...m, description: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); }}
              className={MDL.descriptionInputField}
              style={MDL.descriptionPlaceholderStyle}
            />
          </div>

          <div className={MDL.actionsFlexRow}>
            <button onClick={onConfirm} className={MDL.confirmBtn}>{t('ok')}</button>
            <button onClick={onClose} className={MDL.cancelBtn}>{t('cancel')}</button>
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
          <h4 className={MDL.deletePromptTitle}>{t('delete_expense_confirm')}</h4>
          <div className={MDL.actionsFlexRow}>
            <button onClick={onDelete} style={MDL.deleteYesBtnStyle} className={MDL.deleteYesBtn}>{t('yes')}</button>
            <button onClick={() => setModalState(m => ({ ...m, type: 'edit' }))} className={MDL.deleteNoBtn}>{t('no')}</button>
          </div>
        </div>
      )}
    </>
  );
}

// Displays building/community expenses with current month and past unpaid sections
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
                  <div className={BE.itemIconArea}>
                    <PaidStatusIcon paid={exp.paid} />
                  </div>
                  <span className={BE.itemDescription}>{exp.description}</span>
                </div>
                <span className={BE.itemAmount(exp.paid)}>
                  <CurrencySymbol activeSymbol={activeCurrencySymbol} className={BE.itemCurrencyMod} />{formatAmount(exp.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className={BE.addBtnWrapper} style={{ paddingBottom: BE.sectionPaddingBottom }}>
          <button className={BE.addBtn} onClick={() => openBuildingModal('add')}>
            {t('add_expense')}
          </button>
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
                  <div className={BE.itemIconArea}>
                    <PaidStatusIcon paid={exp.paid} />
                  </div>
                  <div className={BE.prevItemTextCol}>
                  <span className={BE.itemDescription}>{exp.description}</span>
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

// Generates random test data for initial residents with expenses spanning current and past months
function generateInitialResidents(D, monthNames, currentMonthString, currentMonthKey) {
  const SURNAMES = ['Ramirez', 'Chen', 'Marcus', 'Patel', 'Kowalski', 'Nguyen', 'Ferreira', 'Schmidt', 'Okafor', 'Petrov'];
  const EXPENSE_NAMES = ['Monthly Maintenance', 'Heating Oil', 'Elevator Repair', 'Water Balance', 'Shared Repairs', 'Stairwell Lighting'];
  const APARTMENTS = ['1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C'];

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pickUnique = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

  const today = new Date();
  const currentYear = today.getFullYear();

  const pastMonths = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    pastMonths.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
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
      expenses.push({ id: `exp-${i}-${expCounter++}`, description: name, amount: rand(40, 150), paid: Math.random() > 0.4, month: currentMonthString, monthKey: currentMonthKey });
    });
    pickUnique(EXPENSE_NAMES, rand(0, 2)).forEach((name) => {
      const pastMonth = pick(pastMonths);
const pastDate = new Date(today.getFullYear(), today.getMonth() - (pastMonths.indexOf(pastMonth) + 1), 1);
const pastMonthKey = pastDate.getFullYear() * 12 + pastDate.getMonth();
expenses.push({ id: `exp-${i}-${expCounter++}`, description: name, amount: rand(40, 150), paid: false, month: pastMonth, monthKey: pastMonthKey });
    });

    residents.push({ id: `R${i}`, name: `${surname} Family`, apartment: `Apt ${apt}`, notes: '', expenses });
  }
  return residents;
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

  // ─── LOCALIZATION ─────────────────────────────────────────────────────
  const [translations, setTranslations] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const t = useCallback((key, replacements = {}) => {
    if (!translations || !translations[key]) return key;
    let value = translations[key][currentLanguage] || translations[key]['en'] || key;
    
    if (Array.isArray(value)) return value;
    
    if (typeof value === 'string') {
      Object.keys(replacements).forEach(placeholder => {
        value = value.replace(`{${placeholder}}`, replacements[placeholder]);
      });
    }
    return value;
  }, [translations, currentLanguage]);

  const monthNames = translations ? t('months') : DEFAULT_MONTH_NAMES;

  const [currentMonthIdx, setCurrentMonthIdx] = useState(systemDate.getMonth());
  const [currentYear, setCurrentYear] = useState(systemDate.getFullYear());
  const currentMonthString = monthNames.length ? `${monthNames[currentMonthIdx]} ${currentYear}` : '';
  const currentMonthKey = currentYear * 12 + currentMonthIdx;

  const getInitialResidents = useCallback(() => {
    const residents = generateInitialResidents(D, monthNames, currentMonthString, currentMonthKey);
    // Add monthKey to any expenses that might be missing it
    return residents.map(res => ({
      ...res,
      expenses: res.expenses.map(exp => ({
        ...exp,
        monthKey: exp.monthKey || (() => {
          const [monthName, yearStr] = exp.month.split(' ');
          const year = parseInt(yearStr) || 0;
          const monthIdx = monthNames.indexOf(monthName);
          return monthIdx !== -1 ? year * 12 + monthIdx : currentYear * 12 + currentMonthIdx;
        })()
      }))
    }));
  }, [D, monthNames, currentMonthString, currentMonthKey, currentYear, currentMonthIdx]);

  const [residents, setResidents] = useState([]);
  const [buildingExpenses, setBuildingExpenses] = useState([]);

  useEffect(() => {
    if (translations && residents.length === 0) {
      setResidents(getInitialResidents());
    }
  }, [translations, getInitialResidents, residents.length]);

  const headerRef = useRef(null);

  useEffect(() => {
    if (LAYOUT && LAYOUT.appBackgroundHex) {
      document.body.style.backgroundColor = LAYOUT.appBackgroundHex;
    }
  }, []);

  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  const [isBuildingView, setIsBuildingView] = useState(false);
  const [buildingViewAnimState, setBuildingViewAnimState] = useState('idle');
  const [expandedResident, setExpandedResident] = useState(null);
  const [openPreviousDrawer, setOpenPreviousDrawer] = useState({});

  const handleToggleView = useCallback(() => {
    const duration = parseFloat(A.viewTransitionDuration) * 1000;
    window.scrollTo({ top: 0 });
    setExpandedResident(null);
    setOpenPreviousDrawer({});
    setBuildingViewAnimState('transitioning');
    setTimeout(() => { setBuildingViewAnimState('idle'); }, duration);
    setIsBuildingView(prev => !prev);
  }, [A.viewTransitionDuration]);

  const [currentSortBy, setCurrentSortBy] = useState('Tag');
  const [currencyIndex, setCurrencyIndex] = useState(0);

  const activeCurrencySymbol = useMemo(() => {
    return D.currencyOptions[currencyIndex]?.symbol ?? '€';
  }, [currencyIndex, D.currencyOptions]);

  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [calendarTargetField, setCalendarTargetField] = useState(null);

  const [tempYear, setTempYear] = useState(systemDate.getFullYear());
  const [tempMonthIdx, setTempMonthIdx] = useState(systemDate.getMonth());

  const cardRefs = useRef({});

  const [modal, setModal] = useState({
    type: null, residentId: null, expenseId: null, amount: '', description: '', paid: false
  });

  const [cardModalState, setCardModalState] = useState({
    type: null,
    residentId: null,
  });

  const [buildingModal, setBuildingModal] = useState({
    type: null, expenseId: null, amount: '', description: '', paid: false
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

  const isPastExpense = useCallback((monthKey) => {
    return monthKey < currentMonthKey;
  }, [currentMonthKey]);

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

  const scrollCardIntoViewAfterExpand = (residentId) => {
    const drawerDurationMs = parseFloat(A.drawerDuration) * 1000;
    
    // Custom smooth scroll function with full control
    const smoothScrollTo = (targetY, duration = 700, easing = 'easeInOutQuad') => {
      const startY = window.scrollY;
      const distance = targetY - startY;
      
      // If distance is very small, just snap (no animation needed)
      if (Math.abs(distance) < 10) {
        window.scrollTo(0, targetY);
        return;
      }
      
      const startTime = performance.now();
  
      const easingFunctions = {
        easeOutCubic: t => 1 - Math.pow(1 - t, 3),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
        easeOutQuint: t => 1 - Math.pow(1 - t, 5),
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      };
  
      const ease = easingFunctions[easing] || easingFunctions.easeInOutQuad;
  
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease(progress);
        window.scrollTo(0, startY + distance * easedProgress);
        if (progress < 1) requestAnimationFrame(animate);
      };
  
      requestAnimationFrame(animate);
    };
  
    setTimeout(() => {
      const cardEl = cardRefs.current[residentId];
      if (!cardEl) return;
      const headerHeight = headerRef.current?.offsetHeight ?? 90;
      const gapPx = parseInt(D.spacing.headerToListGap);
      const cardTopAbsolute = cardEl.getBoundingClientRect().top + window.scrollY;
      const idealOffset = headerHeight + gapPx;
      
      smoothScrollTo(cardTopAbsolute - idealOffset, 700, 'easeInOutQuad');
    }, drawerDurationMs);
  };

  const togglePreviousDrawer = (residentId) => {
    // If card is collapsed, expand everything
    if (expandedResident !== residentId) {
      setExpandedResident(residentId);
      setOpenPreviousDrawer(prev => ({ ...prev, [residentId]: true }));
      scrollCardIntoViewAfterExpand(residentId);
    } else {
      // Card is expanded, just toggle the past debts drawer
      setOpenPreviousDrawer(prev => ({ 
        ...prev, 
        [residentId]: !prev[residentId] 
      }));
    }
  };

  const handleResidentHeaderClick = (residentId) => {
    if (expandedResident === residentId) {
      // If already expanded, collapse everything
      setExpandedResident(null);
      setOpenPreviousDrawer({});
    } else {
      // Expand card AND automatically open past debts
      setExpandedResident(residentId);
      setOpenPreviousDrawer(prev => ({ ...prev, [residentId]: true }));
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
    const hasPast = resident.expenses.some(exp => isPastExpense(exp.monthKey) && !exp.paid);
    if (!hasPast) {
      setOpenPreviousDrawer(prev => ({ ...prev, [residentId]: false }));
    }
  };

  const handleConfirmModal = () => {
    if (!modal.residentId) return;
    const parsedAmount = parseFloat(modal.amount) || 0;
    const desc = modal.description.trim() || t('monthly_fee_default');

    setResidents(prev => {
      const updated = prev.map(res => {
        if (res.id !== modal.residentId) return res;
        let expenses = [...res.expenses];
        if (modal.type === 'add') {
          expenses.push({ id: 'exp-' + Date.now(), description: desc, amount: parsedAmount, paid: modal.paid, month: currentMonthString, monthKey: currentMonthKey });
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

  const openBuildingModal = (type, expenseId = null, amount = '', description = '', paid = false) => {
    setBuildingModal({ type, expenseId, amount, description, paid });
  };

  const closeBuildingModal = () => setBuildingModal(m => ({ ...m, type: null }));

  const handleConfirmBuildingModal = () => {
    const parsedAmount = parseFloat(buildingModal.amount) || 0;
    const desc = buildingModal.description.trim() || t('building_expense_default');
    if (buildingModal.type === 'add') {
      setBuildingExpenses(prev => [...prev, {
        id: 'bexp-' + Date.now(),
        description: desc,
        amount: parsedAmount,
        paid: buildingModal.paid,
        month: currentMonthString,
        monthKey: currentMonthKey,
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
    const formattedString = `${monthNames[tempMonthIdx].substring(0, 3)} ${tempYear}`;
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

  const currentTimelineIndex = useMemo(() => {
    const foundIdx = TIMELINE_YEARS.indexOf(tempYear);
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

  const isDeleteRangeActive = fromMonth !== '' && toMonth !== '';

  const handleDeleteSelectedRangeData = () => {
    if (!isDeleteRangeActive) return;

    const parseMonthString = (str) => {
      if (!str) return { year: 0, monthIdx: 0 };
      const [mStr, yStr] = str.split(' ');
      const year = parseInt(yStr) || 0;
      const shortNames = monthNames.map(n => n.substring(0, 3).toUpperCase());
      const monthIdx = shortNames.indexOf(mStr.toUpperCase());
      return { year, monthIdx };
    };

    const fromVal = parseMonthString(fromMonth);
    const toVal = parseMonthString(toMonth);

    setResidents(prev => {
      return prev.map(res => {
        const filteredExpenses = res.expenses.filter(exp => {
          const [expMonthName, expYearStr] = exp.month.split(' ');
          const expYear = parseInt(expYearStr) || 0;
          const expMonthIdx = monthNames.indexOf(expMonthName);
          const itemTime = expYear * 12 + expMonthIdx;
          const startTime = fromVal.year * 12 + fromVal.monthIdx;
          const endTime = toVal.year * 12 + toVal.monthIdx;
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
    setCardModalState({ type: 'addCard', residentId: null });
  };

  const handleOpenEditCard = (residentId, e) => {
    e.stopPropagation();
    setCardModalState({ type: 'editCard', residentId });
  };

  const closeCardModal = () => {
    setCardModalState({ type: null, residentId: null });
  };

  const createResident = ({ name, apartment, notes }) => ({
    id: 'R-' + Date.now(),
    name: name || t('new_resident_default'),
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
  };

  const handleConfirmEditCard = ({ name, apartment, notes }) => {
    setResidents(prev => prev.map(res =>
      res.id === cardModalState.residentId
        ? { ...res, name: name || res.name, apartment: apartment || res.apartment, notes }
        : res
    ));
    closeCardModal();
  };

  const handleDeleteCardRequest = () => {
    setCardModalState(prev => ({ ...prev, type: 'deleteCard' }));
  };

  const handleConfirmDeleteCard = () => {
    setResidents(prev => prev.filter(res => res.id !== cardModalState.residentId));
    if (expandedResident === cardModalState.residentId) {
      setExpandedResident(null);
      setOpenPreviousDrawer({});
    }
    closeCardModal();
  };

  const handleCancelDeleteCard = () => {
    setCardModalState(prev => ({ ...prev, type: 'editCard' }));
  };

  const editingResident = useMemo(() => {
    if (!cardModalState.residentId) return null;
    return residents.find(r => r.id === cardModalState.residentId) || null;
  }, [cardModalState.residentId, residents]);

  const cardModalContentAnim = MB.contentAnimation(A);

  useEffect(() => {
    fetch('./lang.json')
      .then(res => res.json())
      .then(data => setTranslations(data))
      .catch(err => console.error('Failed to load lang.json:', err));
  }, []);

  if (!translations) {
    return (
      <div style={{ fontFamily: D.fontFamily }} className={LAYOUT.appWrapper}>
        <div style={LAYOUT.appMaxWidthStyle} className={LAYOUT.appInnerContainer}>
          <div style={LAYOUT.loadingTextStyle}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: D.fontFamily }} className={LAYOUT.appWrapper}>
      <div style={LAYOUT.appMaxWidthStyle} className={LAYOUT.appInnerContainer}>

        <header ref={headerRef} style={HDR.stickyContainerStyle} className={HDR.stickyContainer}>
          <div className={HDR.topRow}>
            <div className={HDR.leftActionGroup}>
              <button className={HDR.touchTargetBtn} onClick={() => setIsMainMenuOpen(true)}>
                <SpriteIcon id="icon-hamburger" className={ICN.actionIconSize} />
              </button>
              <button className={HDR.touchTargetBtn} onClick={handleOpenAddCard}>
                <SpriteIcon id="icon-button-add-user" className={ICN.actionIconSize} />
              </button>
              <WalletFlipButton onToggle={handleToggleView} t={t} />
            </div>

            <div className={HDR.debtSection}>
              <span className={HDR.totalDebtLabel}>{t('total_debt')}</span>
              <span className={HDR.totalDebtAmount}>
                <CurrencySymbol activeSymbol={activeCurrencySymbol} className={HDR.currencySizeMod} />{formatAmount(totalAllDebts)}
              </span>
            </div>

            <div className={HDR.syncIconWrapper}>
              <button className={HDR.touchTargetBtn} onClick={() => {}}>
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

        {(() => {
          const isTransitioning = buildingViewAnimState === 'transitioning';
          const dur = A.viewTransitionDuration;
          const curve = A.viewTransitionCurve;
          const VT = D.viewTransition;

          const enterStyle = isBuildingView
            ? VT.enterFromRightStyle(dur, curve)
            : VT.enterFromLeftStyle(dur, curve);

          const exitStyle = VT.exitStyle(dur, curve);

          const cardsView = (
            <div className={CARD.cardListContainer}>
              {processedResidents.map((resident) => {
                const isExpanded = expandedResident === resident.id;
                const isDrawerOpen = isExpanded && (openPreviousDrawer[resident.id] || false);

                const currentMonthExpenses = resident.expenses.filter(exp => exp.monthKey === currentMonthKey);
                const pastUnpaidExpenses = resident.expenses.filter(exp => isPastExpense(exp.monthKey) && !exp.paid);

                const currentUnpaidTotal = currentMonthExpenses.filter(exp => !exp.paid).reduce((sum, exp) => sum + exp.amount, 0);
                const pastUnpaidTotal = pastUnpaidExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                const totalResidentDebt = currentUnpaidTotal + pastUnpaidTotal;

                const combinedCurrentExpenses = [...currentMonthExpenses].sort((a, b) => a.paid - b.paid);
                const hasPastUnpaidItems = pastUnpaidExpenses.length > 0;

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
                          <button className={CARD.avatarBtn} onClick={(e) => handleOpenEditCard(resident.id, e)}>
                            {totalResidentDebt > 0 ? (
                              <SpriteIcon id="icon-avatar-debt" className={CARD.avatarIcon} style={IC.avatarDebt} />
                            ) : (
                              <SpriteIcon id="icon-avatar-nodebt" className={CARD.avatarIconNoDebt} style={IC.avatarNoDebt} />
                            )}
                          </button>

                          <div className={CARD.cardHeaderRightArea} onClick={() => handleResidentHeaderClick(resident.id)}>
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
                                <span className={CARD.noDebtText}>{t('no_debt')}</span>
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
                              {t('debts_for_month', { month: currentMonthString })}
                            </span>
                            <button onClick={() => openModal('add', resident.id)} className={CARD.addExpenseBtn}>
                              {t('add_expense')}
                            </button>
                          </div>

                          <div className={CARD.itemContainer}>
                            {combinedCurrentExpenses.length === 0 ? (
                              <p className={CARD.noExpensesFallback}>{t('no_expenses_this_month')}</p>
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
                                      <span className={CARD.expenseDescription}>
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
                                  <span className={CARD.expenseDescription}>{pastExpense.description}</span>
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
                              {t('previous_months_total')}
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
              currentMonthKey={currentMonthKey}
              isPastExpense={isPastExpense}
              activeCurrencySymbol={activeCurrencySymbol}
              openBuildingModal={openBuildingModal}
              t={t}
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
                <span className={MNU.sectionLabelLeft}>{t('language')}</span>
                <div className={MNU.optionsRightGroup}>
                  <button onClick={() => setCurrentLanguage('en')} className={`${MNU.pillButton} ${currentLanguage === 'en' ? MNU.activeRingClass : ''}`}>EN</button>
                  <button onClick={() => setCurrentLanguage('gr')} className={`${MNU.pillButton} ${currentLanguage === 'gr' ? MNU.activeRingClass : ''}`}>GR</button>
                </div>
              </div>

              <div className={MNU.sectionRow}>
                <span className={MNU.sectionLabelLeft}>{t('sort_by')}</span>
                <div className={MNU.optionsRightGroup}>
                  <button onClick={() => setCurrentSortBy('Tag')} className={`${MNU.pillButton} ${currentSortBy === 'Tag' ? MNU.activeRingClass : ''}`}>{t('tag')}</button>
                  <button onClick={() => setCurrentSortBy('Debt')} className={`${MNU.pillButton} ${currentSortBy === 'Debt' ? MNU.activeRingClass : ''}`}>{t('debt')}</button>
                </div>
              </div>

              <div className={MNU.sectionRow}>
                <span className={MNU.sectionLabelLeft}>{t('symbol')}</span>
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
                    {fromMonth || t('from_month')}
                  </button>
                  <button onClick={() => handleOpenRangePicker('rangeTo')} className={MNU.dateRangeBtn}>
                    {toMonth || t('to_month')}
                  </button>
                </div>
                <button
                  onClick={handleDeleteSelectedRangeData}
                  disabled={!isDeleteRangeActive}
                  className={`${MNU.deleteBtn} ${isDeleteRangeActive ? MNU.deleteActiveRingClass : ''}`}
                >
                  <SpriteIcon id="icon-trash" className={MNU.deleteIconClass(isDeleteRangeActive)} />
                  <span className={MNU.deleteText(isDeleteRangeActive)}>{t('delete_data')}</span>
                </button>
              </div>

              <div className={MNU.footerRow}>
                <button className={MNU.actionBtn} onClick={() => {}}>
                  <SpriteIcon id="icon-download" className={MNU.actionBtnIconSize} /> {t('pdf')}
                </button>
                <button className={MNU.actionBtn} onClick={() => setIsMainMenuOpen(false)}>
                  {t('exit')}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL WRAPPER FOR EXPENSE AND CALENDAR MODALS */}
        <ModalWrapper isOpen={modal.type !== null} onClose={closeModal}>
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
                      height: `${TIMELINE_YEARS.length * 28}px`,
                      transition: A.rollerTransition,
                      top: '0px'
                    }}
                  >
                    {TIMELINE_YEARS.map(year => (
                      <div key={year} className={CAL.yearText}>{year}</div>
                    ))}
                  </div>
                </div>
                <div className={CAL.yearIconArea}>
                  <SpriteIcon id="icon-arrow-right" className={ICN.rollerArrowSize} />
                </div>
                <div className={CAL.leftTapZone} onClick={() => setTempYear(y => Math.max(TIMELINE_YEARS[0], y - 1))} />
                <div className={CAL.rightTapZone} onClick={() => setTempYear(y => Math.min(TIMELINE_YEARS[TIMELINE_YEARS.length - 1], y + 1))} />
              </div>

              <div className={CAL.gridContainer}>
                {monthNames.map((monthName, idx) => {
                  const isSelected = tempMonthIdx === idx;
                  let shortMonth;
                  try {
                    shortMonth = translations['months_short'][currentLanguage][idx];
                  } catch (e) {
                    shortMonth = monthName.substring(0, 3).toUpperCase();
                  }
                  return (
                    <button key={monthName} onClick={() => setTempMonthIdx(idx)} className={`${CAL.monthCircle} ${isSelected ? CAL.monthActiveRing : ''}`}>
                      {shortMonth}
                    </button>
                  );
                })}
              </div>

              <div className={CAL.footerRow}>
                <button className={CAL.actionBtn} onClick={handleConfirmCalendar}>{t('ok')}</button>
                <button className={CAL.actionBtn} onClick={closeModal}>{t('cancel')}</button>
              </div>
            </div>
          )}

          {(modal.type === 'add' || modal.type === 'edit' || modal.type === 'delete') && (
            <ExpenseModal
              modalState={modal}
              setModalState={setModal}
              onConfirm={handleConfirmModal}
              onClose={closeModal}
              onDelete={handleDeleteExpense}
              unpaidIconId="icon-button-unpaid"
              unpaidIconColors={IC.buttonUnpaid}
              t={t}
            />
          )}
        </ModalWrapper>

        {/* MODAL WRAPPER FOR CARD MODALS */}
        <ModalWrapper isOpen={!!cardModalState.type} onClose={closeCardModal}>
          <div className={CM.wrapper} onClick={(e) => e.stopPropagation()}>
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

        {/* MODAL WRAPPER FOR BUILDING EXPENSE MODALS */}
        <ModalWrapper isOpen={(buildingModal.type === 'add' || buildingModal.type === 'edit' || buildingModal.type === 'buildingDelete')} onClose={closeBuildingModal}>
          <ExpenseModal
            modalState={buildingModal}
            setModalState={setBuildingModal}
            onConfirm={handleConfirmBuildingModal}
            onClose={closeBuildingModal}
            onDelete={handleDeleteBuildingExpense}
            unpaidIconId="icon-building-expenseunpaid"
            unpaidIconColors={IC.buildingExpenseUnpaid}
            t={t}
          />
        </ModalWrapper>

      </div>
    </div>
  );
};