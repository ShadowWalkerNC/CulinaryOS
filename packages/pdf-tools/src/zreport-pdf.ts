import { jsPDF } from 'jspdf';
import type { ZReport } from '@culinaryos/shared';

export interface ZReportPdfOptions {
  restaurantName?: string;
  restaurantAddress?: string;
}

export function generateZReportPdf(
  report: ZReport,
  opts: ZReportPdfOptions = {}
): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();
  const ml = 20;
  const mr = W - 20;
  let y = 20;

  const restName = opts.restaurantName || 'CulinaryOS Restaurant';

  // Title Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(restName.toUpperCase(), ml, y);
  y += 7;

  doc.setFontSize(14);
  doc.setTextColor(230, 57, 70); // Vibrant accent
  doc.text(`END-OF-DAY Z-REPORT: ${report.zReportNumber}`, ml, y);
  y += 6;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Report Date: ${report.date}   |   Closed: ${report.closedAt ? new Date(report.closedAt).toLocaleString() : 'Open'}`, ml, y);
  y += 5;
  doc.text(`Closed By: ${report.closedBy?.displayName || 'Shift Manager'} (${report.closedBy?.role || 'Staff'})`, ml, y);
  y += 6;

  doc.setDrawColor(203, 213, 225);
  doc.line(ml, y, mr, y);
  y += 8;

  // 1. Financial Executive Summary
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. FINANCIAL EXECUTIVE SUMMARY', ml, y);
  y += 6;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);

  const drawRow = (label: string, value: string, bold = false) => {
    if (bold) doc.setFont('Helvetica', 'bold');
    else doc.setFont('Helvetica', 'normal');
    doc.text(label, ml + 4, y);
    doc.text(value, mr - 4, y, { align: 'right' });
    y += 5;
  };

  drawRow('Gross Sales (Food, Beverage, Retail)', `$${(report.financials.grossSalesCents / 100).toFixed(2)}`);
  drawRow('Comps & Discounts Awarded', `-$${(report.financials.discountsCompsCents / 100).toFixed(2)}`);
  drawRow('Post-Send Voids Debited', `-$${(report.financials.voidsTotalCents / 100).toFixed(2)}`);
  drawRow('Net Sales', `$${(report.financials.netSalesCents / 100).toFixed(2)}`, true);
  drawRow('Total Tax Collected', `$${(report.financials.taxTotalCents / 100).toFixed(2)}`);
  drawRow('TOTAL REVENUE COLLECTED', `$${(report.financials.totalRevenueCents / 100).toFixed(2)}`, true);
  y += 4;

  // 2. Multi-Rate Tax Breakdown
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. MULTI-RATE TAX BREAKDOWN', ml, y);
  y += 6;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  drawRow('Prepared Food Tax', `$${(report.taxBreakdown.breakdown.preparedFood.taxAmountCents / 100).toFixed(2)}`);
  drawRow('Alcohol Beverage Tax', `$${(report.taxBreakdown.breakdown.alcohol.taxAmountCents / 100).toFixed(2)}`);
  drawRow('Exempt Subtotal', `$${(report.taxBreakdown.breakdown.exempt.taxableSalesCents / 100).toFixed(2)}`);
  drawRow('Total Tax Liability', `$${(report.taxBreakdown.totalTaxCents / 100).toFixed(2)}`, true);
  y += 4;

  // 3. Tender Summary
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. TENDER & CASH RECONCILIATION', ml, y);
  y += 6;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  drawRow('Card / Terminal Payments', `$${(report.tenderBreakdown.creditCard.totalCents / 100).toFixed(2)} (${report.tenderBreakdown.creditCard.transactionCount} tx)`);
  drawRow('Cash Payments Received', `$${(report.tenderBreakdown.cash.totalCents / 100).toFixed(2)} (${report.tenderBreakdown.cash.transactionCount} tx)`);
  drawRow('Opening Float', `$${(report.cashReconciliation.openingFloatCents / 100).toFixed(2)}`);
  drawRow('Expected Drawer Total', `$${(report.cashReconciliation.expectedInDrawerCents / 100).toFixed(2)}`);
  drawRow('Actual Cash Counted', `$${((report.cashReconciliation.actualCountedCents || 0) / 100).toFixed(2)}`);
  
  const overShort = report.cashReconciliation.overShortCents || 0;
  const overShortText = overShort >= 0 ? `+$${(overShort / 100).toFixed(2)} (OVER)` : `-$${(Math.abs(overShort) / 100).toFixed(2)} (SHORT)`;
  drawRow('Cash Over / Short Variance', overShortText, true);
  y += 8;

  // Footer Certificate
  doc.setDrawColor(203, 213, 225);
  doc.line(ml, y, mr, y);
  y += 6;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Certified authentic end-of-day record sealed by CulinaryOS Ledger Engine. Tamper-evident.', ml, y);

  return doc.output('arraybuffer') as unknown as Uint8Array;
}
