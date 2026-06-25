import * as XLSX from 'xlsx';
import type { ChannelTypeReport, CellMetrics } from './channelTypeReport';
import { marginRate } from './channelTypeReport';

type CellVal = string | number | null;

function pct(cell: CellMetrics): string {
  const r = marginRate(cell);
  return r === 0 ? '' : `${Math.round(r * 100)}%`;
}

function n(v: number): number | string {
  return v === 0 ? '' : v;
}

/**
 * HTML 테이블과 동일한 구조 (셀 병합 포함) 로 엑셀 파일 생성
 *
 * 레이아웃:
 *   행 0 : 타이틀 (전체 열 병합)
 *   행 1 : 판매처(rowspan=2) | 품명(rowspan=2) | 채널1(colspan=4) | … | 합계(colspan=4)
 *   행 2 : 수량 | 판매금액 | 매출원가 | 판매이익률  (각 채널+합계 반복)
 *   행 3~ : 데이터 (그룹별 판매처 rowspan, 소계 행, 누계 행)
 */
export function exportChannelTypeReportToExcel(report: ChannelTypeReport, title: string) {
  const { columns, sections, grand, grandTotal } = report;

  // 열 구성: 판매처(0), 품명(1), [채널0..n](2~), 합계(last 4)
  const numCols = 2 + (columns.length + 1) * 4;
  const chStart = (ci: number) => 2 + ci * 4;        // 채널 i 의 첫 번째 열 인덱스
  const sumStart = 2 + columns.length * 4;             // 합계 열 시작 인덱스
  const SUB = ['수량', '판매금액', '매출원가', '판매이익률'];

  const rows: CellVal[][] = [];
  const merges: XLSX.Range[] = [];

  const emptyRow = (): CellVal[] => new Array(numCols).fill(null);

  // ── 행 0: 타이틀 ──────────────────────────────────────
  const r0 = emptyRow();
  r0[0] = title;
  rows.push(r0);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } });

  // ── 행 1: 1단 헤더 ────────────────────────────────────
  const r1 = emptyRow();
  r1[0] = '판매처';
  r1[1] = '품명';
  columns.forEach((col, ci) => { r1[chStart(ci)] = col; });
  r1[sumStart] = '합계';
  rows.push(r1);

  // 병합: 판매처/품명 rowspan=2
  merges.push({ s: { r: 1, c: 0 }, e: { r: 2, c: 0 } });
  merges.push({ s: { r: 1, c: 1 }, e: { r: 2, c: 1 } });
  // 채널 각각 colspan=4
  columns.forEach((_, ci) => {
    const cs = chStart(ci);
    merges.push({ s: { r: 1, c: cs }, e: { r: 1, c: cs + 3 } });
  });
  // 합계 colspan=4
  merges.push({ s: { r: 1, c: sumStart }, e: { r: 1, c: sumStart + 3 } });

  // ── 행 2: 2단 헤더 ────────────────────────────────────
  const r2 = emptyRow();
  for (let ci = 0; ci <= columns.length; ci++) {
    const cs = ci < columns.length ? chStart(ci) : sumStart;
    SUB.forEach((sh, j) => { r2[cs + j] = sh; });
  }
  rows.push(r2);

  // ── 행 3~: 데이터 ─────────────────────────────────────
  let ri = 3; // 현재 행 인덱스

  for (const section of sections) {
    const sectionRowStart = ri;
    const rowSpan = section.items.length + 1; // items + 소계

    // 판매처(group2) 셀: 아이템 수 + 소계 행 만큼 병합
    merges.push({
      s: { r: sectionRowStart, c: 0 },
      e: { r: sectionRowStart + rowSpan - 1, c: 0 },
    });

    // 아이템 행
    for (let i = 0; i < section.items.length; i++) {
      const item = section.items[i];
      const row = emptyRow();
      if (i === 0) row[0] = section.group2;
      row[1] = item.itemName;
      columns.forEach((col, ci) => {
        const cs = chStart(ci);
        const cell = item.cells[col] ?? { qty: 0, saleAmount: 0, cogs: 0 };
        row[cs]     = n(cell.qty);
        row[cs + 1] = n(cell.saleAmount);
        row[cs + 2] = n(cell.cogs);
        row[cs + 3] = pct(cell);
      });
      row[sumStart]     = n(item.total.qty);
      row[sumStart + 1] = n(item.total.saleAmount);
      row[sumStart + 2] = n(item.total.cogs);
      row[sumStart + 3] = pct(item.total);
      rows.push(row);
      ri++;
    }

    // 소계 행
    const subRow = emptyRow();
    subRow[1] = '소계';
    columns.forEach((col, ci) => {
      const cs = chStart(ci);
      const cell = section.subtotal[col];
      subRow[cs]     = n(cell.qty);
      subRow[cs + 1] = n(cell.saleAmount);
      subRow[cs + 2] = n(cell.cogs);
      subRow[cs + 3] = pct(cell);
    });
    subRow[sumStart]     = n(section.subtotalTotal.qty);
    subRow[sumStart + 1] = n(section.subtotalTotal.saleAmount);
    subRow[sumStart + 2] = n(section.subtotalTotal.cogs);
    subRow[sumStart + 3] = pct(section.subtotalTotal);
    rows.push(subRow);
    ri++;
  }

  // 누계 행 (판매처+품명 열 병합)
  const grandRow = emptyRow();
  grandRow[0] = '누계';
  merges.push({ s: { r: ri, c: 0 }, e: { r: ri, c: 1 } });
  columns.forEach((col, ci) => {
    const cs = chStart(ci);
    const cell = grand[col];
    grandRow[cs]     = n(cell.qty);
    grandRow[cs + 1] = n(cell.saleAmount);
    grandRow[cs + 2] = n(cell.cogs);
    grandRow[cs + 3] = pct(cell);
  });
  grandRow[sumStart]     = n(grandTotal.qty);
  grandRow[sumStart + 1] = n(grandTotal.saleAmount);
  grandRow[sumStart + 2] = n(grandTotal.cogs);
  grandRow[sumStart + 3] = pct(grandTotal);
  rows.push(grandRow);

  // ── 시트 생성 ─────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;

  // 열 너비
  ws['!cols'] = [
    { wch: 16 }, // 판매처
    { wch: 30 }, // 품명
    ...Array.from({ length: (columns.length + 1) * 4 }, () => ({ wch: 12 })),
  ];

  // 행 높이 (타이틀 행)
  ws['!rows'] = [{ hpt: 22 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '판매현황');
  XLSX.writeFile(wb, `${title}.xlsx`);
}

