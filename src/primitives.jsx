// =========================================================================
// PRIMITIVES — small, generic, reused-everywhere UI building blocks
// =========================================================================
// No app-level state, no business logic — just "given props, render UI".
// These rarely change once built. Reads styling from window.DESIGN tokens.
// =========================================================================

import React, { useState, useRef, useEffect } from 'react';
import { formatAmount } from './utils.js';

// ─── SPRITE ICON COMPONENT ────────────────────────────────────────────────

// FIX [Unnecessary #1]: Removed duplicate section header comment that appeared twice.
// ─── NAVIGATION PILL (UNIFIED) ────────────────────────────────────────────
function NavigationPill({ 
  type, 
  currentValue, 
  totalOptions, 
  onPrev, 
  onNext, 
  onGoToday, 
  canGoToday = false,
  variant = 'default'
}) {
  const NP = window.DESIGN.navigationPill;
  // FIX [Unnecessary #2]: Removed unused `const A = window.DESIGN.animation` declaration.

  return (
    <div className={NP.container} style={NP.containerStyle(variant)}>
      <button
        onClick={onPrev}
        className={NP.btn}
        style={NP.btnStyle}
        aria-label={type === 'year' ? "Previous year" : "Previous month"}
      >
        <SpriteIcon id="icon-arrow-left" className={NP.icon} style={NP.iconStyle} />
      </button>
      
      {/* Go Today button - always shown */}
      <button
        onClick={canGoToday ? onGoToday : undefined}
        className={canGoToday ? NP.btn : NP.btnDisabled}
        style={canGoToday ? NP.btnStyle : NP.btnDisabledStyle}
        aria-label={type === 'year' ? "Go to current year" : "Go to current month"}
        disabled={!canGoToday}
      >
        <SpriteIcon 
          id="icon-go-today" 
          className={NP.icon} 
          style={canGoToday ? NP.iconStyle : NP.iconDisabledStyle} 
        />
      </button>
      
      <button
        onClick={onNext}
        className={NP.btn}
        style={NP.btnStyle}
        aria-label={type === 'year' ? "Next year" : "Next month"}
      >
        <SpriteIcon id="icon-arrow-right" className={NP.icon} style={NP.iconStyle} />
      </button>
    </div>
  );
}

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
  return paid
    ? <SpriteIcon id="icon-check"          className={`${ICN.statusIconSize} ${ICN.iconColorClasses.check}`} />
    : <SpriteIcon id="icon-warning-filled" className={`${ICN.statusIconSize} ${ICN.iconColorClasses.warning}`} style={window.DESIGN.iconColors.warningFilled} />;
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

  // FIX [Bug #3]: Removed `children` from the dependency array.
  // React creates a new children object on every render, so including it caused
  // the observer to disconnect and reconnect constantly — even for unrelated state
  // changes. The ResizeObserver already handles content size changes internally.
  useEffect(() => {
    if (!contentRef.current) return;
    const el     = contentRef.current;
    const update = () => setHeight(isOpen ? el.scrollHeight : 0);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen]);

  return (
    <div style={{ height: height + 'px', transition: `height ${A.drawerDuration} ${A.drawerCurve}`, ...drawerCfg.containerStyle }}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

// ─── AUTO-TEXTAREA ────────────────────────────────────────────────────────
// Expands vertically up to a max line count as the user types
function AutoTextarea({ value, onChange, placeholder, className, style }) {
  const ref         = useRef(null);
  const A           = window.DESIGN.animation;
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


// ─── ROLLER VALUE (generic vertical sliding value display) ───────────────
// Used by the settings rows that show a cycling value (language, sort,
// currency) with a smooth roller transition, matching the app's existing
// symbol-roller pattern.
function RollerValue({ items, activeIndex }) {
  const SM = window.DESIGN.settingsModal;
  const A  = window.DESIGN.animation;
  return (
    <div className={SM.rollerWrapper}>
      <div style={SM.rollerTrack(activeIndex, A)}>
        {items.map((item, i) => (
          <div key={i} className={SM.rollerItem}>{item}</div>
        ))}
      </div>
    </div>
  );
}


// ─── EXPORTS ───────────────────────────────────────────────────────────────
export {
  SpriteIcon,
  NavigationPill,
  PaidStatusIcon,
  CurrencySymbol,
  AmountSpan,
  Drawer,
  AutoTextarea,
  ModalWrapper,
  RollerValue,
};
