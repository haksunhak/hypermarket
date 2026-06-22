import { CHANNEL_TYPES } from '../types';
import type { SaleRecord } from '../types';

const UNASSIGNED = '미지정';

export interface CellMetrics {
  qty: number;
  saleAmount: number;
  cogs: number; // 매출원가(사은품 포함)
}

export interface ItemRow {
  itemCode: string;
  itemName: string;
  cells: Record<string, CellMetrics>; // key: 채널유형 컬럼명
  total: CellMetrics; // 합계 컬럼
}

export interface GroupSection {
  group2: string;
  items: ItemRow[];
  subtotal: Record<string, CellMetrics>;
  subtotalTotal: CellMetrics;
}

export interface ChannelTypeReport {
  columns: string[]; // 합계 제외, 실제 채널유형 컬럼들
  sections: GroupSection[];
  grand: Record<string, CellMetrics>;
  grandTotal: CellMetrics;
}

function emptyCell(): CellMetrics {
  return { qty: 0, saleAmount: 0, cogs: 0 };
}

function addInto(target: CellMetrics, record: SaleRecord, unitCost: number) {
  if (record.type === 'sale') {
    target.qty += record.qty;
    target.saleAmount += record.totalAmount;
  }
  target.cogs += record.qty * unitCost;
}

export function buildChannelTypeReport(
  records: SaleRecord[],
  channelTypeMap: Map<string, string>,
  costMap: Map<string, number>
): ChannelTypeReport {
  const presentColumns = new Set<string>();
  for (const r of records) {
    presentColumns.add(channelTypeMap.get(r.channelName) ?? UNASSIGNED);
  }
  const columns = [
    ...CHANNEL_TYPES.filter((t) => presentColumns.has(t)),
    ...(presentColumns.has(UNASSIGNED) ? [UNASSIGNED] : []),
  ];

  const sectionMap = new Map<string, Map<string, ItemRow>>();

  for (const r of records) {
    const col = channelTypeMap.get(r.channelName) ?? UNASSIGNED;
    const group2 = r.group2 || '(미분류)';
    if (!sectionMap.has(group2)) sectionMap.set(group2, new Map());
    const itemMap = sectionMap.get(group2)!;
    if (!itemMap.has(r.itemCode)) {
      itemMap.set(r.itemCode, {
        itemCode: r.itemCode,
        itemName: r.itemName,
        cells: Object.fromEntries(columns.map((c) => [c, emptyCell()])),
        total: emptyCell(),
      });
    }
    const row = itemMap.get(r.itemCode)!;
    if (!row.cells[col]) row.cells[col] = emptyCell();
    const unitCost = costMap.get(r.itemCode) ?? 0;
    addInto(row.cells[col], r, unitCost);
    addInto(row.total, r, unitCost);
  }

  const sections: GroupSection[] = Array.from(sectionMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group2, itemMap]) => {
      const items = Array.from(itemMap.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
      const subtotal: Record<string, CellMetrics> = Object.fromEntries(columns.map((c) => [c, emptyCell()]));
      const subtotalTotal = emptyCell();
      for (const item of items) {
        for (const c of columns) {
          subtotal[c].qty += item.cells[c]?.qty ?? 0;
          subtotal[c].saleAmount += item.cells[c]?.saleAmount ?? 0;
          subtotal[c].cogs += item.cells[c]?.cogs ?? 0;
        }
        subtotalTotal.qty += item.total.qty;
        subtotalTotal.saleAmount += item.total.saleAmount;
        subtotalTotal.cogs += item.total.cogs;
      }
      return { group2, items, subtotal, subtotalTotal };
    });

  const grand: Record<string, CellMetrics> = Object.fromEntries(columns.map((c) => [c, emptyCell()]));
  const grandTotal = emptyCell();
  for (const section of sections) {
    for (const c of columns) {
      grand[c].qty += section.subtotal[c].qty;
      grand[c].saleAmount += section.subtotal[c].saleAmount;
      grand[c].cogs += section.subtotal[c].cogs;
    }
    grandTotal.qty += section.subtotalTotal.qty;
    grandTotal.saleAmount += section.subtotalTotal.saleAmount;
    grandTotal.cogs += section.subtotalTotal.cogs;
  }

  return { columns, sections, grand, grandTotal };
}

export function marginRate(cell: CellMetrics): number {
  if (cell.saleAmount <= 0) return 0;
  return (cell.saleAmount - cell.cogs) / cell.saleAmount;
}
