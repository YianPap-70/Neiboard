// =========================================================================
// DESIGN CONFIGURATION - SINGLE SOURCE OF TRUTH FOR ALL STYLING
// =========================================================================
// This file contains ALL colors, spacing, animations, and component styles.
// No hex values should appear anywhere else in the application.
// =========================================================================

// ─── COLOR PALETTE (ONLY PLACE HEX VALUES MAY APPEAR) ─────────────────────
const COLORS = {
  // Main colors (text, backgrounds, surfaces)
  'main-color-1': '#E1E3F8',  // Primary text and icons
  'main-color-2': '#9596B1',  // Secondary text, borders, dividers, disabled states
  'main-color-3': '#49496A',  // Input fields, buttons, pill backgrounds
  'main-color-4': '#3D3D5F',  // Menu buttons, secondary surfaces
  'main-color-5': '#333355',  // Card backgrounds, modal backgrounds
  'main-color-6': '#11112E',  // App background, sticky header background
  
  // Accent colors (status, actions, feedback)
  'accent-color-1': '#9CE66B', // Paid status, success rings, active states
  'accent-color-2': '#F2C454', // Debt totals, warning accents, unpaid indicators
  'accent-color-3': '#E25344', // Delete actions, unpaid X marks, error rings
  
  // Base colors
  'white': '#FFFFFF',
  'black': '#000000',
}

// Shared values used across multiple components
const RADIUS_STANDARD = '12px';
const MODAL_MAX_WIDTH = '376px';

// ─── ANIMATION KEYFRAMES (INJECTED INTO DOCUMENT) ────────────────────────
(function injectAnimationKeyframes() {
  const style = document.createElement('style');
  style.textContent = `
  @keyframes modalBackdropIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes modalContentIn {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes menuBackdropIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes menuContentIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes viewExitRecede {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes viewEnterFromRight {
    from { opacity: 0; transform: translateX(60px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes viewEnterFromLeft {
    from { opacity: 0; transform: translateX(-60px); }
    to { opacity: 1; transform: translateX(0); }
  }
  `;
  document.head.appendChild(style);
})();

// ─── ICON SIZE TOKENS ────────────────────────────────────────────────────
// Size classes only - colors come from iconColors or component styles
const icons = {
  statusIconSize: "w-5 h-5",
  rollerArrowSize: "w-[18px] h-[18px]",
  caretIconSize: `w-4 h-4 text-[${COLORS['main-color-1']}]`,
  actionIconSize: `w-9 h-9 text-[${COLORS['main-color-1']}]`,
  syncIconSize: "w-8 h-8",
};

// ─── MULTI-COLOR ICON STYLES ─────────────────────────────────────────────
// Each object provides CSS custom properties for SVG icons that use
// --accent-color-1 and --accent-color-2 variables in their definitions
const iconColors = {
  warningFilled:         { '--accent-color-1': COLORS['accent-color-2'] },
  check:                 { '--accent-color-1': COLORS['accent-color-1'] },
  buttonPaid:            { '--accent-color-1': COLORS['accent-color-1'] },
  buttonUnpaid:          { '--accent-color-1': COLORS['accent-color-3'], '--accent-color-2': COLORS['main-color-1'] },
  buildingExpenseUnpaid: { '--accent-color-1': COLORS['accent-color-3'], '--accent-color-2': COLORS['main-color-1'] },
  avatarDebt:            { '--avatar-debt-badge': COLORS['accent-color-2'], '--avatar-debt-body': COLORS['main-color-2'] },
  avatarNoDebt:          { '--avatar-nodebt-check': COLORS['accent-color-1'], '--avatar-nodebt-body': COLORS['main-color-2'] },
  synced:                { '--accent-color-1': COLORS['accent-color-1'] },
};

// ─── GLOBAL SETTINGS ─────────────────────────────────────────────────────
const currencyOptions = [
  { label: 'EUR €', symbol: '€' },
  { label: 'USD $', symbol: '$' },
  { label: 'GBP £', symbol: '£' },
  { label: 'Yen ¥', symbol: '¥' },
  { label: 'None', symbol: '' }
];