// ── SKU별 판매도 내보내기 ──────────────────────────────────────────────────────

interface VelocityRowExport {
  itemCode: string;
  itemName: string;
  firstSaleDate: string;
  days: number;
  totalQty: number;
  weeklyAvgQty: number;
  monthlyAvgQty: number;
  monthlyAvgAmount: number;
}

function fmtQtyExcel(n: number): string {
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toString();
}

export function exportVelocityToExcel(rows: VelocityRowExport[], title: string) {
  const headers = ['품목코드', '품목명', '첫 판매일', '판매 기간(일)', '총 수량', '주간 평균 수량', '월간 평균 수량', '월간 평균 금액'];
  const numCols = headers.length;

  const data: (string | number | null)[][] = [];
  const merges: XLSX.Range[] = [];

  // 행 0: 타이틀
  const r0: (string | number | null)[] = new Array(numCols).fill(null);
  r0[0] = title;
  data.push(r0);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } });

  // 행 1: 헤더
  data.push(headers);

  // 행 2~: 데이터
  for (const row of rows) {
    data.push([
      row.itemCode,
      row.itemName,
      row.firstSaleDate,
      row.days,
      row.totalQty,
      Number(fmtQtyExcel(row.weeklyAvgQty)),
      Number(fmtQtyExcel(row.monthlyAvgQty)),
      Math.round(row.monthlyAvgAmount),
    ]);
  }

  // 합계 행
  const totQty = rows.reduce((s, r) => s + r.totalQty, 0);
  const totWeekly = rows.reduce((s, r) => s + r.weeklyAvgQty, 0);
  const totMonthly = rows.reduce((s, r) => s + r.monthlyAvgQty, 0);
  const totMonthlyAmt = rows.reduce((s, r) => s + r.monthlyAvgAmount, 0);
  const ri = data.length;
  const footRow: (string | number | null)[] = new Array(numCols).fill(null);
  footRow[0] = '합계';
  merges.push({ s: { r: ri, c: 0 }, e: { r: ri, c: 4 } });
  footRow[4] = totQty;
  footRow[5] = Number(fmtQtyExcel(totWeekly));
  footRow[6] = Number(fmtQtyExcel(totMonthly));
  footRow[7] = Math.round(totMonthlyAmt);
  data.push(footRow);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SKU별 판매도');
  XLSX.writeFile(wb, `${title}.xlsx`);
}

