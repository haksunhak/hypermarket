import type { SaleRecord } from '../types';

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export function KpiCards({ records }: { records: SaleRecord[] }) {
  const totalAmount = records.reduce((s, r) => s + r.totalAmount, 0);
  const totalQty = records.reduce((s, r) => s + r.qty, 0);
  const txCount = records.length;
  const channelCount = new Set(records.map((r) => r.channelName)).size;
  const itemCount = new Set(records.map((r) => r.itemCode)).size;
  const dayCount = new Set(records.map((r) => r.date)).size;
  const avgDaily = dayCount > 0 ? totalAmount / dayCount : 0;

  const cards = [
    { label: '총 매출액', value: formatKRW(totalAmount) },
    { label: '일평균 매출', value: formatKRW(Math.round(avgDaily)) },
    { label: '총 판매수량', value: totalQty.toLocaleString('ko-KR') + '개' },
    { label: '거래 건수', value: txCount.toLocaleString('ko-KR') + '건' },
    { label: '활성 채널 수', value: channelCount.toLocaleString('ko-KR') + '개' },
    { label: '활성 품목 수', value: itemCount.toLocaleString('ko-KR') + '개' },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <div className="kpi-card" key={c.label}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
