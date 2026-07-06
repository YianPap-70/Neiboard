// =========================================================================
// MODALS — every modal / overlay in the app
// =========================================================================
// CardProfileModal, DeleteCardConfirmModal, ExpenseModal,
// MonthYearPickerModal, DeleteRangeModal, SettingsModal.
// This is the file you'll touch most often for settings/modal behavior or
// layout changes. Reads styling from window.DESIGN tokens.
// =========================================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getSystemDate, TIMELINE_YEARS } from './utils.js';
import { SpriteIcon, NavigationPill, AutoTextarea, ModalWrapper, RollerValue } from './primitives.jsx';

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

  // Tracks whether the amount the user typed is invalid (empty, not a
  // number, or zero/negative). When true, the amount field gets a red ring
  // and a brief shake animation to draw attention to the problem.
  const [amountError, setAmountError] = useState(false);
  const amountWrapperRef = useRef(null);

  const isAdd    = mode === 'add';
  const isEdit   = mode === 'edit';
  const isDelete = mode === 'delete' || mode === 'buildingDelete';

  const ringClass = isPaid ? EM.statusPillRingPaid : EM.statusPillRingUnpaid;

  const handleConfirm = () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      // Trigger shake animation: remove then re-add the animation style so it
      // re-fires even if the user clicks OK multiple times without changing input.
      const el = amountWrapperRef.current;
      if (el) {
        el.style.animation = 'none';
        // Force reflow to restart the animation
        void el.offsetWidth;
        el.style.animation = A.inputShake;
      }
      setAmountError(true);
      return;
    }
    setAmountError(false);
    onConfirm({ amount, description, paid: isPaid });
  };

  const handleEnter = (e) => { if (e.key === 'Enter') handleConfirm(); };

  // Clear error state as soon as the user starts correcting the amount
  const handleAmountChange = (e) => {
    setAmount(e.target.value);
    if (amountError) setAmountError(false);
  };

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

          {/* Wraps the amount input so we can trigger its shake animation
              directly (see handleConfirm above) and swap in the red error
              ring style when the entered amount is invalid. */}
          <div
            ref={amountWrapperRef}
            className={EM.amountWrapper}
            style={amountError ? EM.amountWrapperErrorStyle : undefined}
          >
            <input
              type="number"
              placeholder={t('amount_placeholder')}
              value={amount}
              onChange={handleAmountChange}
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


