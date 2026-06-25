import { useCallback, useMemo } from 'react';
import type { SaleRecord } from '../types';
import { exportDailyDetailToExcel } from '../lib/exportExcel';

interface Row {
  itemCode: string;
  itemName: string;
  qty: number;
  amount: number;
}

interface Props {
  records: SaleRecord[];
  dateFrom: string;
  dateTo: string;
  dateMode: 'single' | 'range';
}

export function ItemDailyDetail({ records, dateFrom, dateTo, dateMode }: Props) {
  const isRange = dateMode === 'range' && dateFrom !== dateTo;

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    for (const r of records) {
      if (isRange ? (r.date < dateFrom || r.date > dateTo) : r.date !== dateTo) continue;
      const row = map.get(r.itemCode) ?? { itemCode: r.itemCode, itemName: r.itemName, qty: 0, amount: 0 };
      row.qty += r.qty;
      row.amount += r.totalAmount;
      map.set(r.itemCode, row);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [records, dateFrom, dateTo, isRange]);

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  const periodLabel = isRange ? `${dateFrom} ~ ${dateTo}` : dateTo;
  const title = isRange ? '선택 품목 기간별 상세' : '선택 품목 일자별 상세';

  const handleDownload = useCallback(() => {
    exportDailyDetailToExcel(rows, title, periodLabel);
  }, [rows, title, periodLabel]);

  return (
    <div className="chart-panel">
      <div className="item-trend-header">
        <h3>{title}</h3>
        <span className="daily-detail-period">{periodLabel}</span>
        {rows.length > 0 && (
          <button type="button" className="velocity-dl-btn" onClick={handleDownload}>
            ⬇ 엑셀 다운로드
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="hint">해당 날짜/기간에 선택된 조건의 데이터가 없습니다.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>품목코드</th>
              <th>품목명</th>
              <th>수량</th>
              <th>판매금액</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.itemCode}>
                <td>{r.itemCode}</td>
                <td>{r.itemName}</td>
                <td className="num">{r.qty.toLocaleString('ko-KR')}</td>
                <td className="num">{r.amount.toLocaleString('ko-KR')}원</td>
              </tr>
            ))}
            <tr className="ctt-subtotal">
              <td colSpan={2}>합계</td>
              <td className="num">{totalQty.toLocaleString('ko-KR')}</td>
              <td className="num">{totalAmount.toLocaleString('ko-KR')}원</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
