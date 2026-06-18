import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SaleRecord } from '../types';

interface Props {
  title: string;
  records: SaleRecord[];
  groupBy: (r: SaleRecord) => string;
  topN?: number;
}

export function BreakdownChart({ title, records, groupBy, topN = 10 }: Props) {
  const byKey = new Map<string, number>();
  for (const r of records) {
    const key = groupBy(r) || '(미지정)';
    byKey.set(key, (byKey.get(key) ?? 0) + r.totalAmount);
  }
  const data = Array.from(byKey.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, topN);

  return (
    <div className="chart-panel">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => Number(Array.isArray(v) ? v[0] : v ?? 0).toLocaleString('ko-KR') + '원'} />
          <Bar dataKey="amount" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
      {data.length === 0 && <p className="hint">표시할 데이터가 없습니다.</p>}
    </div>
  );
}
