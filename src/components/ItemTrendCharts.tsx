import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SaleRecord } from '../types';
import { MultiSelectFilter, type SelectOption } from './MultiSelectFilter';

const LINE_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

interface Props {
  records: SaleRecord[];
}

export function ItemTrendCharts({ records }: Props) {
  const itemMeta = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) {
      if (r.itemCode && !map.has(r.itemCode)) map.set(r.itemCode, r.itemName);
    }
    return map;
  }, [records]);

  const defaultTop5 = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of records) totals.set(r.itemCode, (totals.get(r.itemCode) ?? 0) + r.totalAmount);
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code);
  }, [records]);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const userTouched = useRef(false);

  useEffect(() => {
    if (userTouched.current || defaultTop5.length === 0) return;
    setSelectedItems(defaultTop5);
  }, [defaultTop5]);

  const handleSelectionChange = (next: string[]) => {
    userTouched.current = true;
    setSelectedItems(next);
  };

  const itemOptions: SelectOption[] = useMemo(
    () =>
      Array.from(itemMeta.entries())
        .map(([code, name]) => ({ value: code, label: `${code} | ${name}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [itemMeta]
  );

  const chartData = useMemo(() => {
    if (selectedItems.length === 0) return { qty: [], amount: [] };
    const dates = Array.from(new Set(records.map((r) => r.date))).sort();
    const selectedSet = new Set(selectedItems);
    const qtyMap = new Map<string, Record<string, number>>();
    const amountMap = new Map<string, Record<string, number>>();
    for (const date of dates) {
      qtyMap.set(date, { date } as unknown as Record<string, number>);
      amountMap.set(date, { date } as unknown as Record<string, number>);
    }
    for (const r of records) {
      if (!selectedSet.has(r.itemCode)) continue;
      const qRow = qtyMap.get(r.date)!;
      const aRow = amountMap.get(r.date)!;
      qRow[r.itemCode] = (qRow[r.itemCode] ?? 0) + r.qty;
      aRow[r.itemCode] = (aRow[r.itemCode] ?? 0) + r.totalAmount;
    }
    return {
      qty: dates.map((d) => qtyMap.get(d)),
      amount: dates.map((d) => amountMap.get(d)),
    };
  }, [records, selectedItems]);

  return (
    <div className="chart-panel">
      <div className="item-trend-header">
        <MultiSelectFilter
          label="추이를 볼 품목"
          options={itemOptions}
          selected={selectedItems}
          onChange={handleSelectionChange}
        />
      </div>
      {selectedItems.length === 0 && <p className="hint">추이를 확인할 품목을 선택하세요.</p>}
      {selectedItems.length > 0 && (
        <div className="chart-row">
          <div>
            <h4 className="item-trend-subtitle">수량 추이</h4>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData.qty}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {selectedItems.map((code, i) => (
                  <Line
                    key={code}
                    type="monotone"
                    dataKey={code}
                    name={itemMeta.get(code) ?? code}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="item-trend-subtitle">매출액 추이</h4>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData.amount}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => Number(Array.isArray(v) ? v[0] : v ?? 0).toLocaleString('ko-KR') + '원'} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {selectedItems.map((code, i) => (
                  <Line
                    key={code}
                    type="monotone"
                    dataKey={code}
                    name={itemMeta.get(code) ?? code}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
