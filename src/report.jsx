// =========================================================================
// REPORT — printable / "Save as PDF" black & white summary
// =========================================================================
// Deliberately independent of window.DESIGN: this is a distinct black-on-
// white print artifact (paper), not a themed in-app view, so it does not
// read any theme tokens, background colors, or rounded-pill styling from
// DesignConfig.js. The only things reused from the rest of the app are:
//   - SpriteIcon (so the exact same icon-check / icon-warning-filled /
//     neiboard-logo glyphs are used — just recolored to solid black via
//     the `color` CSS prop, since the sprite fills use currentColor)
//   - formatAmount() from utils.js, for identical number formatting
//   - t() from App.jsx, for identical language handling
//
// Rendered through a React portal directly onto document.body so it can
// sit above (and be fully independent of) the app's own DOM tree, and a
// dedicated <style> block (injected once, on module load) hides everything
// else on the page during printing so only the report itself is ever sent
// to the printer / PDF.
// =========================================================================

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { SpriteIcon } from './primitives.jsx';
import { formatAmount } from './utils.js';

const REPORT_FONT = "'Roboto', Arial, Helvetica, sans-serif";
const BLACK = '#000000';
const GRAY  = '#6b6b6b';
const LINE  = '#dddddd';

// ─── PRINT / PAGE STYLESHEET (injected once) ─────────────────────────────
// @media print hides the entire live app and every bit of preview chrome,
// leaving only #report-page-root (and its children) visible — so nothing
// from the themed app can ever leak onto the printed page.
(function injectReportStyles() {
  if (document.getElementById('report-print-styles')) return;
  const style = document.createElement('style');
  style.id = 'report-print-styles';
  style.textContent = `
    @media print {
      body * { visibility: hidden; }
      #report-page-root, #report-page-root * { visibility: visible; }
      #report-page-root {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
      }
    }
    @page {
      size: A4;
      margin: 10mm;
    }
  `;
  document.head.appendChild(style);
})();

// ─── SMALL PRESENTATIONAL PIECES ──────────────────────────────────────────

// A single billable line: status icon, description (+ optional month
// sub-label for past-month items), amount — struck through when paid.
function ReportRow({ description, amount, paid, monthLabel, symbol, isFirst }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '9px 0',
        borderTop: isFirst ? 'none' : `1px solid ${LINE}`,
        breakInside: 'avoid',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div style={{ width: '16px', height: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SpriteIcon
            id={paid ? 'icon-check' : 'icon-warning-filled'}
            style={{ width: '16px', height: '16px', color: BLACK }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: BLACK,
              textDecoration: paid ? 'line-through' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {description}
          </span>
          {monthLabel && (
            <span style={{ fontSize: '10.5px', color: GRAY, marginTop: '1px' }}>{monthLabel}</span>
          )}
        </div>
      </div>
      <span
        style={{
          fontSize: '13.5px',
          fontWeight: 600,
          color: BLACK,
          flexShrink: 0,
          textDecoration: paid ? 'line-through' : 'none',
        }}
      >
        {symbol}{symbol ? ' ' : ''}{formatAmount(amount)}
      </span>
    </div>
  );
}

// Right-aligned, larger-font total line shown at the end of a section.
function ReportTotalRow({ label, amount, symbol }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'baseline',
        gap: '8px',
        paddingTop: '10px',
        marginTop: '2px',
      }}
    >
      <span style={{ fontSize: '14px', fontWeight: 700, color: BLACK }}>{label}:</span>
      <span style={{ fontSize: '19px', fontWeight: 700, color: BLACK }}>
        {symbol}{symbol ? ' ' : ''}{formatAmount(amount)}
      </span>
    </div>
  );
}