const fontFamily = "'Roboto', sans-serif";

// ─── ANIMATION TIMING CONFIGURATION ──────────────────────────────────────
const animation = {
  drawerCurve: 'cubic-bezier(0.25, 1, 0.5, 1)',
  drawerDuration: '0.5s',
  caretDuration: '500ms',
  modalCurve: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',  // Standard ease-out
  modalDuration: '0.45s',  // Much slower (was 0.45s)
  autoTextareaCurve: 'cubic-bezier(0.25, 1, 0.5, 1)',
  autoTextareaDuration: '0.2s',
  rollerTransition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
  viewTransitionDuration: '0.6s',
  viewTransitionCurve: 'cubic-bezier(0.4, 0, 0.2, 1)',
  coinFlipDuration: '0.5s',
};

// ─── LAYOUT & APP CONTAINER ──────────────────────────────────────────────
const layout = {
  appBackgroundHex: COLORS['main-color-6'],
  appWrapper: "min-h-screen antialiased flex justify-center pb-12",
  appInnerContainer: "w-full relative px-4 text-left",
  appMaxWidthStyle: { maxWidth: '440px' },
  loadingTextStyle: { color: COLORS['main-color-1'], textAlign: 'center', marginTop: '100px' },
};

// ─── HEADER COMPONENT ────────────────────────────────────────────────────
const header = {
  stickyContainer: "sticky top-0 z-40 w-full mx-auto pt-3 pb-2 flex flex-col gap-2",
  stickyContainerStyle: { backgroundColor: COLORS['main-color-6'] },
  touchTargetBtn: "w-[44px] h-[44px] flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity cursor-pointer",
  touchTargetBtnDisabled: "w-[44px] h-[44px] flex items-center justify-center shrink-0 cursor-default opacity-40 pointer-events-none",
  topRow: "flex items-center pl-[2px] pr-[2px] w-full",
  leftActionGroup: "flex items-center gap-2",
  debtSection: "flex items-center gap-2 ml-auto",
  totalDebtLabel: `font-medium whitespace-nowrap text-sm text-[${COLORS['main-color-1']}]`,
  totalDebtAmount: `truncate font-bold text-xl text-[${COLORS['accent-color-2']}]`,
  currencySizeMod: "text-[0.7em] mr-1",
  syncIconWrapper: "ml-2",
  bottomRow: "flex items-center pl-[2px] pr-[2px] w-full",
  monthTextBtn: "font-normal tracking-wide text-left text-2xl hover:opacity-80 transition-opacity select-none truncate pr-2",
  navPillContainer: `w-[100px] h-[44px] bg-[${COLORS['main-color-3']}] rounded-[22px] flex items-center justify-between ml-auto select-none relative overflow-hidden shrink-0`,
  navPillIconArea: `w-[50px] h-11 flex items-center justify-center pointer-events-none text-[${COLORS['main-color-1']}]`,
  navPillLeftTapZone: "absolute left-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/10 transition-colors",
  navPillRightTapZone: "absolute right-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/10 transition-colors",
  monthTextBtnCurrentColor: COLORS['main-color-1'],
  monthTextBtnOtherColor: COLORS['accent-color-2'],
  goTodayActiveOpacity: 1.0,
  goTodayInactiveOpacity: 0.3,
  goTodayFloatBtn: "w-[44px] h-[44px] flex items-center justify-center shrink-0 transition-opacity hover:opacity-80 outline-none select-none",
};

// ─── GLOBAL SPACING ──────────────────────────────────────────────────────
const spacing = {
  headerToListGap: '16px',
};

