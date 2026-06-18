import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SaleRecord } from '../types';

export function TrendChart({ records }: { records: SaleRecord[] }) {
  const byDate = new Map<string, { date: string; amount: number; qty: number }>();
  for (const r of records) {
    const entry = byDate.get(r.date) ?? { date: r.date, amount: 0, qty: 0 };
    entry.amount += r.totalAmount;
    entry.qty += r.qty;
    byDate.set(r.date, entry);
  }
  const data = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="chart-panel">
      <h3>일별 매출 추이</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => Number(Array.isArray(v) ? v[0] : v ?? 0).toLocaleString('ko-KR') + '원'} />
          <Line type="monotone" dataKey="amount" name="매출액" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      {data.length === 0 && <p className="hint">표시할 데이터가 없습니다.</p>}
    </div>
  );
}
