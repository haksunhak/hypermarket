import * as XLSX from 'xlsx';
import type { ChannelTypeReport, CellMetrics } from './channelTypeReport';
import { marginRate } from './channelTypeReport';

function pct(cell: CellMetrics): string {
  return `${Math.round(marginRate(cell) * 100)}%`;
}

export function exportChannelTypeReportToExcel(report: ChannelTypeReport, title: string) {
  const { columns, sections, grand, grandTotal } = report;
  const rows: (string | number)[][] = [];

  // 헤더 1행: 판매처 | 품명 | [채널유형 colSpan=4] ... | 합계
  const h1: string[] = ['판매처', '품명'];
  for (const c of columns) h1.push(c, '', '', '');
  h1.push('합계', '', '', '');
  rows.push(h1);

  // 헤더 2행: 수량 | 판매금액 | 매출원가 | 판매이익률 (각 채널유형+합계)
  const h2: string[] = ['', ''];
  const subHeaders = ['수량', '판매금액', '매출원가', '판매이익률'];
  for (let i = 0; i < columns.length + 1; i++) h2.push(...subHeaders);
  rows.push(h2);

  // 데이터 행
  for (const section of sections) {
    for (let i = 0; i < section.items.length; i++) {
      const item = section.items[i];
      const row: (string | number)[] = [i === 0 ? section.group2 : '', item.itemName];
      for (const c of columns) {
        const cell = item.cells[c] ?? { qty: 0, saleAmount: 0, cogs: 0 };
        row.push(cell.qty, cell.saleAmount, cell.cogs, pct(cell));
      }
      row.push(item.total.qty, item.total.saleAmount, item.total.cogs, pct(item.total));
      rows.push(row);
    }
    // 소계 행
    const sub: (string | number)[] = ['소계', ''];
    for (const c of columns) {
      const cell = section.subtotal[c];
      sub.push(cell.qty, cell.saleAmount, cell.cogs, pct(cell));
    }
    sub.push(section.subtotalTotal.qty, section.subtotalTotal.saleAmount, section.subtotalTotal.cogs, pct(section.subtotalTotal));
    rows.push(sub);
  }

  // 누계 행
  const gr: (string | number)[] = ['누계', ''];
  for (const c of columns) {
    const cell = grand[c];
    gr.push(cell.qty, cell.saleAmount, cell.cogs, pct(cell));
  }
  gr.push(grandTotal.qty, grandTotal.saleAmount, grandTotal.cogs, pct(grandTotal));
  rows.push(gr);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // 열 너비 설정
  const colWidths = [{ wch: 14 }, { wch: 28 }];
  for (let i = 0; i < (columns.length + 1) * 4; i++) colWidths.push({ wch: 12 });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '판매현황');
  XLSX.writeFile(wb, `${title}.xlsx`);
}
