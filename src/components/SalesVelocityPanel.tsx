import { useCallback, useMemo } from 'react';
import type { SaleRecord } from '../types';
import type { ReportScope } from '../lib/filters';
import { exportVelocityToExcel } from '../lib/exportExcel';

interface VelocityRow {
  itemCode: string;
  itemName: string;
  firstSaleDate: string;
  days: number;
  totalQty: number;
  totalAmount: number;
  weeklyAvgQty: number;
  monthlyAvgQty: number;
  monthlyAvgAmount: number;
}

function daysBetween(from: string, to: string): number {
  const d1 = new Date(`${from}T00:00:00`);
  const d2 = new Date(`${to}T00:00:00`);
  // 최소 7일(1주) 보장 — 판매 첫날과 조회일이 같을 때 0나누기 방지
  return Math.max(7, Math.round((d2.getTime() - d1.getTime()) / 86_400_000) + 1);
}

function fmtQty(n: number): string {
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toLocaleString('ko-KR');
}

function fmtAmt(n: number): string {
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만원`;
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

interface Props {
  /** 날짜 필터 없이 다른 조건만 적용된 전체 레코드 */
  records: SaleRecord[];
  scope: ReportScope;
  dateTo: string;
}

export function SalesVelocityPanel({ records, scope, dateTo }: Props) {
  const rows = useMemo<VelocityRow[]>(() => {
    // 스코프(선택 품목/그룹) 내 판매 레코드 중 dateTo 이전 데이터 전체 사용
    const base = records.filter(
      r => r.type === 'sale' && scope.matches(r) && r.date <= dateTo
    );
    if (base.length === 0) return [];

    const map = new Map<string, { name: string; firstDate: string; qty: number; amount: number }>();
    for (const r of base) {
      const e = map.get(r.itemCode);
      if (!e) {
        map.set(r.itemCode, { name: r.itemName, firstDate: r.date, qty: r.qty, amount: r.totalAmount });
      } else {
        if (r.date < e.firstDate) e.firstDate = r.date;
        e.qty += r.qty;
        e.amount += r.totalAmount;
      }
    }

    return [...map.entries()]
      .map(([code, d]) => {
        const days = daysBetween(d.firstDate, dateTo);
        const weeks = days / 7;
        const months = days / 30.44;
        return {
          itemCode: code,
          itemName: d.name,
          firstSaleDate: d.firstDate,
          days,
          totalQty: d.qty,
          totalAmount: d.amount,
          weeklyAvgQty: d.qty / weeks,
          monthlyAvgQty: d.qty / months,
          monthlyAvgAmount: d.amount / months,
        };
      })
      .sort((a, b) => b.monthlyAvgQty - a.monthlyAvgQty);
  }, [records, scope, dateTo]);

  const handleDownload = useCallback(() => {
    const title = `SKU별 판매도 (~${dateTo})`;
    exportVelocityToExcel(rows, title);
  }, [rows, dateTo]);

  if (rows.length === 0) return null;

  return (
    <div className="chart-panel velocity-panel">
      <div className="item-trend-header">
        <h3>SKU별 판매도</h3>
        <span className="velocity-sub">첫 판매일 ~ {dateTo} 기준 평균</span>
        <button type="button" className="ctr-download-btn velocity-dl-btn" onClick={handleDownload}>
          ⬇ 엑셀 다운로드
        </button>
      </div>
      <div className="velocity-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>품목코드</th>
              <th>품목명</th>
              <th>첫 판매일</th>
              <th>판매 기간</th>
              <th>총 수량</th>
              <th>주간 평균 수량</th>
              <th>월간 평균 수량</th>
              <th>월간 평균 금액</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.itemCode}>
                <td>{r.itemCode}</td>
                <td>{r.itemName}</td>
                <td>{r.firstSaleDate}</td>
                <td className="num">{r.days}일</td>
                <td className="num">{r.totalQty.toLocaleString('ko-KR')}</td>
                <td className="num velocity-avg">{fmtQty(r.weeklyAvgQty)}</td>
                <td className="num velocity-avg">{fmtQty(r.monthlyAvgQty)}</td>
                <td className="num velocity-avg">{fmtAmt(r.monthlyAvgAmount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="ctt-grandtotal">
              <td colSpan={4}>합계</td>
              <td className="num">{rows.reduce((s, r) => s + r.totalQty, 0).toLocaleString('ko-KR')}</td>
              <td className="num">{fmtQty(rows.reduce((s, r) => s + r.weeklyAvgQty, 0))}</td>
              <td className="num">{fmtQty(rows.reduce((s, r) => s + r.monthlyAvgQty, 0))}</td>
              <td className="num">{fmtAmt(rows.reduce((s, r) => s + r.monthlyAvgAmount, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