// One "entity" block — either a resident or the building-expenses group.
// Handles the shared shape: current-month items (all, paid+unpaid),
// a "previous month" sub-section (unpaid only), a total, and a fallback
// "no debt" line when there is nothing at all to show.
function ReportEntitySection({
  currentItems, pastUnpaidItems, symbol,
  emptyLabel, previousLabel, totalLabel,
}) {
  const hasCurrent = currentItems.length > 0;
  const hasPast    = pastUnpaidItems.length > 0;
  const isEmpty    = !hasCurrent && !hasPast;

  const totalUnpaid =
    currentItems.filter(exp => !exp.paid).reduce((sum, exp) => sum + exp.amount, 0) +
    pastUnpaidItems.reduce((sum, exp) => sum + exp.amount, 0);

  if (isEmpty) {
    return (
      <div style={{ padding: '9px 0', fontSize: '13px', color: GRAY, fontStyle: 'italic' }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div>
      {hasCurrent && (
        <div>
          {currentItems.map((exp, idx) => (
            <ReportRow
              key={exp.id}
              description={exp.description}
              amount={exp.amount}
              paid={exp.paid}
              symbol={symbol}
              isFirst={idx === 0}
            />
          ))}
        </div>
      )}

      {hasPast && (
        <div style={{ marginTop: hasCurrent ? '14px' : '0' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: BLACK, marginBottom: '2px' }}>
            {previousLabel}
          </div>
          {pastUnpaidItems.map((exp, idx) => (
            <ReportRow
              key={exp.id}
              description={exp.description}
              amount={exp.amount}
              paid={exp.paid}
              monthLabel={exp.month}
              symbol={symbol}
              isFirst={idx === 0}
            />
          ))}
        </div>
      )}

      <ReportTotalRow label={totalLabel} amount={totalUnpaid} symbol={symbol} />
    </div>
  );
}

// ─── FULL PRINTABLE DOCUMENT ───────────────────────────────────────────────
function ReportDocument({
  t, residents, buildingExpenses,
  currentMonthString, currentMonthKey, isPastExpense,
  activeCurrencySymbol, totalAllDebts,
}) {
  const buildingCurrent = buildingExpenses.filter(exp => exp.monthKey === currentMonthKey);
  const buildingPastUnpaid = buildingExpenses.filter(exp => isPastExpense(exp.monthKey) && !exp.paid);

  return (
    <div
      id="report-page-root"
      style={{
        fontFamily: REPORT_FONT,
        color: BLACK,
        background: '#ffffff',
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '14mm 12mm',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── PAGE HEADER ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '18px' }}>
          <span style={{ fontWeight: 700 }}>{currentMonthString}</span>
          <span style={{ color: GRAY, margin: '0 6px' }}>/</span>
          <span style={{ color: GRAY }}>{t('total_debt')}: </span>
          <span style={{ fontWeight: 700 }}>
            {activeCurrencySymbol}{activeCurrencySymbol ? ' ' : ''}{formatAmount(totalAllDebts)}
          </span>
        </div>
        <SpriteIcon id="neiboard-logo" style={{ height: '26px', width: 'auto', aspectRatio: '91 / 24', color: BLACK }} />
      </div>

      {/* ─── RESIDENTS ───────────────────────────────────────────────── */}
      {residents.map(resident => {
        const currentItems = resident.expenses.filter(exp => exp.monthKey === currentMonthKey);
        const pastUnpaid    = resident.expenses.filter(exp => isPastExpense(exp.monthKey) && !exp.paid);

        return (
          <div key={resident.id} style={{ breakInside: 'avoid', marginBottom: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '19px', fontWeight: 700 }}>{resident.name}</span>
              <span style={{ color: GRAY, fontSize: '13px' }}>/</span>
              <span style={{ color: GRAY, fontSize: '13px' }}>{resident.apartment}</span>
            </div>

            <ReportEntitySection
              currentItems={currentItems}
              pastUnpaidItems={pastUnpaid}
              symbol={activeCurrencySymbol}
              emptyLabel={t('no_debt')}
              previousLabel={t('previous_month_debts')}
              totalLabel={t('total')}
            />
          </div>
        );
      })}

      {/* ─── BUILDING EXPENSES ───────────────────────────────────────── */}
      <div style={{ breakInside: 'avoid', marginTop: '8px' }}>
        <div style={{ fontSize: '19px', fontWeight: 700, marginBottom: '4px', borderTop: `2px solid ${BLACK}`, paddingTop: '18px' }}>
          {t('building_expenses_heading')}
        </div>

        <ReportEntitySection
          currentItems={buildingCurrent}
          pastUnpaidItems={buildingPastUnpaid}
          symbol={activeCurrencySymbol}
          emptyLabel={t('no_expenses_this_month_building')}
          previousLabel={t('previous_month_expenses')}
          totalLabel={t('total')}
        />
      </div>
    </div>
  );
}

// ─── PREVIEW OVERLAY (portal root) ────────────────────────────────────────
// Fixed top bar (Print / Close) + a scrollable gray backdrop holding the
// white A4 page. The bar and backdrop are never printed — the print
// stylesheet above hides everything except #report-page-root itself.
export default function ReportOverlay({
  isOpen, onClose, t,
  residents, buildingExpenses,
  currentMonthString, currentMonthKey, currentYear, currentMonthIdx,
  isPastExpense, activeCurrencySymbol, totalAllDebts,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const originalTitle = document.title;
    return () => { document.title = originalTitle; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const monthNum = String((currentMonthIdx ?? 0) + 1).padStart(2, '0');
    const originalTitle = document.title;
    document.title = `neiboard-report-${currentYear}-${monthNum}`;
    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        background: '#3a3a3a',
      }}
    >
      {/* Preview toolbar — hidden automatically when printing */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px',
          padding: '12px 16px',
          background: '#222222',
          borderBottom: '1px solid #444',
        }}
      >
        <button
          onClick={handlePrint}
          style={{
            height: '40px', padding: '0 20px', borderRadius: '9999px',
            border: 'none', background: '#ffffff', color: '#111111',
            fontFamily: REPORT_FONT, fontWeight: 700, fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {t('pdf')} / {t('print')}
        </button>
        <button
          onClick={onClose}
          style={{
            height: '40px', padding: '0 20px', borderRadius: '9999px',
            border: '1px solid #666', background: 'transparent', color: '#ffffff',
            fontFamily: REPORT_FONT, fontWeight: 600, fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {t('close')}
        </button>
      </div>

      {/* Scrollable preview area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 0' }}>
        <div style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)', width: '210mm', margin: '0 auto' }}>
          <ReportDocument
            t={t}
            residents={residents}
            buildingExpenses={buildingExpenses}
            currentMonthString={currentMonthString}
            currentMonthKey={currentMonthKey}
            isPastExpense={isPastExpense}
            activeCurrencySymbol={activeCurrencySymbol}
            totalAllDebts={totalAllDebts}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
