import { buildComparisons } from '../lib/comparisons';
import type { SaleRecord } from '../types';

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
        {comparisons.map((c) => {
          const hasData = c.changePct !== null;
          const isUp = hasData && c.changePct! > 0;
          const isDown = hasData && c.changePct! < 0;
          const diff = c.currentAmount - c.compareAmount;
          const diffStr = diff === 0
            ? '변동 없음'
            : `${diff > 0 ? '+' : ''}${diff.toLocaleString('ko-KR')}원`;
          const dirClass = isUp ? ' is-up' : isDown ? ' is-down' : '';

          return (
            <div className={`comparison-card${dirClass}`} key={c.label}>
              <div className="comparison-label">{c.label}</div>
              <div className="comparison-period">
                {c.currentLabel} vs {c.compareLabel}
              </div>
              {hasData ? (
                <>
                  <div className={`comparison-pct${dirClass}`}>
                    {isUp ? '▲' : isDown ? '▼' : '−'}&nbsp;
                    {Math.abs(c.changePct!).toFixed(1)}%
                  </div>
                  <div className={`comparison-diff${dirClass}`}>{diffStr}</div>
                  <div className="comparison-base">
                    비교 기준: {c.compareAmount.toLocaleString('ko-KR')}원
                  </div>
                </>
              ) : (
                <div className="comparison-pct neutral">비교 데이터 없음</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