// ─── MAIN MENU ───────────────────────────────────────────────────────────
const mainMenu = {
  backdropOverlay: "fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4",
  backdropAnimation: (A) => ({ animation: `menuBackdropIn ${A.modalDuration} ease-out` }),
  contentAnimation: (A) => ({ animation: `menuContentIn ${A.modalDuration} ${A.modalCurve}` }),
  boxContainer: `w-full flex flex-col bg-[${COLORS['main-color-5']}] p-4 text-[${COLORS['main-color-1']}] gap-3 select-none`,
  boxContainerStyle: { borderRadius: RADIUS_STANDARD, maxWidth: '340px' },
  sectionRow: `w-full bg-[${COLORS['main-color-3']}] rounded-[12px] p-2 flex items-center justify-between h-[60px]`,
  sectionLabelLeft: `font-medium tracking-wide text-left pl-2 text-base text-[${COLORS['main-color-1']}]`,
  optionsRightGroup: "flex items-center gap-3 pr-1",
  pillButton: `h-[44px] px-5 font-bold rounded-[22px] bg-[${COLORS['main-color-4']}] text-[${COLORS['main-color-1']}] flex items-center justify-center min-w-[64px] transition-all duration-300 outline-none select-none`,
  activeRingClass: `ring-2 ring-[${COLORS['accent-color-1']}]`,
  symbolPill: `w-[150px] h-[44px] bg-[${COLORS['main-color-4']}] rounded-[22px] flex items-center justify-between px-3 select-none relative overflow-hidden`,
  symbolIconArea: `w-5 h-11 flex items-center justify-center pointer-events-none text-[${COLORS['main-color-1']}]`,
  symbolRollWrapper: "h-7 overflow-hidden relative pointer-events-none flex items-center justify-center flex-1",
  symbolRollContainer: "absolute flex flex-col items-center",
  symbolText: `text-base font-bold text-[${COLORS['main-color-1']}] h-7 leading-7 flex items-center justify-center whitespace-nowrap`,
  symbolLeftTapZone: "absolute left-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/5 transition-colors",
  symbolRightTapZone: "absolute right-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/5 transition-colors",
  dateRangeSection: `w-full bg-[${COLORS['main-color-3']}] rounded-[12px] p-3 flex flex-col gap-3`,
  dateRangeButtonsRow: "flex items-center gap-3 w-full",
  dateRangeBtn: `flex-1 h-[44px] rounded-[22px] bg-[${COLORS['main-color-4']}] text-[${COLORS['main-color-1']}] text-sm font-medium flex items-center justify-center outline-none select-none transition-all`,
  deleteBtn: `w-full h-[48px] rounded-[24px] bg-[${COLORS['main-color-4']}] border-none text-base font-bold flex items-center justify-center gap-2 transition-all duration-300 outline-none select-none`,
  deleteActiveRingClass: `ring-2 ring-[${COLORS['accent-color-3']}]`,
  deleteText: (isActive) => isActive ? `text-[${COLORS['main-color-1']}]` : `text-[${COLORS['main-color-2']}]`,
  deleteIconClass: (isActive) => isActive ? `w-6 h-6 text-[${COLORS['main-color-1']}]` : `w-6 h-6 text-[${COLORS['main-color-2']}]`,
  footerRow: "w-full flex items-center gap-3 pt-1",
  actionBtn: `flex-1 h-[48px] rounded-[24px] bg-[${COLORS['main-color-4']}] text-[${COLORS['main-color-1']}] text-base font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 outline-none`,
  actionBtnIconSize: `w-5 h-5 text-[${COLORS['main-color-1']}]`,
};

