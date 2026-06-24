import { useMemo } from 'react';
import type { SaleRecord } from '../types';
import { computeInsights } from '../lib/insights';

interface Props {
  records: SaleRecord[];
  channelTypeMap: Map<string, string>;
  channelTypeDisplayMap: Map<string, string>;
}

export function InsightsPanel({ records, channelTypeMap, channelTypeDisplayMap }: Props) {
  const cards = useMemo(
    () => computeInsights(records, channelTypeMap, channelTypeDisplayMap),
    [records, channelTypeMap, channelTypeDisplayMap]
  );

  if (cards.length === 0) return null;

  return (
    <div className="panel insights-panel">
      <h3 className="insights-title">★ 인사이트</h3>
      <div className="insights-grid">
        {cards.map((card) => (
          <div key={card.id} className={`insight-card insight-card--${card.type}`}>
            <div className="insight-headline">{card.headline}</div>
            <p className="insight-body">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
