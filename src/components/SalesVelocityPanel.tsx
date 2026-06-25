import { useCallback, useMemo, useState } from 'react';
import type { SaleRecord } from '../types';
import type { ReportScope } from '../lib/filters';
import {
  exportVelocityToExcel,
  exportMonthlyVelocityToExcel,
  exportYearlyVelocityToExcel,
} from '../lib/exportExcel';

type ViewMode = 'avg' | 'monthly' | 'yearly';

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
  recentWeekQty: number;
  recentMonthQty: number;
}

interface PivotRow {
  itemCode: string;
  itemName: string;
  data: Record<string, number>;
  total: number;
}

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 7;
  const d1 = new Date(`${from}T00:00:00`);
  const d2 = new Date(`${to}T00:00:00`);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 7;
  return Math.max(7, Math.round((d2.getTime() - d1.getTime()) / 86_400_000) + 1);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtQty(n: number): string {
  if (!Number.isFinite(n)) return '-';
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toLocaleString('ko-KR');
}

function fmtAmt(n: number): string {
  if (!Number.isFinite(n)) return '-';
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만원`;
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

interface Props {
  records: SaleRecord[];
  scope: ReportScope;
  dateFrom: string;
  dateTo: string;
}

export function SalesVelocityPanel({ records, scope, dateFrom, dateTo }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('avg');

  const base = useMemo(
    () => records.filter(r => r.type === 'sale' && scope.matches(r) && r.date && r.date <= dateTo),
    [records, scope, dateTo]
  );

  const recentWeekFrom  = useMemo(() => addDays(dateTo, -6),  [dateTo]);
  const recentMonthFrom = useMemo(() => addDays(dateTo, -29), [dateTo]);

  // ── 판매도 평균 ─────────────────────────────────────────────────────────────
  const avgRows = useMemo<VelocityRow[]>(() => {
    if (base.length === 0) return [];

    const map = new Map<string, {
      name: string; firstDate: string;
      qty: number; amount: number;
      recentWeek: number; recentMonth: number;
    }>();

    for (const r of base) {
      if (!map.has(r.itemCode)) {
        map.set(r.itemCode, {
          name: r.itemName, firstDate: r.date,
          qty: 0, amount: 0, recentWeek: 0, recentMonth: 0,
        });
      }
      const e = map.get(r.itemCode)!;
      if (r.date < e.firstDate) e.firstDate = r.date;
      e.qty     += r.qty;
      e.amount  += r.totalAmount;
      if (r.date >= recentWeekFrom)  e.recentWeek  += r.qty;
      if (r.date >= recentMonthFrom) e.recentMonth += r.qty;
    }

    return [...map.entries()]
      .map(([code, d]) => {
        const days   = daysBetween(d.firstDate, dateTo);
        const weeks  = days / 7;
        const months = days / 30.44;
        return {
          itemCode: code,
          itemName: d.name,
          firstSaleDate: d.firstDate,
          days,
          totalQty: d.qty,
          totalAmount: d.amount,
          weeklyAvgQty:    d.qty    / weeks,
          monthlyAvgQty:   d.qty    / months,
          monthlyAvgAmount: d.amount / months,
          recentWeekQty:  d.recentWeek  / 7,   // 최근 7일 일평균
          recentMonthQty: d.recentMonth / 30,  // 최근 30일 일평균
        };
      })
      .sort((a, b) => b.monthlyAvgQty - a.monthlyAvgQty);
  }, [base, dateTo, recentWeekFrom, recentMonthFrom]);

  // ── 월별 피벗 ───────────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const rangeBase = base.filter(r => r.date >= dateFrom);
    const monthSet  = new Set<string>();
    for (const r of rangeBase) monthSet.add(r.date.slice(0, 7));
    const months = Array.from(monthSet).sort();

    const map = new Map<string, PivotRow>();
    for (const r of rangeBase) {
      const mo = r.date.slice(0, 7);
      if (!map.has(r.itemCode))
        map.set(r.itemCode, { itemCode: r.itemCode, itemName: r.itemName, data: {}, total: 0 });
      const row = map.get(r.itemCode)!;
      row.data[mo] = (row.data[mo] ?? 0) + r.qty;
      row.total    += r.qty;
    }

    const rows = [...map.values()].sort((a, b) => b.total - a.total);
    return { months, rows };
  }, [base, dateFrom]);

  // ── 연간 피벗 ───────────────────────────────────────────────────────────────
  const yearlyData = useMemo(() => {
    const yearSet = new Set<string>();
    for (const r of base) yearSet.add(r.date.slice(0, 4));
    const years = Array.from(yearSet).sort();

    const map = new Map<string, PivotRow>();
    for (const r of base) {
      const yr = r.date.slice(0, 4);
      if (!map.has(r.itemCode))
        map.set(r.itemCode, { itemCode: r.itemCode, itemName: r.itemName, data: {}, total: 0 });
      const row = map.get(r.itemCode)!;
      row.data[yr] = (row.data[yr] ?? 0) + r.qty;
      row.total    += r.qty;
    }

    const rows = [...map.values()].sort((a, b) => b.total - a.total);
    return { years, rows };
  }, [base]);

  const handleDownload = useCallback(() => {
    if (viewMode === 'avg') {
      exportVelocityToExcel(avgRows, `SKU별 판매도 (~${dateTo})`);
    } else if (viewMode === 'monthly') {
      exportMonthlyVelocityToExcel(
        monthlyData.rows, monthlyData.months,
        `SKU별 월별 판매 (${dateFrom}~${dateTo})`
      );
    } else {
      exportYearlyVelocityToExcel(
        yearlyData.rows, yearlyData.years,
        `SKU별 연간 판매 (~${dateTo})`
      );
    }
  }, [viewMode, avgRows, monthlyData, yearlyData, dateFrom, dateTo]);

  if (base.length === 0) return null;

  const subLabel =
    viewMode === 'avg'     ? `첫 판매일 ~ ${dateTo} 기준 평균` :
    viewMode === 'monthly' ? `${dateFrom} ~ ${dateTo} 월별` :
                             `전체 연간 (~${dateTo})`;

  const TAB_LABELS: Record<ViewMode, string> = {
    avg: '판매도 평균', monthly: '월별', yearly: '연간',
  };

  return (
    <div className="chart-panel velocity-panel">
      <div className="item-trend-header">
        <h3>SKU별 판매도</h3>
        <span className="velocity-sub">{subLabel}</span>
        <div className="velocity-tabs">
          {(['avg', 'monthly', 'yearly'] as ViewMode[]).map(m => (
            <button
              key={m} type="button"
              className={`velocity-tab${viewMode === m ? ' velocity-tab--active' : ''}`}
              onClick={() => setViewMode(m)}
            >
              {TAB_LABELS[m]}
            </button>
          ))}
        </div>
        <button type="button" className="velocity-dl-btn" onClick={handleDownload}>
          ⬇ 엑셀
        </button>
      </div>

      {/* ── 판매도 평균 탭 ─────────────────────────────── */}
      {viewMode === 'avg' && (
        <div className="velocity-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>품목코드</th>
                <th>품목명</th>
                <th>첫 판매일</th>
                <th>판매 기간</th>
                <th>총 수량</th>
                <th>주간 평균</th>
                <th>월간 평균</th>
                <th>월간 평균 금액</th>
                <th className="velocity-recent-hd">최근 7일 평균</th>
                <th className="velocity-recent-hd">최근 30일 평균</th>
              </tr>
            </thead>
            <tbody>
              {avgRows.map(r => (
                <tr key={r.itemCode}>
                  <td>{r.itemCode}</td>
                  <td>{r.itemName}</td>
                  <td>{r.firstSaleDate}</td>
                  <td className="num">{r.days}일</td>
                  <td className="num">{r.totalQty.toLocaleString('ko-KR')}</td>
                  <td className="num velocity-avg">{fmtQty(r.weeklyAvgQty)}</td>
                  <td className="num velocity-avg">{fmtQty(r.monthlyAvgQty)}</td>
                  <td className="num velocity-avg">{fmtAmt(r.monthlyAvgAmount)}</td>
                  <td className="num velocity-recent">{fmtQty(r.recentWeekQty)}</td>
                  <td className="num velocity-recent">{fmtQty(r.recentMonthQty)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="ctt-grandtotal">
                <td colSpan={4}>합계</td>
                <td className="num">{avgRows.reduce((s, r) => s + r.totalQty,       0).toLocaleString('ko-KR')}</td>
                <td className="num">{fmtQty(avgRows.reduce((s, r) => s + r.weeklyAvgQty,    0))}</td>
                <td className="num">{fmtQty(avgRows.reduce((s, r) => s + r.monthlyAvgQty,   0))}</td>
                <td className="num">{fmtAmt(avgRows.reduce((s, r) => s + r.monthlyAvgAmount, 0))}</td>
                <td className="num">{fmtQty(avgRows.reduce((s, r) => s + r.recentWeekQty,  0))}</td>
                <td className="num">{fmtQty(avgRows.reduce((s, r) => s + r.recentMonthQty, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── 월별 탭 ────────────────────────────────────── */}
      {viewMode === 'monthly' && (
        <div className="velocity-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>품목코드</th>
                <th>품목명</th>
                {monthlyData.months.map(mo => <th key={mo}>{mo}</th>)}
                <th>합계</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.rows.map(r => (
                <tr key={r.itemCode}>
                  <td>{r.itemCode}</td>
                  <td>{r.itemName}</td>
                  {monthlyData.months.map(mo => (
                    <td key={mo} className="num">
                      {r.data[mo] ? r.data[mo].toLocaleString('ko-KR') : '-'}
                    </td>
                  ))}
                  <td className="num velocity-avg">{r.total.toLocaleString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="ctt-grandtotal">
                <td colSpan={2}>합계</td>
                {monthlyData.months.map(mo => (
                  <td key={mo} className="num">
                    {monthlyData.rows.reduce((s, r) => s + (r.data[mo] ?? 0), 0).toLocaleString('ko-KR')}
                  </td>
                ))}
                <td className="num">
                  {monthlyData.rows.reduce((s, r) => s + r.total, 0).toLocaleString('ko-KR')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── 연간 탭 ────────────────────────────────────── */}
      {viewMode === 'yearly' && (
        <div className="velocity-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>품목코드</th>
                <th>품목명</th>
                {yearlyData.years.map(yr => <th key={yr}>{yr}년</th>)}
                <th>합계</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.rows.map(r => (
                <tr key={r.itemCode}>
                  <td>{r.itemCode}</td>
                  <td>{r.itemName}</td>
                  {yearlyData.years.map(yr => (
                    <td key={yr} className="num">
                      {r.data[yr] ? r.data[yr].toLocaleString('ko-KR') : '-'}
                    </td>
                  ))}
                  <td className="num velocity-avg">{r.total.toLocaleString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="ctt-grandtotal">
                <td colSpan={2}>합계</td>
                {yearlyData.years.map(yr => (
                  <td key={yr} className="num">
                    {yearlyData.rows.reduce((s, r) => s + (r.data[yr] ?? 0), 0).toLocaleString('ko-KR')}
                  </td>
                ))}
                <td className="num">
                  {yearlyData.rows.reduce((s, r) => s + r.total, 0).toLocaleString('ko-KR')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