// ─── RESIDENT CARD COMPONENT ─────────────────────────────────────────────
const residentCard = {
  cardListContainer: "flex flex-col gap-4",
  cardWrapper: "flex flex-col overflow-hidden",
  cardBody: `bg-[${COLORS['main-color-5']}]`,
  cardInnerPadding: "p-4",
  cardHeaderContainer: "flex items-start gap-3",
  
  // NEW: Container for the two-row layout
  cardHeaderContent: "flex-1 min-w-0 flex flex-col gap-[2px]",
  
  // NEW: Top row with name and caret
  cardTopRow: "flex items-start justify-between gap-3 cursor-pointer select-none flex-1 min-w-0",
  
  // NEW: Bottom row for debt amount (right-aligned)
  cardBottomRow: "flex justify-end cursor-pointer select-none",
  
  avatarBtn: "shrink-0 h-[48px] w-[48px] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity active:scale-95",
  avatarIcon: "w-[48px] h-[48px] pointer-events-none",
  avatarIconNoDebt: `w-[48px] h-[48px] pointer-events-none text-[${COLORS['main-color-1']}]`,
  textMetaArea: "min-w-0 flex-1",
  residentName: `font-medium tracking-wide truncate text-lg text-[${COLORS['main-color-1']}]`,
  apartmentNumber: `font-medium truncate text-sm text-[${COLORS['main-color-2']}]`,
  balanceArea: "flex items-center shrink-0 gap-3",
  totalDebtText: `font-bold text-[22px] text-[${COLORS['accent-color-2']}]`,
  totalDebtCurrencyMod: "text-[0.7em] mr-0.5 font-bold",
  noDebtText: `font-light text-[16px] text-[${COLORS['accent-color-1']}]`,
  caretRotationStyle: (isExpanded, A) => ({
    display: 'inline-block',
    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: `transform ${A.caretDuration} ${A.drawerCurve}`
  }),
  monthActionRow: "flex items-center justify-between py-2.5",
  monthActionLabel: `font-medium truncate pr-2 text-xs text-[${COLORS['main-color-2']}]`,
  addExpenseBtn: `w-[100px] h-[44px] rounded-[22px] bg-[${COLORS['main-color-3']}] font-bold text-sm text-[${COLORS['main-color-1']}] flex items-center justify-center outline-none shrink-0 transition-transform active:scale-95`,
  itemContainer: "flex flex-col gap-1",
  noExpensesFallback: `text-center py-4 text-xs text-[${COLORS['main-color-2']}]`,
  itemRowWrapper: "w-full flex items-center justify-between py-3 first:pt-0 cursor-pointer select-none transition-colors active:bg-white/5",
  itemRowDividerStyle: `border-t border-solid border-[${COLORS['main-color-2']}]/50`,
  interactiveIconArea: "flex items-center min-w-0 gap-3 pointer-events-none",
  iconStateBtn: "shrink-0 h-5 flex items-center pointer-events-none",
  expenseDescription: `font-normal truncate pr-2 text-base text-[${COLORS['main-color-1']}]`,
  expenseValueAmount: (isPaid) => `font-medium shrink-0 text-lg pointer-events-none ${isPaid ? `text-[${COLORS['accent-color-1']}]` : `text-[${COLORS['main-color-1']}]`}`,
  expenseValueCurrencyMod: "text-[0.7em] mr-0.5 font-medium"
};

// ─── DRAWER COMPONENT ────────────────────────────────────────────────────
const drawer = {
  containerStyle: { overflow: 'hidden' },
};

// ─── AUTO-TEXTAREA COMPONENT ─────────────────────────────────────────────
const autoTextarea = {
  minHeight: '50px',
  maxLines: 5,
};

// ─── HISTORICAL DRAWER (PAST UNPAID EXPENSES) ────────────────────────────
const historyDrawer = {
  drawerWrapper: `bg-[${COLORS['main-color-4']}] px-4`,
  rowItemWrapper: "w-full flex items-center justify-between py-3 cursor-pointer select-none transition-colors active:bg-white/5",
  rowItemFirst: "pt-3 pb-3",
  rowItemDividerStyle: `border-t border-solid border-[${COLORS['main-color-2']}]`,
  metaSubTextGroup: "flex flex-col min-w-0 pr-2 pointer-events-none",
  pastMonthLabel: `font-medium truncate text-[12px] text-[${COLORS['main-color-2']}]`,
  toggleBar: `w-full flex items-center justify-between cursor-pointer hover:opacity-90 select-none bg-[${COLORS['main-color-3']}] py-2 px-4`,
  toggleBarLabelArea: "flex items-center min-w-0 gap-1.5",
  toggleBarText: `font-normal truncate text-sm text-[${COLORS['main-color-2']}]`,
  toggleBarAmount: `font-bold shrink-0 text-base text-[${COLORS['main-color-1']}]`,
  toggleBarCurrencyMod: "text-[0.7em] mr-0.5",
  cardRoundingContainerStyle: (hasPastUnpaidItems) => ({
    borderRadius: hasPastUnpaidItems ? `${RADIUS_STANDARD} ${RADIUS_STANDARD} 0 0` : RADIUS_STANDARD,
    overflow: 'hidden'
  }),
  toggleBarRoundingStyle: {
    borderBottomLeftRadius: RADIUS_STANDARD,
    borderBottomRightRadius: RADIUS_STANDARD
  }
};

