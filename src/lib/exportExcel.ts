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
