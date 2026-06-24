import { buildComparisons } from '../lib/comparisons';
import type { SaleRecord } from '../types';

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="change-badge neutral">비교 데이터 없음</span>;
  if (pct === 0) return <span className="change-badge neutral">변동 없음</span>;
  const up = pct > 0;
  return (
    <span className={`change-badge ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

interface Props {
  records: SaleRecord[];
  baseDate: string;
}

export function ComparisonCards({ records, baseDate }: Props) {
  const comparisons = buildComparisons(records, baseDate);

  if (comparisons.length === 0) {
    return (
      <div className="panel">
        <h3>전일·전월·전년 비교</h3>
        <p className="hint">기간을 선택하면 비교 결과가 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>전일·전주·전월·전년 비교 (기준일: {baseDate})</h3>
      <p className="hint">
        전일·전주 비교는 월요일이 끼면 직전 토·일 매출을 함께 합산해 비교합니다 (매장 채널 등
        주말 매출이 누락되지 않도록).
      </p>
      <div className="comparison-grid">
        {comparisons.map((c) => (
          <div
            className={`comparison-card${c.changePct !== null ? (c.changePct > 0 ? ' is-up' : c.changePct < 0 ? ' is-down' : '') : ''}`}
            key={c.label}
          >
            <div className="comparison-label">{c.label}</div>
            <div className="comparison-value">{c.currentAmount.toLocaleString('ko-KR')}원</div>
            <div className="comparison-sub">
              {c.currentLabel} vs {c.compareLabel}: {c.compareAmount.toLocaleString('ko-KR')}원
            </div>
            <ChangeBadge pct={c.changePct} />
          </div>
        ))}
      </div>
    </div>
  );
}
