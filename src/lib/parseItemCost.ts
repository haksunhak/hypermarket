import * as XLSX from 'xlsx';
import type { ItemCost } from '../types';

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i]?.some((c) => ['품목코드', '바코드'].some((k) => String(c).trim().includes(k)))) return i;
  }
  throw new Error('헤더 행을 찾을 수 없습니다 (품목코드/바코드 컬럼 없음)');
}

function findCol(headers: string[], ...candidates: string[]): number {
  for (const cand of candidates) {
    const idx = headers.findIndex((h) => h.includes(cand));
    if (idx !== -1) return idx;
  }
  return -1;
}

function toNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  const n = Number(String(raw ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function parseItemCostWorkbook(file: ArrayBuffer): ItemCost[] {
  const wb = XLSX.read(file, { type: 'array' });
  const results: ItemCost[] = [];
  const uploadedAt = Date.now();

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 2) continue;

    let headerRowIdx: number;
    try {
      headerRowIdx = findHeaderRow(rows);
    } catch {
      continue;
    }
    const headers = rows[headerRowIdx].map((h) => String(h).trim());

    // 이카운트 판매 데이터의 품목코드는 바코드 값과 동일하게 쓰이므로, 원가 파일이
    // "바코드" 컬럼만 갖고 있어도 같은 itemCode 기준으로 매칭되도록 둘 다 인식한다.
    const col = {
      itemCode: findCol(headers, '품목코드', '바코드'),
      itemName: findCol(headers, '품목명'),
      unitCost: findCol(headers, '매입단가', '입고단가', '원가', '단가'),
    };
    if (col.itemCode === -1 || col.unitCost === -1) continue;

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const itemCode = String(row[col.itemCode] ?? '').trim();
      if (!itemCode) continue;
      results.push({
        id: itemCode,
        itemCode,
        itemName: col.itemName !== -1 ? String(row[col.itemName] ?? '').trim() : '',
        unitCost: toNumber(row[col.unitCost]),
        uploadedAt,
      });
    }
  }

  return results;
}