// ─── MODAL BASE (SHARED MODAL BEHAVIOR) ──────────────────────────────────
const modalBase = {
  backdropOverlay: "fixed inset-0 flex items-start justify-center px-4 z-50 bg-black/70",
  backdropOverlayStyle: { 
    paddingTop: '32px',
    paddingTop: 'max(32px, env(safe-area-inset-top))' 
  },
  backdropAnimation: (A) => ({ animation: `modalBackdropIn ${A.modalDuration} ease-out` }),
  contentAnimation: (A) => ({ animation: `modalContentIn ${A.modalDuration} ${A.modalCurve}` }),
  boxContainer: `w-full relative shrink-0 bg-[${COLORS['main-color-5']}]`,
  boxContainerStyle: {
    borderRadius: RADIUS_STANDARD,
    maxWidth: MODAL_MAX_WIDTH,
    padding: '16px'
  },
};

// ─── EXPENSE MODAL ───────────────────────────────────────────────────────
const modal = {
  // ─── UNIFIED EXPENSE MODAL (Resident & Building) ──────────────────
  expenseModal: {
    containerPadding: '16px',
    containerMaxWidth: '376px',
    headerRow: `flex items-center gap-3 mb-3`,
    headerIcon: `w-6 h-6 shrink-0 text-[${COLORS['main-color-2']}]`,
    headerTitle: `font-medium text-[14px] text-[${COLORS['main-color-2']}] tracking-wide`,
    amountWrapper: `h-[52px] px-4 rounded-[6px] bg-[${COLORS['main-color-3']}] w-full flex items-center`,
    amountInput: `bg-transparent w-full focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[38px] font-normal text-[${COLORS['main-color-1']}]`,
    amountPlaceholder: `text-[16px] font-normal text-[${COLORS['main-color-2']}]`,
    descriptionWrapper: `h-[52px] px-4 rounded-[6px] bg-[${COLORS['main-color-3']}] w-full flex items-center`,
    descriptionInput: `bg-transparent w-full focus:outline-none text-[16px] font-normal text-[${COLORS['main-color-1']}]`,
    descriptionPlaceholder: `text-[16px] font-normal text-[${COLORS['main-color-2']}]`,
    statusPill: `w-full h-[52px] rounded-[9999px] flex items-center justify-center gap-2 transition-all duration-300 outline-none select-none cursor-pointer bg-transparent`,
    statusPillRingUnpaid: `ring-2 ring-[${COLORS['accent-color-3']}]`,
    statusPillRingPaid: `ring-2 ring-[${COLORS['accent-color-1']}]`,
    statusPillIcon: `w-6 h-6 flex-shrink-0`,
    statusPillText: `text-[16px] font-medium text-[${COLORS['main-color-1']}]`,
    actionRow: `flex items-center gap-3 w-full`,
    actionBtn: `h-[52px] rounded-[9999px] font-bold text-[${COLORS['main-color-1']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none cursor-pointer`,
    okBtn: `flex-1 bg-[${COLORS['main-color-3']}] ring-2 ring-[${COLORS['accent-color-1']}]`,
    cancelBtn: `flex-1 bg-[${COLORS['main-color-3']}]`,
    deleteBtn: `w-[52px] h-[52px] shrink-0 rounded-[9999px] bg-[${COLORS['main-color-3']}] ring-2 ring-[${COLORS['accent-color-3']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none cursor-pointer`,
    deleteIcon: `w-6 h-6 text-[${COLORS['main-color-1']}]`,
  },
  
  // ─── LEGACY MODAL STYLES (Keep for calendar and other modals) ─────
  headerRow: `flex items-center gap-2 mb-4`,
  headerIcon: `w-4 h-4 shrink-0 text-[${COLORS['main-color-2']}]`,
  headerTitle: `text-[14px] text-[${COLORS['main-color-2']}] tracking-wide`,
  amountInputBox: `px-3 flex items-center bg-[${COLORS['main-color-3']}] rounded-[12px] w-full`,
  amountInputBoxStyle: { height: '52px' },
  amountInputField: `bg-transparent font-bold w-full focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[26px] text-[${COLORS['main-color-1']}]`,
  amountPlaceholderStyle: { fontSize: '14px', color: COLORS['main-color-2'], fontWeight: 'normal' },
  paidStateToggleBtn: `shrink-0 w-[52px] h-[52px] flex items-center justify-center transition-transform active:scale-95`,
  paidToggleIcon: `w-9 h-9`,
  descriptionInputBox: `px-3 flex items-center bg-[${COLORS['main-color-3']}] rounded-[12px] w-full`,
  descriptionInputBoxStyle: { height: '44px' },
  descriptionInputField: `bg-transparent w-full focus:outline-none text-[16px] text-[${COLORS['main-color-1']}]`,
  descriptionPlaceholderStyle: { fontSize: '14px', color: COLORS['main-color-2'] },
  actionsFlexRow: `flex items-center gap-3 w-full`,
  amountToDescriptionGap: '12px',
  descriptionToActionsGap: '16px',
  confirmBtn: `flex-1 font-bold transition-transform active:scale-95 text-center bg-[${COLORS['main-color-3']}] text-[${COLORS['main-color-1']}] h-[52px] rounded-[9999px]`,
  cancelBtn: `flex-1 font-medium transition-transform active:scale-95 text-center bg-[${COLORS['main-color-3']}] text-[${COLORS['main-color-1']}] h-[52px] rounded-[9999px]`,
  deleteActionBtn: `shrink-0 flex items-center justify-center transition-transform active:scale-95 w-[52px] h-[52px] rounded-[9999px] bg-[${COLORS['main-color-3']}] outline-none select-none`,
  deleteActionBtnRingClass: `ring-2 ring-[${COLORS['accent-color-3']}]`,
  deleteActionIcon: `w-6 h-6 text-[${COLORS['main-color-1']}]`,
  deletePromptTitle: `font-bold mb-6 text-xl text-[${COLORS['main-color-1']}] text-center`,
  deleteYesBtn: `flex-1 font-bold transition-transform active:scale-95 h-12 rounded-[9999px] text-[${COLORS['main-color-1']}]`,
  deleteYesBtnStyle: { backgroundColor: COLORS['accent-color-3'] },
  deleteNoBtn: `flex-1 font-bold transition-transform active:scale-95 h-12 rounded-[9999px] bg-[${COLORS['main-color-3']}] text-[${COLORS['main-color-1']}]`,
  
  // ─── CALENDAR MODAL ──────────────────────────────────────────────────────
  calendar: {
    yearPill: `w-full h-11 bg-[${COLORS['main-color-3']}] rounded-[22px] flex items-center justify-between px-4 mb-4 select-none relative overflow-hidden`,
    yearIconArea: `w-6 h-11 flex items-center justify-center pointer-events-none text-[${COLORS['main-color-1']}]`,
    yearRollWrapper: `h-7 overflow-hidden relative pointer-events-none flex items-center justify-center w-28`,
    yearRollContainer: `absolute flex flex-col items-center`,
    yearText: `text-xl font-bold text-[${COLORS['main-color-1']}] tracking-wider h-7 leading-7 flex items-center justify-center`,
    leftTapZone: `absolute left-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/5 transition-colors`,
    rightTapZone: `absolute right-0 top-0 bottom-0 w-1/2 cursor-pointer active:bg-white/5 transition-colors`,
    gridContainer: `grid grid-cols-4 gap-x-2 gap-y-2 mb-4 justify-items-center justify-center mx-auto`,
    monthCircle: `w-[52px] h-[52px] rounded-full bg-[${COLORS['main-color-3']}] text-[13px] font-bold text-[${COLORS['main-color-1']}] tracking-wide flex items-center justify-center transition-all duration-300 outline-none select-none`,
    monthActiveRing: `ring-2 ring-[${COLORS['accent-color-1']}]`,
    footerRow: `flex items-center gap-3 mt-4`,
    actionBtn: `flex-1 h-11 rounded-[22px] bg-[${COLORS['main-color-3']}] text-[${COLORS['main-color-1']}] text-sm font-medium tracking-wide text-center transition-transform active:scale-95 outline-none`
  }
};

