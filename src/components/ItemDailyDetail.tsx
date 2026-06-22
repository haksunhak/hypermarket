import { useEffect, useMemo, useRef, useState } from 'react';
import type { SaleRecord } from '../types';

interface Row {
  itemCode: string;
  itemName: string;
  qty: number;
  amount: number;
}

interface Props {
  records: SaleRecord[]; // 날짜 범위를 제외한 다른 필터가 모두 적용된 레코드
  defaultDate: string;
}

export function ItemDailyDetail({ records, defaultDate }: Props) {
  const [date, setDate] = useState(defaultDate);
  const touched = useRef(false);

  useEffect(() => {
    if (touched.current) return;
    setDate(defaultDate);
  }, [defaultDate]);

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    for (const r of records) {
      if (r.date !== date) continue;
      const row = map.get(r.itemCode) ?? { itemCode: r.itemCode, itemName: r.itemName, qty: 0, amount: 0 };
      row.qty += r.qty;
      row.amount += r.totalAmount;
      map.set(r.itemCode, row);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [records, date]);

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="chart-panel">
      <div className="item-trend-header">
        <h3>선택 품목 일자별 상세</h3>
        <label className="daily-detail-date">
          날짜
          <input
            type="date"
            value={date}
            onChange={(e) => {
              touched.current = true;
              setDate(e.target.value);
            }}
          />
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="hint">해당 날짜에 선택된 조건의 데이터가 없습니다.</p>
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
