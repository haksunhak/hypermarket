import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { SaleRecord } from '../types';

const DONUT_COLORS = ['#60a5fa', '#2563eb', '#f472b6', '#fb923c', '#34d399', '#a78bfa', '#facc15', '#94a3b8'];

interface Props {
  title: string;
  records: SaleRecord[];
  groupBy: (r: SaleRecord) => string;
  topN?: number;
}

export function DonutChart({ title, records, groupBy, topN = 6 }: Props) {
  const totals = new Map<string, number>();
  for (const r of records) {
    const key = groupBy(r) || '(미지정)';
    totals.set(key, (totals.get(key) ?? 0) + r.totalAmount);
  }
  const sorted = Array.from(totals.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const top = sorted.slice(0, topN);
  const restSum = sorted.slice(topN).reduce((s, [, v]) => s + v, 0);
  const data = restSum > 0 ? [...top, ['기타', restSum] as [string, number]] : top;

  const grandTotal = data.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="chart-panel donut-panel">
      <h3>{title}</h3>
      {data.length === 0 ? (
        <p className="hint">표시할 데이터가 없습니다.</p>
      ) : (
        <div className="donut-body">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.map(([name, value]) => ({ name, value }))}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {data.map(([name], i) => (
                  <Cell key={name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => Number(Array.isArray(v) ? v[0] : v ?? 0).toLocaleString('ko-KR') + '원'} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="donut-legend">
            {data.map(([name, value], i) => (
              <li key={name}>
                <span className="donut-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="donut-legend-name">{name}</span>
                <span className="donut-legend-pct">
                  {grandTotal > 0 ? ((value / grandTotal) * 100).toFixed(1) : '0'}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