// ─── CARD PROFILE MODAL (ADD/EDIT RESIDENT) ──────────────────────────────
const cardModal = {
  wrapper: `w-full max-w-[376px]`,
  containerPadding: '12px',
  containerGap: '16px',
  headerRow: "flex items-center gap-3 mb-0",
  headerIcon: `w-6 h-6 shrink-0 text-[${COLORS['main-color-2']}]`,
  headerLabel: `font-medium text-[14px] text-[${COLORS['main-color-2']}] tracking-wide`,
  fieldsContainer: "flex flex-col",
  fieldGap: '8px',
  notesSectionGap: '16px',
  fieldWrapper: `bg-[${COLORS['main-color-3']}] rounded-[6px] w-full`,
  fieldInput: `w-full bg-transparent focus:outline-none`,
  fieldHeight: '52px',
  fieldPadding: '12px 16px',
  nameFieldInput: `font-bold text-[18px] text-[${COLORS['main-color-1']}]`,
  apartmentFieldInput: `font-normal text-[18px] text-[${COLORS['main-color-1']}]`,
  placeholderStyle: `text-[16px] font-normal text-[${COLORS['main-color-2']}]`,
  notesSection: "flex flex-col",
  notesTitleRow: "flex items-center gap-2 mb-2",
  notesIcon: `w-6 h-6 text-[${COLORS['main-color-2']}]`,
  notesTitle: `text-[16px] font-medium text-[${COLORS['main-color-2']}]`,
  notesFieldWrapper: `bg-[${COLORS['main-color-3']}] rounded-[6px] w-full`,
  notesField: `w-full bg-transparent focus:outline-none resize-none overflow-hidden text-[16px] font-normal text-[${COLORS['main-color-1']}]`,
  notesFieldPadding: '12px 16px',
  notesFieldMinHeight: '52px',
  buttonRow: "flex items-center gap-3 w-full mt-0",
  buttonGap: '16px',
  baseBtn: `h-[44px] rounded-[9999px] font-bold text-[${COLORS['main-color-1']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none`,
  okBtn: `flex-1 bg-[${COLORS['main-color-3']}] ring-2 ring-[${COLORS['accent-color-1']}]`,
  nextBtn: `flex-1 bg-[${COLORS['main-color-3']}] text-[${COLORS['main-color-6']}]`,
  cancelTextBtn: `flex-1 bg-[${COLORS['main-color-3']}] text-[${COLORS['main-color-1']}]`,
  trashBtn: `w-[44px] h-[44px] shrink-0 rounded-[9999px] bg-[${COLORS['main-color-3']}] ring-2 ring-[${COLORS['accent-color-3']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none`,
  trashIconSize: `w-5 h-5 text-[${COLORS['main-color-1']}]`,
  deleteConfirmBoxStyle: {
    borderRadius: RADIUS_STANDARD,
    maxWidth: '376px',
    padding: '20px'
  },
  deleteConfirmTitle: `font-bold text-xl text-[${COLORS['main-color-1']}] text-center mb-6 leading-snug`,
  deleteConfirmRow: "flex items-center gap-4",
  deleteConfirmYesBtn: `flex-1 h-[44px] rounded-[9999px] bg-[${COLORS['main-color-3']}] ring-2 ring-[${COLORS['accent-color-3']}] font-bold text-[${COLORS['main-color-1']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none`,
  deleteConfirmNoBtn: `flex-1 h-[44px] rounded-[9999px] bg-[${COLORS['main-color-3']}] ring-2 ring-[${COLORS['accent-color-1']}] font-bold text-[${COLORS['main-color-1']}] flex items-center justify-center transition-transform active:scale-95 outline-none select-none`,
};

