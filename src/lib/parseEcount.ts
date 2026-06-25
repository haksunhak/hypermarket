import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import type { SaleRecord } from '../types';

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i]?.some((c) => String(c).trim() === '창고명')) return i;
  }
  throw new Error('헤더 행을 찾을 수 없습니다 (창고명 컬럼 없음)');
}

function findCol(headers: string[], ...candidates: string[]): number {
  for (const cand of candidates) {
    const idx = headers.findIndex((h) => h.includes(cand));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseEcountDate(raw: unknown): string {
  // Excel이 datetime 객체로 반환하는 경우 (Type B xlsm 파일)
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const mo = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  const s = String(raw).trim();
  const m = s.match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (!m) return '';
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function toNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  const n = Number(String(raw ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function parseEcountWorkbook(file: ArrayBuffer, fileName: string): SaleRecord[] {
  const wb = XLSX.read(file, { type: 'array', cellDates: true }); // cellDates: true → datetime 셀을 Date 객체로 반환
  const results: SaleRecord[] = [];
  const uploadedAt = Date.now();

  // xlsm 매크로 파일은 판매현황 시트만 처리 (DB/law/재고/집계 시트 제외)
  const isXlsm = fileName.toLowerCase().endsWith('.xlsm');
  const sheetNamesToProcess = isXlsm
    ? wb.SheetNames.filter((n) => n.includes('판매현황'))
    : wb.SheetNames;

  for (const sheetName of sheetNamesToProcess) {
    const sheet = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 2) continue;

    let headerRowIdx: number;
    try {
      headerRowIdx = findHeaderRow(rows);
    } catch {
      continue; // 인식 불가능한 시트는 건너뜀
    }
    const headers = rows[headerRowIdx].map((h) => String(h).trim());

    const col = {
      warehouseCode: findCol(headers, '창고코드'),
      warehouseName: findCol(headers, '창고명'),
      channelCode: findCol(headers, '관리항목코드'),
      channelName: findCol(headers, '관리항목명'),
      date: findCol(headers, '일별', '날짜', '일자'), // '날짜'를 '일자' 앞에 — '일자-No.' 오인식 방지
      group1: findCol(headers, '품목그룹1명'),
      group2: findCol(headers, '품목그룹2명'),
      group3: findCol(headers, '품목그룹3명'),
      itemCode: findCol(headers, '품목코드'),
      itemName: findCol(headers, '품목명'),
      qty: findCol(headers, '수량'),
      supplyAmount: findCol(headers, '공급가액'),
      vat: findCol(headers, '부가세'),
      totalAmount: findCol(headers, '합계'),
      gubn: findCol(headers, '구분'), // 판매/사은품 구분 컬럼 (xlsm 파일)
    };

    const isSale = col.supplyAmount !== -1 && col.totalAmount !== -1;

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const itemCode = col.itemCode !== -1 ? String(row[col.itemCode] ?? '').trim() : '';
      if (!itemCode) continue;

      // '구분' 컬럼이 있으면 행별로 판매/사은품 판단, 없으면 기존 시트 단위 판단
      let rowType: SaleRecord['type'];
      if (col.gubn !== -1) {
        const gubnVal = String(row[col.gubn] ?? '').trim();
        rowType = gubnVal === '사은품' ? 'gift' : 'sale';
      } else {
        rowType = isSale ? 'sale' : 'gift';
      }

      const qty = toNumber(row[col.qty]);
      const supplyAmount = isSale ? toNumber(row[col.supplyAmount]) : 0;
      const vat = isSale ? toNumber(row[col.vat]) : 0;
      const totalAmount = isSale ? toNumber(row[col.totalAmount]) : 0;

      results.push({
        id: uuid(),
        date: parseEcountDate(row[col.date]),
        warehouseCode: col.warehouseCode !== -1 ? String(row[col.warehouseCode] ?? '').trim() : '',
        warehouseName: col.warehouseName !== -1 ? String(row[col.warehouseName] ?? '').trim() : '',
        channelCode: col.channelCode !== -1 ? String(row[col.channelCode] ?? '').trim() : '',
        channelName: col.channelName !== -1 ? String(row[col.channelName] ?? '').trim() : '',
        itemCode,
        itemName: col.itemName !== -1 ? String(row[col.itemName] ?? '').trim() : '',
        group1: col.group1 !== -1 ? String(row[col.group1] ?? '').trim() : '',
        group2: col.group2 !== -1 ? String(row[col.group2] ?? '').trim() : '',
        group3: col.group3 !== -1 ? String(row[col.group3] ?? '').trim() : '',
        qty,
        supplyAmount,
        vat,
        totalAmount,
        type: rowType,
        source: `${fileName} / ${sheetName}`,
        uploadedAt,
      });
    }
  }

  return results;
}
