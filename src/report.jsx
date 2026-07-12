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

const BLACK = '#000000';
const GRAY  = '#6b6b6b';
const LINE  = '#dddddd';

// Some sprite icons (e.g. icon-warning-filled) are multi-part: one part
// follows `currentColor` (which the `color` style already forces black),
// but other parts reference the app's themed CSS variables directly. This
// object forces every one of those variables to black too, so no icon
// sub-part can ever leak the app's live color theme onto the print-only,
// black-and-white report.
const REPORT_COLOR_OVERRIDE = {
  '--color-text-prim': BLACK, '--color-text-dim': BLACK, '--color-cardback-dim': BLACK,
  '--color-cardback-prim': BLACK, '--color-background': BLACK,
  '--color-accent-1': BLACK, '--color-accent-2': BLACK, '--color-accent-3': BLACK
};

// ─── PRINT / PAGE STYLESHEET (injected once) ─────────────────────────────
// On screen, the interactive preview overlay is what's visible, and the
// print-only clone sits hidden (display:none) elsewhere in the body.
// When printing, we flip that: hide the live app (#root) and the preview
// overlay, and show only the plain, normal-flow print-only clone. Because
// that clone is never nested inside a `position: fixed` / `absolute`
// ancestor, it lays out exactly like ordinary page content and can never
// get clipped by a stray fixed-size wrapper — the browser sizes it purely
// from @page margins.
(function injectReportStyles() {
  let style = document.getElementById('report-print-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'report-print-styles';
    document.head.appendChild(style);
  }
  // Always (re)write the content — never skip — so a stale rule left over
  // from a previous hot-reload/edit can never linger in <head> and quietly
  // hide everything with no matching element left to reveal it.
  style.textContent = `
    .report-print-only { display: none; }
    @media print {
      #root { display: none !important; }
      .report-preview-overlay { display: none !important; }
      .report-print-only { display: block !important; }
    }
    @page {
      size: A4;
      margin: 10mm;
    }
  `;
})();

// ─── SMALL PRESENTATIONAL PIECES ──────────────────────────────────────────