// ─── WALLET FLIP BUTTON (3D TOGGLE) ──────────────────────────────────────
const walletFlipBtn = {
  container: "w-[52px] h-[52px] flex items-center justify-center shrink-0",
  containerStyle: { perspective: '200px' },
  flipperStyle: (isBuilding, duration) => ({
    transition: `transform ${duration} cubic-bezier(0.25, 1, 0.5, 1)`,
    transform: isBuilding ? 'rotateY(180deg)' : 'rotateY(0deg)',
    transformStyle: 'preserve-3d',
    width: '52px',
    height: '52px',
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
  faceIconSize: `w-9 h-9 text-[${COLORS['main-color-1']}]`,
};

// ─── VIEW TRANSITION (CARDS ↔ BUILDING) ──────────────────────────────────
const viewTransition = {
  outerStyle: { position: 'relative' },
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
};

// ─── BUILDING EXPENSES VIEW ──────────────────────────────────────────────
const buildingExpenses = {
  listContainer: "flex flex-col",
  labelRow: "flex items-center justify-between w-full",
  sectionLabel: `font-thin text-[14px] text-[${COLORS['main-color-1']}]`,
  totalLabel: `font-thin text-[14px] text-[${COLORS['main-color-1']}]`,
  totalAmount: `font-bold text-[18px] text-[${COLORS['accent-color-2']}] ml-1`,
  totalCurrencyMod: `font-bold text-[${COLORS['accent-color-2']}] text-[0.7em] mr-0.5`,
  addBtn: `w-[100px] h-[44px] rounded-[22px] bg-[${COLORS['main-color-3']}] ring-2 ring-[${COLORS['accent-color-1']}] font-bold text-sm text-[${COLORS['main-color-1']}] flex items-center justify-center outline-none shrink-0 transition-transform active:scale-95`,
  addBtnWrapper: "flex",
  addBtnGap: '30px',
  itemsWrapper: "flex flex-col",
  itemRow: "w-full flex items-center justify-between py-3 cursor-pointer select-none transition-colors active:bg-white/5",
  itemRowDivider: `border-t border-solid border-[${COLORS['main-color-2']}]/50`,
  itemLeft: "flex items-center min-w-0 gap-3 pointer-events-none",
  itemIconArea: "shrink-0 h-5 flex items-center pointer-events-none",
  itemDescription: `font-medium truncate pr-2 text-base text-[${COLORS['main-color-1']}]`,
  itemAmount: (isPaid) => `font-medium shrink-0 text-lg pointer-events-none ${isPaid ? `text-[${COLORS['accent-color-1']}]` : `text-[${COLORS['main-color-1']}]`}`,
  itemCurrencyMod: "text-[0.7em] mr-0.5 font-medium",
  cardContainer: `bg-[${COLORS['main-color-5']}] rounded-[12px] overflow-hidden px-4`,
  cardContainerGap: '16px',
  prevLabel: `font-thin text-[14px] text-[${COLORS['main-color-1']}]`,
  prevLabelWrapper: "flex items-center justify-between w-full",
  prevItemTextCol: "flex flex-col min-w-0",
  prevMonthSubLabel: `font-medium truncate text-[12px] text-[${COLORS['main-color-2']}]`,
  sectionPaddingTop: '16px',
  sectionPaddingBottom: '16px',
};

// ─── EXPENSE MODAL CONFIGURATIONS ────────────────────────────────────────
// Centralized configuration for expense modals (resident and building)
const expenseModalConfigs = {
  resident: {
    unpaidIconId: 'icon-button-unpaid',
    unpaidIconColors: iconColors.buttonUnpaid,
    deleteModeType: 'delete',
    context: 'resident',
  },
  building: {
    unpaidIconId: 'icon-building-expenseunpaid',
    unpaidIconColors: iconColors.buildingExpenseUnpaid,
    deleteModeType: 'buildingDelete',
    context: 'building',
  },
};

// ─── EXPORT ALL DESIGN TOKENS ────────────────────────────────────────────
window.DESIGN = {
  colors: COLORS,
  icons,
  iconColors,
  currencyOptions,
  fontFamily,
  animation,
  layout,
  header,
  spacing,
  mainMenu,
  residentCard,
  drawer,
  autoTextarea,
  historyDrawer,
  modalBase,
  modal,
  cardModal,
  walletFlipBtn,
  viewTransition,
  buildingExpenses,
  expenseModalConfigs,
};