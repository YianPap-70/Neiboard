// =========================================================================
// ARCHITECTURAL SOURCE OF TRUTH: DESIGN CONFIGURATION
// All Tailwind CSS utilities, layout constants, and theme tokens live here.
// DO NOT hardcode styling classes or inline sizing directly into App.js.
// =========================================================================

const _DESIGN_PRIVATE = (() => {
  const HEX_WARNING_RED = '#E25344';
  const RADIUS_STANDARD = '12px';
  return { HEX_WARNING_RED, RADIUS_STANDARD };
})();

// Calendar year range for the year-picker roller.
// Adjust CALENDAR_START_YEAR / CALENDAR_END_YEAR here to change the selectable range.
window.CALENDAR_START_YEAR = 2015;
window.CALENDAR_END_YEAR   = 2045;
window.TIMELINE_YEARS = Array.from(
  { length: window.CALENDAR_END_YEAR - window.CALENDAR_START_YEAR + 1 },
  (_, i) => window.CALENDAR_START_YEAR + i
);

window.DESIGN = {

  // ─── GLOBAL METADATA & LOCALIZATION ──────────────────────────────────────
  // ─── AI ARCHITECTURE GUARDRAILS (DO NOT REMOVE) ──────────────────────────
  // RULE #1: NEW MODAL OVERLAYS & FLEXBOX COLLAPSE PREVENTION
  // All backdrop overlays (modalBase.backdropOverlay) use CSS Flexbox.
  // When wrapping new forms/modals to catch click events with e.stopPropagation(),
  // NEVER use an unstyled middle <div> wrapper. 
  // You must either:
  //   A) Apply the 'w-full max-w-[...px]' styles directly onto that middle wrapper div.
  //   B) Attach the onClick={(e) => e.stopPropagation()} directly onto the styled component.
  // Failure to follow this rule will cause Flexbox to collapse the new modal width to 0px.
  // ──────────────────────────────────────────────────────────────────────────
  currencyOptions: [
    { label: 'EUR €', symbol: '€' },
    { label: 'USD $', symbol: '$' },
    { label: 'GBP £', symbol: '£' },
    { label: 'Yen ¥', symbol: '¥' },
    { label: 'None', symbol: '' }
  ],
  fontFamily: "'Open Sans', sans-serif",
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],

  // ─── GLOBAL LAYOUT & APP CONTAINER ────────────────────────────────────────
  layout: {
    appBackgroundHex: '#11112E',
    appWrapper: "min-h-screen antialiased flex justify-center pb-12",
    appInnerContainer: "w-full relative px-4 text-left",
    appMaxWidthStyle: { maxWidth: '440px' },
  },

  // ─── HEADER COMPONENT ─────────────────────────────────────────────────────
  header: {
    stickyContainer: "sticky top-0 z-40 w-full mx-auto pt-3 pb-2 flex flex-col gap-2",
    stickyContainerStyle: { backgroundColor: '#11112E' },

    touchTargetBtn: "w-[44px] h-[44px] flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity",

    topRow: "flex items-center pl-[2px] pr-[2px] w-full",
    leftActionGroup: "flex items-center gap-2",
    debtSection: "flex items-center gap-2 ml-auto",
    totalDebtLabel: "font-medium whitespace-nowrap text-sm text-[#E1E3F8]",
    totalDebtAmount: "truncate font-bold text-xl text-[#F2C454]",
    currencySizeMod: "text-[0.7em] mr-1",
    syncIconWrapper: "ml-2",

    bottomRow: "flex items-center pl-[2px] pr-[2px] w-full",
    monthTextBtn: "font-extralight tracking-wide text-left text-2xl hover:opacity-80 transition-opacity select-none truncate pr-2",

    navPillContainer: "w-[100px] h-[44px] bg-[#49496A] rounded-[22px] flex items-center justify-between ml-auto select-none relative overflow-hidden shrink-0",
    navPillIconArea: "w-[50px] h-11 flex items-center justify-center pointer-events-none text-[#E1E3F8]",
    navPillLeftTapZone: "absolute left-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/10 transition-colors",
    navPillRightTapZone: "absolute right-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/10 transition-colors",

    monthTextBtnCurrentColor: '#E1E3F8',
    monthTextBtnOtherColor: '#F2C454',
    goTodayActiveOpacity: 1.0,
    goTodayInactiveOpacity: 0.3,
    goTodayFloatBtn: "w-[44px] h-[44px] flex items-center justify-center shrink-0 transition-opacity hover:opacity-80 outline-none select-none",
  },

  // ─── GLOBAL LAYOUT SPACING ────────────────────────────────────────────────
  spacing: {
    headerToListGap: '16px',
  },

  // ─── MAIN MENU CONTAINER ──────────────────────────────────────────────────
  mainMenu: {
    backdropOverlay: "fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4",
    backdropAnimation: (A) => ({ animation: `menuBackdropIn ${A.modalDuration} ease-out` }),
    contentAnimation: (A) => ({ animation: `menuContentIn ${A.modalDuration} ${A.modalCurve}` }),

    boxContainer: "w-full flex flex-col bg-[#333355] p-4 text-[#E1E3F8] gap-3 select-none",
    boxContainerStyle: { borderRadius: _DESIGN_PRIVATE.RADIUS_STANDARD, maxWidth: '340px' },

    sectionRow: "w-full bg-[#49496A] rounded-[12px] p-2 flex items-center justify-between h-[60px]",
    sectionLabelLeft: "font-semibold tracking-wide text-left pl-2 text-base text-[#E1E3F8]",

    optionsRightGroup: "flex items-center gap-3 pr-1",

    pillButton: "h-[44px] px-5 font-bold rounded-[22px] bg-[#3D3D5F] text-[#E1E3F8] flex items-center justify-center min-w-[64px] transition-all duration-300 outline-none select-none",
    activeRingClass: "ring-2 ring-[#9CE66B]",

    symbolPill: "w-[150px] h-[44px] bg-[#3D3D5F] rounded-[22px] flex items-center justify-between px-3 select-none relative overflow-hidden",
    symbolIconArea: "w-5 h-11 flex items-center justify-center pointer-events-none text-[#E1E3F8]",
    symbolRollWrapper: "h-7 overflow-hidden relative pointer-events-none flex items-center justify-center flex-1",
    symbolRollContainer: "absolute flex flex-col items-center",
    symbolText: "text-base font-bold text-[#E1E3F8] h-7 leading-7 flex items-center justify-center whitespace-nowrap",
    symbolLeftTapZone: "absolute left-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/5 transition-colors",
    symbolRightTapZone: "absolute right-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/5 transition-colors",

    dateRangeSection: "w-full bg-[#49496A] rounded-[12px] p-3 flex flex-col gap-3",
    dateRangeButtonsRow: "flex items-center gap-3 w-full",
    dateRangeBtn: "flex-1 h-[44px] rounded-[22px] bg-[#3D3D5F] text-[#E1E3F8] text-sm font-semibold flex items-center justify-center outline-none select-none transition-all",

    deleteBtn: "w-full h-[48px] rounded-[24px] bg-[#3D3D5F] border-none text-base font-bold flex items-center justify-center gap-2 transition-all duration-300 outline-none select-none",
    deleteActiveRingClass: "ring-2 ring-[#E25344]",
    deleteText: (isActive) => isActive ? "text-[#E1E3F8]" : "text-[#E1E3F8] opacity-40",
    deleteIconClass: (isActive) => isActive ? "" : "opacity-40",

    footerRow: "w-full flex items-center gap-3 pt-1",
    actionBtn: "flex-1 h-[48px] rounded-[24px] bg-[#3D3D5F] text-[#E1E3F8] text-base font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 outline-none"
  },

  // ─── RESIDENT CARD COMPONENT ──────────────────────────────────────────────
  residentCard: {
    cardListContainer: "flex flex-col gap-4",
    cardWrapper: "flex flex-col overflow-hidden",
    cardBody: "bg-[#333355]",
    cardInnerPadding: "p-4",

    cardHeaderContainer: "flex items-center justify-between gap-3",
    cardHeaderRightArea: "flex items-center justify-between flex-1 min-w-0 cursor-pointer select-none gap-3",

    profileArea: "flex items-center min-w-0 gap-3",
    avatarBtn: "shrink-0 h-[46px] w-[46px] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity active:scale-95",
    avatarImg: "object-contain h-[46px] w-[46px] pointer-events-none",
    textMetaArea: "min-w-0 cursor-pointer select-none flex-1",
    residentName: "font-semibold tracking-wide truncate text-base text-[#E1E3F8]",
    apartmentNumber: "font-medium truncate text-sm text-[#E1E3F8] opacity-50",

    balanceArea: "flex items-center shrink-0 gap-3",
    totalDebtText: "font-bold text-[22px] text-[#F2C454]",
    totalDebtCurrencyMod: "text-[0.7em] mr-0.5 font-bold",
    noDebtText: "font-normal text-[22px] text-[#E1E3F8]",

    caretRotationStyle: (isExpanded, A) => ({
      display: 'inline-block',
      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: `transform ${A.caretDuration} ${A.drawerCurve}`
    }),

    monthActionRow: "flex items-center justify-between px-4 py-2.5",
    monthActionLabel: "font-medium truncate pr-2 text-xs text-[#E1E3F8] opacity-40",

    addExpenseBtn: "w-[100px] h-[44px] rounded-[22px] bg-[#49496A] ring-2 ring-[#9CE66B] font-bold text-sm text-[#E1E3F8] flex items-center justify-center outline-none shrink-0 transition-transform active:scale-95",

    itemContainer: "px-4 pb-4",
    noExpensesFallback: "text-center py-4 text-xs text-[#E1E3F8] opacity-50",

    itemRowWrapper: "w-full flex items-center justify-between py-3 first:pt-0 cursor-pointer select-none transition-colors active:bg-white/5",
    itemRowDividerStyle: "border-t border-solid border-white/20",
    interactiveIconArea: "flex items-center min-w-0 gap-3 pointer-events-none",
    iconStateBtn: "shrink-0 h-5 flex items-center pointer-events-none",
    expenseDescription: (isPaid) => `font-medium truncate pr-2 text-base ${isPaid ? 'text-[#9CE66B]' : 'text-[#E1E3F8]'}`,
    expenseValueAmount: (isPaid) => `font-semibold shrink-0 text-lg pointer-events-none ${isPaid ? 'text-[#9CE66B]' : 'text-[#E1E3F8]'}`,
    expenseValueCurrencyMod: "text-[0.7em] mr-0.5 font-semibold"
  },

  // ─── DRAWER COMPONENT ─────────────────────────────────────────────────────
  drawer: {
    containerStyle: { overflow: 'hidden' },
  },

  // ─── AUTO-TEXTAREA COMPONENT ──────────────────────────────────────────────
  autoTextarea: {
    minHeight: '50px',
    maxLines: 5,
  },

  // Input field tokens for card profile modals.
  // The .card-modal-input class in styles.css reads these values; if you change
  // them here, update the matching declarations in styles.css as well.
  cardModalInput: {
    placeholderColor: '#E1E3F8',   // opacity is applied separately via CSS
    placeholderOpacity: '0.5',
    textColor: '#E1E3F8',
    fontSize: '14px',
  },

  // ─── HISTORICAL DRAWER BAR COMPONENTS ─────────────────────────────────────
  historyDrawer: {
    drawerWrapper: "bg-[#49496A] px-4",
    rowItemWrapper: "w-full flex items-center justify-between py-3 cursor-pointer select-none transition-colors active:bg-white/5",
    rowItemFirst: "pt-3 pb-3",
    rowItemDividerStyle: "border-t border-solid border-white/20",
    metaSubTextGroup: "flex flex-col min-w-0 pr-2 pointer-events-none",
    pastMonthLabel: "font-semibold truncate text-[12px] text-[#E1E3F8] opacity-50",

    toggleBar: "w-full flex items-center justify-between cursor-pointer hover:opacity-90 select-none bg-[#49496A] py-2 px-4",
    toggleBarLabelArea: "flex items-center min-w-0 gap-1.5",
    toggleBarText: "font-medium truncate text-xs text-[#E1E3F8] opacity-50",
    toggleBarAmount: "font-bold shrink-0 text-base text-[#E1E3F8] opacity-50",
    toggleBarCurrencyMod: "text-[0.7em] mr-0.5",

    cardRoundingContainerStyle: (hasPastUnpaidItems) => ({
      borderRadius: hasPastUnpaidItems ? `${_DESIGN_PRIVATE.RADIUS_STANDARD} ${_DESIGN_PRIVATE.RADIUS_STANDARD} 0 0` : _DESIGN_PRIVATE.RADIUS_STANDARD,
      overflow: 'hidden'
    }),
    toggleBarRoundingStyle: {
      borderBottomLeftRadius: _DESIGN_PRIVATE.RADIUS_STANDARD,
      borderBottomRightRadius: _DESIGN_PRIVATE.RADIUS_STANDARD
    }
  },

  // ─── SHARED MODAL BASE ────────────────────────────────────────────────────
  // Backdrop overlay, entrance animation, box container shape, and padding are
  // shared across all modal types. Each modal section references these rather
  // than redeclaring them.
  modalBase: {
    backdropOverlay: "fixed inset-0 flex items-start justify-center px-4 z-50 bg-black/70 modal-safe-top",
    backdropAnimation: (A) => ({ animation: `modalBackdropIn ${A.modalDuration} ease-out` }),
    contentAnimation: (A) => ({ animation: `modalContentIn ${A.modalDuration} ${A.modalCurve}` }),
    boxContainer: "w-full relative shrink-0 bg-[#333355]",
    boxContainerStyle: {
      borderRadius: _DESIGN_PRIVATE.RADIUS_STANDARD,
      maxWidth: '376px',
      padding: '16px'
    },
  },

  // ─── POPUP MODAL DIALOGUES ────────────────────────────────────────────────
  modal: {
    // Shared tokens — reference modalBase directly in App.js via D.modalBase
    headerRow: "flex items-center gap-2 mb-4",
    headerIcon: "h-4 w-4 shrink-0 opacity-50",
    headerTitle: "text-[14px] text-[#E1E3F8] opacity-50 tracking-wide",

    amountInputBox: "px-3 flex items-center bg-[#49496A] rounded-[12px] w-full",
    amountInputBoxStyle: { height: '52px' },
    amountInputField: "bg-transparent font-bold w-full focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[26px] text-[#E1E3F8]",
    amountPlaceholderStyle: { fontSize: '14px', color: '#E1E3F8', opacity: 0.5, fontWeight: 'normal' },

    paidStateToggleBtn: "shrink-0 w-[52px] h-[52px] flex items-center justify-center transition-transform active:scale-95",
    paidStateToggleImg: "h-9 w-auto",

    descriptionInputBox: "px-3 flex items-center bg-[#49496A] rounded-[12px] w-full",
    descriptionInputBoxStyle: { height: '44px' },
    descriptionInputField: "bg-transparent w-full focus:outline-none text-[16px] text-[#E1E3F8]",
    descriptionPlaceholderStyle: { fontSize: '14px', color: '#E1E3F8', opacity: 0.5 },

    actionsFlexRow: "flex items-center gap-3 w-full",
    amountToDescriptionGap: '12px',
    descriptionToActionsGap: '16px',

    confirmBtn: "flex-1 font-bold transition-transform active:scale-95 text-center bg-[#49496A] text-[#E1E3F8] h-[52px] rounded-[9999px]",
    cancelBtn: "flex-1 font-semibold transition-transform active:scale-95 text-center bg-[#49496A] text-[#E1E3F8] h-[52px] rounded-[9999px]",

    deleteActionBtn: "shrink-0 flex items-center justify-center transition-transform active:scale-95 w-[52px] h-[52px] rounded-[9999px] bg-[#49496A] outline-none select-none",
    deleteActionBtnRingClass: "ring-2 ring-[#E25344]",

    deletePromptTitle: "font-bold mb-6 text-xl text-[#E1E3F8] text-center",
    deleteYesBtn: "flex-1 font-bold transition-transform active:scale-95 h-12 rounded-[9999px] text-[#E1E3F8]",
    deleteYesBtnStyle: { backgroundColor: _DESIGN_PRIVATE.HEX_WARNING_RED },
    deleteNoBtn: "flex-1 font-bold transition-transform active:scale-95 h-12 rounded-[9999px] bg-[#49496A] text-[#E1E3F8]",

    calendar: {
      yearPill: "w-full h-11 bg-[#49496A] rounded-[22px] flex items-center justify-between px-4 mb-4 select-none relative overflow-hidden",
      yearIconArea: "w-6 h-11 flex items-center justify-center pointer-events-none text-[#E1E3F8]",
      yearRollWrapper: "h-7 overflow-hidden relative pointer-events-none flex items-center justify-center w-28",
      yearRollContainer: "absolute flex flex-col items-center",
      yearText: "text-xl font-bold text-[#E1E3F8] tracking-wider h-7 leading-7 flex items-center justify-center",
      leftTapZone: "absolute left-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/5 transition-colors",
      rightTapZone: "absolute right-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/5 transition-colors",
      gridContainer: "grid grid-cols-4 gap-x-2 gap-y-2 mb-4 justify-items-center justify-center mx-auto",
      monthCircle: "w-[52px] h-[52px] rounded-full bg-[#49496A] text-[13px] font-bold text-[#E1E3F8] tracking-wide flex items-center justify-center transition-all duration-300 outline-none select-none",
      monthActiveRing: "ring-2 ring-[#9CE66B]",
      footerRow: "flex items-center gap-3 mt-4",
      actionBtn: "flex-1 h-11 rounded-[22px] bg-[#49496A] text-[#E1E3F8] text-sm font-semibold tracking-wide text-center transition-transform active:scale-95 outline-none"
    }
  },

  // ─── CARD PROFILE MODALS (ADD CARD / EDIT CARD) ───────────────────────────
  // Backdrop, animation, and box container tokens are inherited from modalBase.
  cardModal: {
    headerRow: "flex items-center gap-3 mb-4",
    headerIcon: "h-7 w-7 shrink-0 opacity-80",
    headerLabel: "font-bold text-lg text-[#E1E3F8] tracking-wide",

    fieldWrapper: "bg-[#49496A] rounded-[12px] px-4 flex items-start w-full",
    singleLineField: "w-full bg-transparent focus:outline-none text-[14px] text-[#E1E3F8] h-[50px] leading-[50px]",
    notesField: "w-full bg-transparent focus:outline-none text-[14px] text-[#E1E3F8] resize-none leading-[1.5] py-[14px] overflow-hidden",
    fieldGap: "12px",
    headerToFieldGap: "16px",
    fieldToButtonGap: "16px",

    buttonRow: "flex items-center gap-3 w-full",
    okBtn: "flex-1 h-[44px] rounded-[9999px] bg-[#49496A] ring-2 ring-[#9CE66B] font-bold text-[#E1E3F8] flex items-center justify-center transition-transform active:scale-95 outline-none select-none",
    cancelIconBtn: "w-[44px] h-[44px] shrink-0 rounded-[9999px] bg-[#49496A] ring-2 ring-[#E25344] flex items-center justify-center transition-transform active:scale-95 outline-none select-none",
    cancelTextBtn: "flex-1 h-[44px] rounded-[9999px] bg-[#49496A] ring-2 ring-[#E25344] font-bold text-[#E1E3F8] flex items-center justify-center transition-transform active:scale-95 outline-none select-none",
    trashBtn: "w-[44px] h-[44px] shrink-0 rounded-[9999px] bg-[#49496A] ring-2 ring-[#E25344] flex items-center justify-center transition-transform active:scale-95 outline-none select-none",

    deleteConfirmBoxStyle: {
      borderRadius: _DESIGN_PRIVATE.RADIUS_STANDARD,
      maxWidth: '376px',
      padding: '20px'
    },
    deleteConfirmTitle: "font-bold text-xl text-[#E1E3F8] text-center mb-6 leading-snug",
    deleteConfirmRow: "flex items-center gap-4",
    deleteConfirmYesBtn: "flex-1 h-[44px] rounded-[9999px] bg-[#49496A] ring-2 ring-[#E25344] font-bold text-[#E1E3F8] flex items-center justify-center transition-transform active:scale-95 outline-none select-none",
    deleteConfirmNoBtn: "flex-1 h-[44px] rounded-[9999px] bg-[#49496A] ring-2 ring-[#9CE66B] font-bold text-[#E1E3F8] flex items-center justify-center transition-transform active:scale-95 outline-none select-none",
  },

  // ─── REUSABLE ASSETS ──────────────────────────────────────────────────────
  icons: {
    hamburger:            { src: 'Icon-Hamburger.svg',          className: 'h-8',         alt: 'Menu' },
    addUser:              { src: 'Button-Add-User.svg',         className: 'h-8',         alt: 'Add User' },
    wallet:               { src: 'Icon-Wallet.svg',             className: 'h-8',         alt: 'Wallet' },
    residentCard:         { src: 'Icon-ResidentCard.svg',       className: 'h-8',         alt: 'Resident Cards' },
    synced:               { src: 'Icon-Synced.svg',             className: 'h-8',         alt: 'Synced Status' },
    calendarLeft:         { src: 'Arrow-Left.svg',              className: 'h-[18px]',    alt: 'Previous' },
    calendarRight:        { src: 'Arrow-Right.svg',             className: 'h-[18px]',    alt: 'Next' },
    goToday:              { src: 'Icon-Go-Today.svg',           className: 'h-8',         alt: 'Go to Today' },
    checkmark:            { src: 'Icon-Check.svg',              className: 'h-5',         alt: 'Paid' },
    warning:              { src: 'Icon-Warning-Filled.svg',     className: 'h-5',         alt: 'Unpaid' },
    caret:                { src: 'Icon-Caret.svg',              className: 'w-4 h-4',     alt: 'Expand/Collapse' },
    trash:                { src: 'Icon-Trash.svg',              className: 'h-6',         alt: 'Delete' },
    download:             { src: 'Icon-Download.svg',           className: 'h-5',         alt: 'Download PDF' },
    editExpenseIcon:      { src: 'Icon-Edit.svg',               className: 'h-4 w-4',     alt: 'Edit' },
    cardAdd:              { src: 'Button-Add-User.svg',         className: 'h-7 w-7',     alt: 'Add Card' },
    cardEdit:             { src: 'Icon-Edit.svg',               className: 'h-7 w-7',     alt: 'Edit Card' },
    cardCancel:           { src: 'Icon-Ex.svg',                 className: 'h-5 w-5',     alt: 'Cancel' },
    cardTrash:            { src: 'Icon-Trash.svg',              className: 'h-5 w-5',     alt: 'Delete Card' },
    paidToggle:           { src: 'Button-Paid.svg',             className: 'h-9 w-auto',  alt: 'Paid' },
    unpaidToggle:         { src: 'Button-Unpaid.svg',           className: 'h-9 w-auto',  alt: 'Mark as Paid' },
    buildingUnpaidToggle: { src: 'Building-ExpenseUnpaid.svg',  className: 'h-9 w-auto',  alt: 'Mark as Paid' },
  },

  animation: {
    drawerCurve: 'cubic-bezier(0.25, 1, 0.5, 1)',
    drawerDuration: '0.5s',
    caretDuration: '500ms',
    modalCurve: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
    modalDuration: '0.4s',
    autoTextareaCurve: 'cubic-bezier(0.25, 1, 0.5, 1)',
    autoTextareaDuration: '0.2s',
    rollerTransition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
    viewTransitionDuration: '0.35s',
    viewTransitionCurve: 'cubic-bezier(0.25, 1, 0.5, 1)',
    coinFlipDuration: '0.5s',
  },

  // ─── WALLET FLIP BUTTON ───────────────────────────────────────────────────
  walletFlipBtn: {
    container: "w-[44px] h-[44px] flex items-center justify-center shrink-0",
    containerStyle: { perspective: '200px' },
    flipperBase: "w-[44px] h-[44px] relative flex items-center justify-center",
    flipperStyle: (isBuilding, duration) => ({
      transition: `transform ${duration} cubic-bezier(0.25, 1, 0.5, 1)`,
      transform: isBuilding ? 'rotateY(180deg)' : 'rotateY(0deg)',
      transformStyle: 'preserve-3d',
      width: '44px',
      height: '44px',
    }),
    faceBase: {
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
    },
    backFaceStyle: {
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      transform: 'rotateY(180deg)',
    },
  },

  // ─── VIEW TRANSITION (cards ↔ building expenses) ──────────────────────────
  viewTransition: {
    outerStyle: { position: 'relative' },
    // Outgoing view fades out in place while the incoming view slides over it.
    exitStyle: (duration, curve) => ({
      position: 'absolute',
      top: 0, left: 0, right: 0,
      pointerEvents: 'none',
      animation: `viewExitRecede ${duration} ${curve} forwards`,
      zIndex: 0,
    }),
    enterFromRightStyle: (duration, curve) => ({
      animation: `viewEnterFromRight ${duration} ${curve} forwards`,
      zIndex: 1,
      position: 'relative',
    }),
    enterFromLeftStyle: (duration, curve) => ({
      animation: `viewEnterFromLeft ${duration} ${curve} forwards`,
      zIndex: 1,
      position: 'relative',
    }),
  },

  // ─── BUILDING EXPENSES VIEW ───────────────────────────────────────────────
  buildingExpenses: {
    listContainer: "flex flex-col",
    labelRow: "flex items-center justify-between w-full",
    labelRowGap: '30px',
    sectionLabel: "font-light text-[14px] text-[#E1E3F8]",
    totalLabel: "font-light text-[14px] text-[#E1E3F8]",
    totalAmount: "font-bold text-[18px] text-[#F2C454] ml-1",
    addBtn: "w-[100px] h-[44px] rounded-[22px] bg-[#49496A] ring-2 ring-[#9CE66B] font-bold text-sm text-[#E1E3F8] flex items-center justify-center outline-none shrink-0 transition-transform active:scale-95",
    addBtnWrapper: "flex",
    addBtnGap: '30px',
    itemsWrapper: "flex flex-col",
    itemRow: "w-full flex items-center justify-between py-3 cursor-pointer select-none transition-colors active:bg-white/5",
    itemRowDivider: "border-t border-solid border-white/30",
    itemLeft: "flex items-center min-w-0 gap-3 pointer-events-none",
    itemIconArea: "shrink-0 h-5 flex items-center pointer-events-none",
    itemDescription: (isPaid) => `font-medium truncate pr-2 text-base ${isPaid ? 'text-[#9CE66B]' : 'text-[#E1E3F8]'}`,
    itemAmount: (isPaid) => `font-semibold shrink-0 text-lg pointer-events-none ${isPaid ? 'text-[#9CE66B]' : 'text-[#E1E3F8]'}`,
    itemCurrencyMod: "text-[0.7em] mr-0.5 font-semibold",
    cardContainer: "bg-[#333355] rounded-[12px] overflow-hidden px-4",
    cardContainerGap: '16px',
    prevLabel: "font-light text-[14px] text-[#E1E3F8]",
    prevLabelWrapper: "flex items-center justify-between w-full",
    // Sub-label showing the originating month beneath an expense description in previous-months rows.
    prevMonthSubLabel: "font-semibold truncate text-[12px] text-[#E1E3F8] opacity-50",
    sectionPaddingTop: '16px',
    sectionPaddingBottom: '16px',
  },
};