// ── 선택 품목 일자별/기간별 상세 내보내기 ─────────────────────────────────────

interface DailyDetailRowExport {
  itemCode: string;
  itemName: string;
  qty: number;
  amount: number;
}

export function exportDailyDetailToExcel(rows: DailyDetailRowExport[], title: string, period: string) {
  const headers = ['품목코드', '품목명', '수량', '판매금액'];
  const numCols = headers.length;

  const data: (string | number | null)[][] = [];
  const merges: XLSX.Range[] = [];

  // 행 0: 타이틀
  const r0: (string | number | null)[] = new Array(numCols).fill(null);
  r0[0] = `${title} (${period})`;
  data.push(r0);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } });

  // 행 1: 헤더
  data.push(headers);

  // 행 2~: 데이터
  for (const row of rows) {
    data.push([row.itemCode, row.itemName, row.qty, row.amount]);
  }

  // 합계 행
  const totQty = rows.reduce((s, r) => s + r.qty, 0);
  const totAmt = rows.reduce((s, r) => s + r.amount, 0);
  const ri = data.length;
  const footRow: (string | number | null)[] = new Array(numCols).fill(null);
  footRow[0] = '합계';
  merges.push({ s: { r: ri, c: 0 }, e: { r: ri, c: 1 } });
  footRow[2] = totQty;
  footRow[3] = totAmt;
  data.push(footRow);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '품목상세');
  XLSX.writeFile(wb, `${title} ${period}.xlsx`);
}

// ── SKU별 월별/연간 피벗 내보내기 ───────────────────────────────────────────────

interface PivotRowExport {
  itemCode: string;
  itemName: string;
  data: Record<string, number>;
  total: number;
}

function exportPivotToExcel(
  rows: PivotRowExport[],
  keys: string[],           // 월(YYYY-MM) 또는 연(YYYY)
  title: string,
  sheetName: string,
  keyLabel: (k: string) => string
) {
  const numCols = 2 + keys.length + 1; // 품목코드 + 품목명 + keys + 합계
  const data: (string | number | null)[][] = [];
  const merges: XLSX.Range[] = [];

  // 행 0: 타이틀
  const r0: (string | number | null)[] = new Array(numCols).fill(null);
  r0[0] = title;
  data.push(r0);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } });

  // 행 1: 헤더
  data.push(['품목코드', '품목명', ...keys.map(keyLabel), '합계']);

  // 행 2~: 데이터
  for (const row of rows) {
    data.push([
      row.itemCode,
      row.itemName,
      ...keys.map(k => row.data[k] ?? 0),
      row.total,
    ]);
  }

  // 합계 행
  const ri = data.length;
  const foot: (string | number | null)[] = new Array(numCols).fill(null);
  foot[0] = '합계';
  merges.push({ s: { r: ri, c: 0 }, e: { r: ri, c: 1 } });
  keys.forEach((k, i) => {
    foot[2 + i] = rows.reduce((s, r) => s + (r.data[k] ?? 0), 0);
  });
  foot[numCols - 1] = rows.reduce((s, r) => s + r.total, 0);
  data.push(foot);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    ...keys.map(() => ({ wch: 10 })),
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${title}.xlsx`);
}

export function exportMonthlyVelocityToExcel(
  rows: PivotRowExport[],
  months: string[],
  title: string
) {
  exportPivotToExcel(rows, months, title, '월별판매', k => k);
}

export function exportYearlyVelocityToExcel(
  rows: PivotRowExport[],
  years: string[],
  title: string
) {
  exportPivotToExcel(rows, years, title, '연간판매', k => `${k}년`);
}