// ─── REUSABLE MONTH/YEAR PICKER OVERLAY ───────────────────────────────────
// Independent utility modal for selecting a target month + year. It never
// touches the dashboard's global navigation state — the caller decides what
// to do with the selected (monthIdx, year) via onConfirm. Visually identical
// to the legacy inline calendar (year roller + 3x4 month grid).
function MonthYearPickerModal({ isOpen, initialMonthIdx, initialYear, onConfirm, onClose, t }) {
  const D   = window.DESIGN;
  const MB  = D.modalBase;
  const CAL = D.modal.calendar;
  const A   = D.animation;

  const monthNames      = t('months');
  const monthShortNames = t('months_short');

  const [tempYear,     setTempYear]     = useState(initialYear);
  const [tempMonthIdx, setTempMonthIdx] = useState(initialMonthIdx);

  // Reset the local selection whenever the overlay is (re)opened, so it
  // always starts from whatever the caller passed in as the initial value.
  useEffect(() => {
    if (isOpen) {
      setTempYear(initialYear);
      setTempMonthIdx(initialMonthIdx);
    }
  }, [isOpen, initialYear, initialMonthIdx]);

  const currentTimelineIndex = useMemo(() => {
    const idx = TIMELINE_YEARS.indexOf(tempYear);
    return idx !== -1 ? idx : 0;
  }, [tempYear]);

  const handleConfirm = () => onConfirm(tempMonthIdx, tempYear);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div
        style={{
          ...MB.boxContainerStyle,
          ...MB.contentAnimation(A),
          maxWidth: CAL.containerMaxWidth,
          padding: CAL.containerPadding,
        }}
        className={MB.boxContainer}
        onClick={e => e.stopPropagation()}
      >
        {/* Year Row - Year roller LEFT, Nav Pill RIGHT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '44px' }}>
          <div style={{
            height: '44px', overflow: 'hidden', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            flex: 1, minWidth: 0,
          }}>
            <div
              style={{
                position: 'absolute', display: 'flex', flexDirection: 'column',
                alignItems: 'center',
                transform: `translateY(-${currentTimelineIndex * 44}px)`,
                height: `${TIMELINE_YEARS.length * 44}px`,
                transition: A.rollerTransition,
                top: '0px', left: 0,
              }}
            >
              {TIMELINE_YEARS.map(year => (
                <div
                  key={year}
                  style={{
                    fontSize: CAL.yearFontSize, fontWeight: CAL.yearFontWeight,
                    color: CAL.yearColor, height: '44px', lineHeight: '44px',
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                    paddingLeft: '4px',
                  }}
                >
                  {year}
                </div>
              ))}
            </div>
          </div>

          <NavigationPill
            type="year"
            currentValue={tempYear}
            totalOptions={TIMELINE_YEARS.length}
            onPrev={() => setTempYear(y => Math.max(TIMELINE_YEARS[0], y - 1))}
            onNext={() => setTempYear(y => Math.min(TIMELINE_YEARS[TIMELINE_YEARS.length - 1], y + 1))}
            onGoToday={() => setTempYear(getSystemDate().getFullYear())}
            canGoToday={tempYear !== getSystemDate().getFullYear()}
            variant="transparent"
          />
        </div>

        <div style={{ height: '20px' }} />

        {/* Month Grid - 3 rows × 4 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: CAL.monthGridGap }}>
          {monthNames.map((monthName, idx) => {
            const shortMonth = (monthShortNames && monthShortNames[idx]) || monthName.substring(0, 3).toUpperCase();
            return (
              <button
                key={monthName}
                onClick={() => setTempMonthIdx(idx)}
                style={{
                  height: CAL.monthButtonHeight, borderRadius: CAL.monthButtonRadius,
                  backgroundColor: CAL.monthButtonBg,
                  border: tempMonthIdx === idx ? CAL.monthButtonActiveRing : 'none',
                  color: CAL.monthButtonColor, fontSize: CAL.monthButtonFontSize,
                  fontWeight: CAL.monthButtonFontWeight, letterSpacing: CAL.monthButtonLetterSpacing,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s', outline: 'none', cursor: 'pointer',
                  padding: '0 4px', minWidth: 0, width: '100%',
                }}
                aria-label={monthName}
                aria-pressed={tempMonthIdx === idx}
              >
                {shortMonth}
              </button>
            );
          })}
        </div>

        <div style={{ height: '20px' }} />

        {/* Footer Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: CAL.footerGap }}>
          <button
            onClick={handleConfirm}
            style={{
              flex: '1', height: CAL.footerButtonHeight, borderRadius: CAL.footerButtonRadius,
              backgroundColor: CAL.footerButtonBg, border: CAL.footerOKRing,
              color: CAL.footerButtonColor, fontSize: CAL.footerButtonFontSize,
              fontWeight: CAL.footerButtonFontWeight, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.2s', outline: 'none', cursor: 'pointer',
            }}
            className="active:scale-95"
          >
            {t('ok')}
          </button>

          <button
            onClick={onClose}
            style={{
              flex: '1', height: CAL.footerButtonHeight, borderRadius: CAL.footerButtonRadius,
              backgroundColor: CAL.footerButtonBg, border: 'none',
              color: CAL.footerButtonColor, fontSize: CAL.footerButtonFontSize,
              fontWeight: CAL.footerButtonFontWeight, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.2s', outline: 'none', cursor: 'pointer',
            }}
            className="active:scale-95"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}


// ─── DELETE DATA RANGE SUB-MODAL ──────────────────────────────────────────
function DeleteRangeModal({
  t, monthNames,
  fromDate, setFromDate, toDate, setToDate,
  pickerTarget, setPickerTarget,
  onBack, onConfirmDelete,
}) {
  const D  = window.DESIGN;
  const DM = D.deleteRangeModal;
  const MB = D.modalBase;
  const A  = D.animation;

  const monthShortNames = t('months_short');

  const formatBoundary = (date) => {
    if (!date) return null;
    const short = (monthShortNames && monthShortNames[date.monthIdx]) || monthNames[date.monthIdx].substring(0, 3).toUpperCase();
    return `${short} ${date.year}`;
  };

  const isRangeSet = !!fromDate && !!toDate;

  const handleReset = () => { setFromDate(null); setToDate(null); };

  const handlePickerConfirm = (monthIdx, year) => {
    if (pickerTarget === 'from') setFromDate({ monthIdx, year });
    else if (pickerTarget === 'to') setToDate({ monthIdx, year });
    setPickerTarget(null);
  };

  const activePickerDate = pickerTarget === 'from' ? fromDate : pickerTarget === 'to' ? toDate : null;

  return (
    <>
      <div
        style={{ ...DM.boxContainerStyle, ...MB.contentAnimation(A) }}
        className={DM.boxContainer}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col" style={{ gap: DM.rowGap }}>
          <button
            className={`${DM.boundaryBtn} ${fromDate ? DM.boundaryBtnSetRing : ''}`}
            onClick={() => setPickerTarget('from')}
          >
            {formatBoundary(fromDate) || t('from')}
          </button>

          <button
            className={`${DM.boundaryBtn} ${toDate ? DM.boundaryBtnSetRing : ''}`}
            onClick={() => setPickerTarget('to')}
          >
            {formatBoundary(toDate) || t('to')}
          </button>

          <button className={DM.resetBtn} onClick={handleReset}>
            <SpriteIcon id="reset-icn" className={DM.resetIcon} />
            <span>{t('reset')}</span>
          </button>

          <button
            className={`${DM.deleteBtnBase} ${isRangeSet ? DM.deleteBtnEnabled : DM.deleteBtnDisabled}`}
            disabled={!isRangeSet}
            onClick={() => isRangeSet && onConfirmDelete(fromDate, toDate)}
          >
            <SpriteIcon id="icon-trash" className={DM.deleteIcon} />
            <span>{t('delete_data')}</span>
          </button>

          <button className={DM.exitBtn} onClick={onBack}>
            {t('exit')}
          </button>
        </div>
      </div>

      <MonthYearPickerModal
        isOpen={pickerTarget !== null}
        initialMonthIdx={activePickerDate?.monthIdx ?? getSystemDate().getMonth()}
        initialYear={activePickerDate?.year ?? getSystemDate().getFullYear()}
        onConfirm={handlePickerConfirm}
        onClose={() => setPickerTarget(null)}
        t={t}
      />
    </>
  );
}

// ─── MAIN SETTINGS MODAL ───────────────────────────────────────────────────
function SettingsModal({
  t, monthNames,
  currentLanguage, onToggleLanguage,
  currentSortBy, onToggleSort,
  currencyIndex, onCycleCurrency, currencyOptions,
  themeIndex, onCycleTheme,
  onExport, onImportFile,
  onConfirmDeleteRange,
  onExitAll,
  onReport,
}) {
  const D  = window.DESIGN;
  const SM = D.settingsModal;
  const A  = D.animation;

  const [view, setView] = useState('main'); // 'main' | 'delete'
  const [fromDate, setFromDate] = useState(null);
  const [toDate,   setToDate]   = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null);

  const fileInputRef = useRef(null);

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onImportFile(file);
    e.target.value = '';
  };

  // Opens the printable / "Save as PDF" report overlay (report.jsx).
  const handleReportClick = () => onReport?.();

  const handleConfirmDeleteAndReturn = (from, to) => {
    onConfirmDeleteRange(from, to);
    setFromDate(null);
    setToDate(null);
    setView('main');
  };

  if (view === 'delete') {
    return (
      <DeleteRangeModal
        t={t}
        monthNames={monthNames}
        fromDate={fromDate} setFromDate={setFromDate}
        toDate={toDate} setToDate={setToDate}
        pickerTarget={pickerTarget} setPickerTarget={setPickerTarget}
        onBack={() => setView('main')}
        onConfirmDelete={handleConfirmDeleteAndReturn}
      />
    );
  }

  const rowPadStyle = { paddingLeft: SM.pillPaddingX, paddingRight: SM.pillPaddingX };

  return (
    <div
      style={{ ...SM.boxContainerStyle, ...SM.contentAnimation(A) }}
      className={SM.boxContainer}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col" style={{ gap: SM.rowGap }}>

        {/* Row 1 — Header: logo + report button */}
        <div className={SM.headerRow} style={{ gap: SM.headerRowGap }}>
          <SpriteIcon id="neiboard-logo" className={SM.logoIcon} style={SM.logoIconStyle} />
          <button className={SM.reportBtn} onClick={handleReportClick}>
            <SpriteIcon id="report-icn" className={SM.reportIcon} />
            <span>{t('report')}</span>
          </button>
        </div>

        {/* Row 2 — Language toggle */}
        <button className={SM.pillRow} style={rowPadStyle} onClick={onToggleLanguage}>
          <span className={SM.pillLabel}>{t('language')}:</span>
          <div style={{ width: '8px' }} />
          <RollerValue items={['English', 'Greek']} activeIndex={currentLanguage === 'en' ? 0 : 1} />
          <div style={{ flex: 1 }} />
          <SpriteIcon id="nextItem-icn" className={SM.pillIcon} />
        </button>

        {/* Row 3 — Sort order toggle */}
        <button className={SM.pillRow} style={rowPadStyle} onClick={onToggleSort}>
          <span className={SM.pillLabel}>{t('sort_order')}:</span>
          <div style={{ width: '8px' }} />
          <RollerValue items={[t('sort_apartment_tag'), t('debt')]} activeIndex={currentSortBy === 'Tag' ? 0 : 1} />
          <div style={{ flex: 1 }} />
          <SpriteIcon id="nextItem-icn" className={SM.pillIcon} />
        </button>

        {/* Row 4 — Currency symbol toggle */}
        <button className={SM.pillRow} style={rowPadStyle} onClick={onCycleCurrency}>
          <span className={SM.pillLabel}>{t('symbol')}:</span>
          <div style={{ width: '8px' }} />
          <RollerValue items={currencyOptions.map(o => o.label)} activeIndex={currencyIndex} />
          <div style={{ flex: 1 }} />
          <SpriteIcon id="nextItem-icn" className={SM.pillIcon} />
        </button>

        {/* Row 5 — Theme selection */}
        <button className={SM.pillRow} style={rowPadStyle} onClick={onCycleTheme}>
          <span className={SM.pillLabel}>{t('color_theme')}:</span>
          <div style={{ width: '8px' }} />
          <RollerValue items={D.themes.map(theme => theme.name)} activeIndex={themeIndex} />
          <div style={{ flex: 1 }} />
          <SpriteIcon id="palette-icn" className={SM.pillIcon} />
        </button>

        {/* Row 6 — Export data */}
        <button className={SM.pillRowFilled} style={rowPadStyle} onClick={onExport}>
          <span className={SM.pillLabel}>{t('export_data')}</span>
          <div style={{ flex: 1 }} />
          <SpriteIcon id="export-icn" className={SM.pillIcon} />
        </button>

        {/* Row 7 — Import data */}
        <button className={SM.pillRowFilled} style={rowPadStyle} onClick={handleImportClick}>
          <span className={SM.pillLabel}>{t('import_data')}</span>
          <div style={{ flex: 1 }} />
          <SpriteIcon id="import-icn" className={SM.pillIcon} />
        </button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />

        {/* Row 8 — Navigate to Delete Range sub-modal */}
        <button className={SM.pillRowDanger} style={rowPadStyle} onClick={() => setView('delete')}>
          <span className={SM.pillLabel}>{t('delete_data')}</span>
          <div style={{ flex: 1 }} />
          <SpriteIcon id="warnOutline-icn" className={SM.pillIcon} />
        </button>

        {/* Row 9 — Exit */}
        <button className={SM.pillRow} style={{ ...rowPadStyle, justifyContent: 'center' }} onClick={onExitAll}>
          <span className={SM.pillCenterText}>{t('exit')}</span>
        </button>

      </div>
    </div>
  );
}


// ─── EXPORTS ───────────────────────────────────────────────────────────────
export {
  CardProfileModal,
  DeleteCardConfirmModal,
  ExpenseModal,
  MonthYearPickerModal,
  DeleteRangeModal,
  SettingsModal,
};
