// =========================================================================
// MAIN APPLICATION CONTROLLER
// =========================================================================
// Manages residents, expenses, navigation state, and user interactions.
// All styling references use window.DESIGN tokens — no hardcoded hex values.
// =========================================================================

const { useState, useCallback, useMemo, useRef, useEffect } = React;

const systemDate = new Date();

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

// Easing functions for the custom smooth-scroll helper
const EASING = {
  easeOutCubic:    t => 1 - Math.pow(1 - t, 3),
  easeInOutQuad:   t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutQuint:    t => 1 - Math.pow(1 - t, 5),
  easeInOutCubic:  t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

// Formats a numeric amount — integer displayed without decimals, float trimmed
function formatAmount(amount) {
  const num = parseFloat(amount);
  if (num % 1 === 0) return num.toString();
  return num.toFixed(2).replace(/\.?0+$/, '');
}

// Smooth-scrolls the window to a target Y position with a chosen easing curve
function smoothScrollTo(targetY, duration = 700, easing = 'easeInOutQuad') {
  const startY    = window.scrollY;
  const distance  = targetY - startY;
  if (Math.abs(distance) < 10) { window.scrollTo(0, targetY); return; }

  const startTime = performance.now();
  const ease      = EASING[easing] || EASING.easeInOutQuad;

  const animate = (currentTime) => {
    const elapsed     = currentTime - startTime;
    const progress    = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * ease(progress));
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

// ─── SPRITE ICON COMPONENT ────────────────────────────────────────────────
function SpriteIcon({ id, className = '', style }) {
  return (
    <svg className={className} style={style} aria-hidden="true" focusable="false">
      <use href={`#${id}`} />
    </svg>
  );
}

// Checkmark (paid) or warning icon (unpaid)
function PaidStatusIcon({ paid }) {
  const ICN = window.DESIGN.icons;
  const IC  = window.DESIGN.iconColors;
  return paid
    ? <SpriteIcon id="icon-check"          className={ICN.statusIconSize} style={IC.check} />
    : <SpriteIcon id="icon-warning-filled" className={ICN.statusIconSize} style={IC.warningFilled} />;
}

// Renders the active currency symbol, or nothing if symbol is empty
function CurrencySymbol({ activeSymbol, className = '' }) {
  if (!activeSymbol) return null;
  return <span className={className}>{activeSymbol}</span>;
}

// Amount span with strikethrough applied when an expense is paid
function AmountSpan({ amount, isPaid }) {
  const D = window.DESIGN;
  return (
    <span className={isPaid ? D.labels.strikethroughPaid : ''}>
      {formatAmount(amount)}
    </span>
  );
}

// ─── DRAWER ───────────────────────────────────────────────────────────────
// Animated expandable container — auto-adjusts height via ResizeObserver
function Drawer({ isOpen, children }) {
  const [height, setHeight] = useState(0);
  const contentRef = useRef(null);
  const A          = window.DESIGN.animation;
  const drawerCfg  = window.DESIGN.drawer;

  useEffect(() => {
    if (!contentRef.current) return;
    const el     = contentRef.current;
    const update = () => setHeight(isOpen ? el.scrollHeight : 0);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen, children]);

  return (
    <div style={{ height: height + 'px', transition: `height ${A.drawerDuration} ${A.drawerCurve}`, ...drawerCfg.containerStyle }}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

// ─── AUTO-TEXTAREA ────────────────────────────────────────────────────────
// Expands vertically up to a max line count as the user types
function AutoTextarea({ value, onChange, placeholder, className, style }) {
  const ref       = useRef(null);
  const A         = window.DESIGN.animation;
  const textareaCfg = window.DESIGN.autoTextarea;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 21;
    const maxHeight  = lineHeight * textareaCfg.maxLines + 28;
    el.style.height    = Math.min(el.scrollHeight, maxHeight) + 'px';
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      style={{ ...style, transition: `height ${A.autoTextareaDuration} ${A.autoTextareaCurve}`, minHeight: textareaCfg.minHeight }}
      rows={1}
    />
  );
}

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────
// Wraps any modal with a consistent backdrop, animation, and click-to-close
function ModalWrapper({ isOpen, onClose, children }) {
  const MB = window.DESIGN.modalBase;
  const A  = window.DESIGN.animation;
  if (!isOpen) return null;
  return (
    <div
      style={{ ...MB.backdropAnimation(A), ...MB.backdropOverlayStyle }}
      className={MB.backdropOverlay}
      onClick={onClose}
    >
      {children}
    </div>
  );
}

// ─── CARD PROFILE MODAL (ADD / EDIT RESIDENT) ────────────────────────────
function CardProfileModal({ mode, residentData, onConfirm, onNext, onCancel, onDeleteRequest, animStyle, t }) {
  const CM = window.DESIGN.cardModal;
  const MB = window.DESIGN.modalBase;

  const [name,      setName]      = useState(residentData?.name      || '');
  const [apartment, setApartment] = useState(residentData?.apartment || '');
  const [notes,     setNotes]     = useState(residentData?.notes     || '');

  const collect = () => ({ name: name.trim(), apartment: apartment.trim(), notes: notes.trim() });

  const handleConfirm = () => onConfirm(collect());
  const handleNext    = () => { onNext(collect()); setName(''); setApartment(''); setNotes(''); };

  const isAdd = mode === 'add';

  return (
    <div
      style={{ ...MB.boxContainerStyle, ...animStyle, padding: CM.containerPadding, maxWidth: '376px' }}
      className={MB.boxContainer}
    >
      <div className={CM.headerRow} style={{ marginBottom: CM.containerGap }}>
        <SpriteIcon id={isAdd ? 'icon-button-add-user' : 'icon-edit'} className={CM.headerIcon} />
        <span className={CM.headerLabel}>{isAdd ? t('add_card') : t('edit_card')}</span>
      </div>

      <div className={CM.fieldsContainer} style={{ gap: CM.fieldGap }}>
        <div className={CM.fieldWrapper}>
          <input
            type="text"
            placeholder={t('name_title')}
            value={name}
            onChange={e => setName(e.target.value)}
            className={`${CM.fieldInput} ${CM.nameFieldInput} ${CM.placeholderStyle}`}
            style={{ height: CM.fieldHeight, padding: CM.fieldPadding }}
          />
        </div>
        <div className={CM.fieldWrapper}>
          <input
            type="text"
            placeholder={t('apartment_tag')}
            value={apartment}
            onChange={e => setApartment(e.target.value)}
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
              onChange={e => setNotes(e.target.value)}
              className={`${CM.notesField} ${CM.placeholderStyle}`}
              style={{ padding: CM.notesFieldPadding, minHeight: CM.notesFieldMinHeight }}
            />
          </div>
        </div>
      </div>

      <div className={CM.buttonRow} style={{ marginTop: CM.containerGap, gap: CM.buttonGap }}>
        {isAdd ? (
          <>
            <button className={`${CM.baseBtn} ${CM.okBtn}`}         onClick={handleConfirm}>{t('ok')}</button>
            <button className={`${CM.baseBtn} ${CM.nextBtn}`}        onClick={handleNext}>{t('next')}</button>
            <button className={`${CM.baseBtn} ${CM.cancelTextBtn}`}  onClick={onCancel}>{t('cancel')}</button>
          </>
        ) : (
          <>
            <button className={`${CM.baseBtn} ${CM.okBtn}`}         onClick={handleConfirm}>{t('ok')}</button>
            <button className={`${CM.baseBtn} ${CM.cancelTextBtn}`}  onClick={onCancel}>{t('cancel')}</button>
            <button className={CM.trashBtn}                          onClick={onDeleteRequest}>
              <SpriteIcon id="icon-trash" className={CM.trashIconSize} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Confirmation dialog shown before permanently deleting a resident card
function DeleteCardConfirmModal({ onConfirm, onCancel, animStyle, t }) {
  const CM = window.DESIGN.cardModal;
  const MB = window.DESIGN.modalBase;
  return (
    <div style={{ ...CM.deleteConfirmBoxStyle, ...animStyle }} className={MB.boxContainer}>
      <p className={CM.deleteConfirmTitle}>{t('delete_card_confirm')}</p>
      <div className={CM.deleteConfirmRow}>
        <button className={CM.deleteConfirmYesBtn} onClick={onConfirm}>{t('yes')}</button>
        <button className={CM.deleteConfirmNoBtn}  onClick={onCancel}>{t('no')}</button>
      </div>
    </div>
  );
}

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

// ─── UNIFIED EXPENSE MODAL ────────────────────────────────────────────────
// Handles add / edit / delete for both resident and building expenses.
// Works on an internal copy of the data; changes are only committed on OK.
function ExpenseModal({ initialData, context, onConfirm, onClose, onDelete, t }) {
  const D      = window.DESIGN;
  const EM     = D.modal.expenseModal;
  const MB     = D.modalBase;
  const A      = D.animation;
  const config = D.expenseModalConfigs[context] || D.expenseModalConfigs.resident;

  // Local copies — nothing is written to parent state until onConfirm
  const [amount,      setAmount]      = useState(initialData.amount      || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [isPaid,      setIsPaid]      = useState(initialData.paid        ?? false);
  const [mode,        setMode]        = useState(initialData.type); // 'add' | 'edit' | 'delete' | 'buildingDelete'

  const isAdd    = mode === 'add';
  const isEdit   = mode === 'edit';
  const isDelete = mode === 'delete' || mode === 'buildingDelete';

  const ringClass = isPaid ? EM.statusPillRingPaid : EM.statusPillRingUnpaid;

  const handleConfirm = () => onConfirm({ amount, description, paid: isPaid });
  const handleEnter   = (e) => { if (e.key === 'Enter') handleConfirm(); };

  if (!isAdd && !isEdit && !isDelete) return null;

  return (
    <>
      {(isAdd || isEdit) && (
        <div
          style={{ ...MB.boxContainerStyle, ...MB.contentAnimation(A), padding: EM.containerPadding, maxWidth: EM.containerMaxWidth }}
          className={MB.boxContainer}
          onClick={e => e.stopPropagation()}
        >
          <div className={EM.headerRow}>
            <SpriteIcon id="icon-edit" className={EM.headerIcon} />
            <span className={EM.headerTitle}>{t(isAdd ? 'add_amount' : 'edit_amount')}</span>
          </div>

          <div className={EM.amountWrapper}>
            <input
              type="number"
              placeholder={t('amount_placeholder')}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={handleEnter}
              className={EM.amountInput}
              autoFocus
            />
          </div>

          <div style={{ height: D.modal.amountToDescriptionGap }} />

          <div className={EM.descriptionWrapper}>
            <input
              type="text"
              placeholder={t('expense_placeholder')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={handleEnter}
              className={EM.descriptionInput}
            />
          </div>

          <div style={{ height: D.modal.descriptionToActionsGap }} />

          <button onClick={() => setIsPaid(p => !p)} className={`${EM.statusPill} ${ringClass}`}>
            <span className={EM.statusPillText}>{isPaid ? t('paid') : t('unpaid')}</span>
          </button>

          <div style={{ height: D.modal.descriptionToActionsGap }} />

          <div className={EM.actionRow}>
            <button onClick={handleConfirm} className={`${EM.actionBtn} ${EM.okBtn}`}>{t('ok')}</button>
            <button onClick={onClose}       className={`${EM.actionBtn} ${EM.cancelBtn}`}>{t('cancel')}</button>
            {isEdit && (
              <button onClick={() => setMode(config.deleteModeType)} className={EM.deleteBtn}>
                <SpriteIcon id="icon-trash" className={EM.deleteIcon} />
              </button>
            )}
          </div>
        </div>
      )}

      {isDelete && (
        <div
          style={{ ...MB.boxContainerStyle, ...MB.contentAnimation(A) }}
          className={MB.boxContainer}
          onClick={e => e.stopPropagation()}
        >
          <h4 className={D.modal.deletePromptTitle}>{t('delete_expense_confirm')}</h4>
          <div className={D.modal.actionsFlexRow}>
            <button onClick={onDelete}               style={D.modal.deleteYesBtnStyle} className={D.modal.deleteYesBtn}>{t('yes')}</button>
            <button onClick={() => setMode('edit')}  className={D.modal.deleteNoBtn}>{t('no')}</button>
          </div>
        </div>
      )}
    </>
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
window.App = function App() {
  const D      = window.DESIGN;
  const LAYOUT = D.layout;
  const HDR    = D.header;
  const MP     = D.monthPill;
  const MDL    = D.modal;
  const MB     = D.modalBase;
  const CAL    = D.modal.calendar;
  const MNU    = D.mainMenu;
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
    fetch('./lang.json')
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

  // Populate demo data once translations are ready
  useEffect(() => {
    if (translations && residents.length === 0) {
      setResidents(generateInitialResidents(monthNames, currentMonthString, currentMonthKey));
    }
  }, [translations]);

  // ─── VIEW STATE ────────────────────────────────────────────────────────
  const [isMainMenuOpen,       setIsMainMenuOpen]       = useState(false);
  const [isBuildingView,       setIsBuildingView]       = useState(false);
  const [buildingViewAnimState, setBuildingViewAnimState] = useState('idle');
  const [expandedResident,     setExpandedResident]     = useState(null);
  const [openPreviousDrawer,   setOpenPreviousDrawer]   = useState({});
  const [currentSortBy,        setCurrentSortBy]        = useState('Tag');
  const [currencyIndex,        setCurrencyIndex]        = useState(0);
  const [fromMonth,            setFromMonth]            = useState('');
  const [toMonth,              setToMonth]              = useState('');

  const headerRef = useRef(null);
  const cardRefs  = useRef({});

  const handleToggleView = useCallback(() => {
    const duration = parseFloat(A.viewTransitionDuration) * 1000;
    window.scrollTo({ top: 0 });
    setExpandedResident(null);
    setOpenPreviousDrawer({});
    setBuildingViewAnimState('transitioning');
    setTimeout(() => setBuildingViewAnimState('idle'), duration);
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
  const scrollCardIntoView = (residentId) => {
    const drawerDurationMs = parseFloat(A.drawerDuration) * 1000;
    setTimeout(() => {
      const cardEl      = cardRefs.current[residentId];
      if (!cardEl) return;
      const headerHeight  = headerRef.current?.offsetHeight ?? 90;
      const gapPx         = parseInt(D.spacing.headerToListGap);
      const cardTopAbs    = cardEl.getBoundingClientRect().top + window.scrollY;
      smoothScrollTo(cardTopAbs - headerHeight - gapPx, 700, 'easeInOutQuad');
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

  const openCalendarModal = (target) => {
    setCalendarTargetField(target);
    setTempYear(target === 'appCurrent' ? currentYear : systemDate.getFullYear());
    setTempMonthIdx(target === 'appCurrent' ? currentMonthIdx : systemDate.getMonth());
    setExpenseModal({ type: 'calendar', context: null, residentId: null, expenseId: null, amount: '', description: '', paid: false });
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

  // ─── CALENDAR STATE & HANDLER ──────────────────────────────────────────
  const [calendarTargetField, setCalendarTargetField] = useState(null);
  const [tempYear,            setTempYear]            = useState(systemDate.getFullYear());
  const [tempMonthIdx,        setTempMonthIdx]        = useState(systemDate.getMonth());

  const currentTimelineIndex = useMemo(() => {
    const idx = TIMELINE_YEARS.indexOf(tempYear);
    return idx !== -1 ? idx : 0;
  }, [tempYear]);

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
    closeExpenseModal();
  };

  // ─── DATE RANGE DELETION ───────────────────────────────────────────────
  const isDeleteRangeActive = fromMonth !== '' && toMonth !== '';

  const handleDeleteSelectedRangeData = () => {
    if (!isDeleteRangeActive) return;

    const parseRangeString = (str) => {
      if (!str) return 0;
      const [mStr, yStr] = str.split(' ');
      const year      = parseInt(yStr) || 0;
      const shortNames = monthNames.map(n => n.substring(0, 3).toUpperCase());
      const monthIdx  = shortNames.indexOf(mStr.toUpperCase());
      return year * 12 + monthIdx;
    };

    const startKey = parseRangeString(fromMonth);
    const endKey   = parseRangeString(toMonth);

    setResidents(prev =>
      prev.map(res => ({
        ...res,
        expenses: res.expenses.filter(exp => exp.monthKey < startKey || exp.monthKey > endKey),
      }))
    );
    setBuildingExpenses(prev =>
      prev.filter(exp => exp.monthKey < startKey || exp.monthKey > endKey)
    );

    setFromMonth('');
    setToMonth('');
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
              <button className={HDR.touchTargetBtn} onClick={() => {}}>
                <SpriteIcon id="icon-synced" className={ICN.syncIconSize} style={IC.synced} />
              </button>
            </div>
          </div>

          <div className={HDR.bottomRow}>
  <button
    className={HDR.monthTextBtn}
    style={{ color: isFilteredAwayFromToday ? HDR.monthTextBtnOtherColor : HDR.monthTextBtnCurrentColor }}
    onClick={() => openCalendarModal('appCurrent')}
  >
    {currentMonthString}
  </button>

  {/* Unified Month Navigation Pill - aligned right */}
  <div className={MP.container} style={{...MP.containerStyle, marginLeft: 'auto'}}>
    <button
      onClick={handlePrevMonth}
      className={MP.btn}
      style={MP.btnStyle}
      aria-label="Previous month"
    >
      <SpriteIcon id="icon-arrow-left" className={MP.icon} style={MP.iconStyle} />
    </button>
    
    <button
      onClick={isFilteredAwayFromToday ? handleGoToCurrentMonth : undefined}
      className={isFilteredAwayFromToday ? MP.btn : MP.btnDisabled}
      style={isFilteredAwayFromToday ? MP.btnStyle : MP.btnDisabledStyle}
      aria-label="Go to current month"
      disabled={!isFilteredAwayFromToday}
    >
      <SpriteIcon 
        id="icon-go-today" 
        className={MP.icon} 
        style={isFilteredAwayFromToday ? MP.iconStyle : MP.iconDisabledStyle} 
      />
    </button>
    
    <button
      onClick={handleNextMonth}
      className={MP.btn}
      style={MP.btnStyle}
      aria-label="Next month"
    >
      <SpriteIcon id="icon-arrow-right" className={MP.icon} style={MP.iconStyle} />
    </button>
  </div>
</div>
        </header>

        <div style={{ height: SPC.headerToListGap }} />

        {contentArea}

        {/* ─── MAIN MENU (now uses ModalWrapper for consistent behavior) ── */}
        <ModalWrapper isOpen={isMainMenuOpen} onClose={() => setIsMainMenuOpen(false)}>
          <div
            style={{ ...MNU.boxContainerStyle, ...MNU.contentAnimation(A) }}
            className={MNU.boxContainer}
            onClick={e => e.stopPropagation()}
          >
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
                <button onClick={() => setCurrentSortBy('Tag')}  className={`${MNU.pillButton} ${currentSortBy === 'Tag'  ? MNU.activeRingClass : ''}`}>{t('tag')}</button>
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
                      style={{ transform: `translateY(-${currencyIndex * 28}px)`, height: `${D.currencyOptions.length * 28}px`, transition: A.rollerTransition, top: '0px' }}
                    >
                      {D.currencyOptions.map(option => (
                        <div key={option.label} className={MNU.symbolText}>{option.label}</div>
                      ))}
                    </div>
                  </div>
                  <div className={MNU.symbolIconArea}>
                    <SpriteIcon id="icon-arrow-right" className={ICN.rollerArrowSize} />
                  </div>
                  <div className={MNU.symbolLeftTapZone}  onClick={() => cycleCurrency(-1)} />
                  <div className={MNU.symbolRightTapZone} onClick={() => cycleCurrency(1)}  />
                </div>
              </div>
            </div>

            <div className={MNU.dateRangeSection}>
              <div className={MNU.dateRangeButtonsRow}>
                <button onClick={() => openCalendarModal('rangeFrom')} className={MNU.dateRangeBtn}>{fromMonth || t('from_month')}</button>
                <button onClick={() => openCalendarModal('rangeTo')}   className={MNU.dateRangeBtn}>{toMonth   || t('to_month')}</button>
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
        </ModalWrapper>

        {/* ─── EXPENSE MODAL ─────────────────────────────────────────── */}
        <ModalWrapper
          isOpen={expenseModal.type !== null && expenseModal.type !== 'calendar'}
          onClose={closeExpenseModal}
        >
          <ExpenseModal
            initialData={{ type: expenseModal.type, amount: expenseModal.amount, description: expenseModal.description, paid: expenseModal.paid }}
            context={expenseModal.context}
            onConfirm={expenseModal.context === 'resident' ? handleConfirmResidentExpense : handleConfirmBuildingExpense}
            onClose={closeExpenseModal}
            onDelete={expenseModal.context === 'resident' ? handleDeleteResidentExpense : handleDeleteBuildingExpense}
            t={t}
          />
        </ModalWrapper>

        {/* ─── CALENDAR MODAL ────────────────────────────────────────── */}
        <ModalWrapper isOpen={expenseModal.type === 'calendar'} onClose={closeExpenseModal}>
          <div style={{ ...MB.boxContainerStyle, ...MB.contentAnimation(A) }} className={MB.boxContainer} onClick={e => e.stopPropagation()}>
            <div className={CAL.yearPill}>
              <div className={CAL.yearIconArea}><SpriteIcon id="icon-arrow-left"  className={ICN.rollerArrowSize} /></div>
              <div className={CAL.yearRollWrapper}>
                <div
                  className={CAL.yearRollContainer}
                  style={{ transform: `translateY(-${currentTimelineIndex * 28}px)`, height: `${TIMELINE_YEARS.length * 28}px`, transition: A.rollerTransition, top: '0px' }}
                >
                  {TIMELINE_YEARS.map(year => <div key={year} className={CAL.yearText}>{year}</div>)}
                </div>
              </div>
              <div className={CAL.yearIconArea}><SpriteIcon id="icon-arrow-right" className={ICN.rollerArrowSize} /></div>
              <div className={CAL.leftTapZone}  onClick={() => setTempYear(y => Math.max(TIMELINE_YEARS[0], y - 1))} />
              <div className={CAL.rightTapZone} onClick={() => setTempYear(y => Math.min(TIMELINE_YEARS[TIMELINE_YEARS.length - 1], y + 1))} />
            </div>

            <div className={CAL.gridContainer}>
              {monthNames.map((monthName, idx) => {
                let shortMonth;
                try { shortMonth = translations['months_short'][currentLanguage][idx]; }
                catch (e) { shortMonth = monthName.substring(0, 3).toUpperCase(); }
                return (
                  <button
                    key={monthName}
                    onClick={() => setTempMonthIdx(idx)}
                    className={`${CAL.monthCircle} ${tempMonthIdx === idx ? CAL.monthActiveRing : ''}`}
                  >
                    {shortMonth}
                  </button>
                );
              })}
            </div>

            <div className={CAL.footerRow}>
              <button className={CAL.actionBtn} onClick={handleConfirmCalendar}>{t('ok')}</button>
              <button className={CAL.actionBtn} onClick={closeExpenseModal}>{t('cancel')}</button>
            </div>
          </div>
        </ModalWrapper>

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
};