// A single billable line: status icon, description (+ optional month
// sub-label for past-month items), amount — struck through when paid.
function ReportRow({ description, amount, paid, monthLabel, symbol, isFirst }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2 ${isFirst ? '' : 'border-t border-[#dddddd]'}`}
      style={{ breakInside: 'avoid' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
          <SpriteIcon
            id={paid ? 'icon-check' : 'icon-warning-filled'}
            style={{ width: '16px', height: '16px', color: BLACK }}
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span
            className={`text-[13px] font-normal text-black ${paid ? 'line-through' : ''} whitespace-nowrap overflow-hidden text-ellipsis`}
          >
            {description}
          </span>
          {monthLabel && (
            <span className="text-[10.5px] text-[#6b6b6b] mt-0.5">{monthLabel}</span>
          )}
        </div>
      </div>
      <span
        className={`text-[13.5px] font-normal text-black flex-shrink-0 ${paid ? 'line-through' : ''}`}
      >
        {symbol}{symbol ? ' ' : ''}{formatAmount(amount)}
      </span>
    </div>
  );
}

// Right-aligned, larger-font total line shown at the end of a section.
function ReportTotalRow({ label, amount, symbol }) {
  return (
    <div className="flex justify-end items-baseline gap-2 pt-2.5 mt-0.5">
      <span className="text-[14px] font-normal text-black">{label}:</span>
      <span className="text-[19px] font-normal text-black">
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
      <div className="py-2 text-[13px] text-[#6b6b6b] italic">
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
        <div className={hasCurrent ? 'mt-3.5' : ''}>
          <div className="text-[12.5px] font-normal text-black mb-0.5">
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
      style={{
        color: BLACK,
        background: '#ffffff',
        padding: '10mm 8mm',
        boxSizing: 'border-box',
        ...REPORT_COLOR_OVERRIDE,
      }}
    >
      {/* ─── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div className="text-[18px]">
          <span className="font-normal">{currentMonthString}</span>
          <span className="text-[#6b6b6b] mx-1.5">/</span>
          <span className="text-[#6b6b6b]">{t('total_debt')}: </span>
          <span className="font-normal">
            {activeCurrencySymbol}{activeCurrencySymbol ? ' ' : ''}{formatAmount(totalAllDebts)}
          </span>
        </div>
        <SpriteIcon id="neiboard-logo" style={{ height: '40px', width: 'auto', aspectRatio: '91 / 24', color: BLACK }} />
      </div>

      {/* ─── RESIDENTS ───────────────────────────────────────────────── */}
      {residents.map(resident => {
        const currentItems = resident.expenses.filter(exp => exp.monthKey === currentMonthKey);
        const pastUnpaid    = resident.expenses.filter(exp => isPastExpense(exp.monthKey) && !exp.paid);

        return (
          <div key={resident.id} className="break-inside-avoid mb-5.5">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[19px] font-normal">{resident.name}</span>
              <span className="text-[#6b6b6b] text-[13px]">/</span>
              <span className="text-[#6b6b6b] text-[13px]">{resident.apartment}</span>
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
      <div className="break-inside-avoid mt-2">
        <div className="text-[19px] font-normal mb-1 pt-4.5 border-t-2 border-black">
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
// Renders the interactive on-screen preview (fixed toolbar + scrollable
// simulated A4 page) plus a plain, hidden print-only clone. Only the
// print-only clone is ever shown to the printer/PDF engine — see the
// injected stylesheet above.
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

  // Triggers the "Save as PDF" / print flow.
  //
  // On a normal web browser, window.print() opens the browser's own
  // print/PDF dialog and that's the whole story.
  //
  // On Android, once this app is wrapped inside a native app, there is no
  // built-in print dialog inside a WebView — the native Android side has to
  // provide one (using Android's PrintManager) and hand control back to this
  // page. To make that easy to wire up later without changing this file
  // again, this function first looks for a bridge function the native app
  // can install (`window.NativeBridge.printReport`). If that bridge exists,
  // it's used instead of the browser's print dialog. If it doesn't exist
  // (i.e. we're just running in a regular browser, like during development),
  // it falls back to the normal window.print() behavior exactly as before.
  const handlePrint = () => {
    const monthNum = String((currentMonthIdx ?? 0) + 1).padStart(2, '0');
    const suggestedFileName = `neiboard-report-${currentYear}-${monthNum}`;

    if (window.NativeBridge && typeof window.NativeBridge.printReport === 'function') {
      window.NativeBridge.printReport(suggestedFileName);
      return;
    }

    const originalTitle = document.title;
    document.title = suggestedFileName;
    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  return ReactDOM.createPortal(
    <>
      {/* ─── ON-SCREEN INTERACTIVE PREVIEW ──────────────────────────── */}
      <div
        className="report-preview-overlay"
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          background: '#3a3a3a',
        }}
      >
        {/* Preview toolbar — extra top padding reserves space for the
            phone's status bar / camera cutout so the buttons are never
            hidden underneath it (matters most once this runs full-screen
            inside a native Android wrapper). */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px',
            padding: '12px 16px',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            background: '#222222',
            borderBottom: '1px solid #444',
          }}
        >
          <button
            onClick={handlePrint}
            className="h-10 px-5 rounded-full border-none bg-white text-[#111111] font-normal text-[14px] cursor-pointer"
          >
            {t('pdf')} / {t('print')}
          </button>
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-full border border-[#666] bg-transparent text-white font-normal text-[14px] cursor-pointer"
          >
            {t('close')}
          </button>
        </div>

        {/* Scrollable preview area — purely visual, a simulated A4 page */}
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
      </div>

      {/* ─── PRINT-ONLY CLONE ────────────────────────────────────────── */}
      {/* Hidden (display:none) at all times on screen. Lives in plain,
          normal document flow — no fixed/absolute ancestor — so when the
          print stylesheet flips it to display:block for printing, the
          browser sizes it purely from the @page margin, and it can never
          be clipped by a stray fixed-width wrapper. */}
      <div className="report-print-only">
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
    </>,
    document.body
  );
}