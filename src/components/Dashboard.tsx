import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { applyFilters, buildChannelOptions, buildProductOptions, type DashboardFilters } from '../lib/filters';
import { FilterBar } from './FilterBar';
import { KpiCards } from './KpiCards';
import { TrendChart } from './TrendChart';
import { BreakdownChart } from './BreakdownChart';

function todayMinus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function Dashboard() {
  const records = useLiveQuery(() => db.records.toArray()) ?? [];
  const channelGroups = useLiveQuery(() => db.channelGroups.toArray()) ?? [];
  const productGroups = useLiveQuery(() => db.productGroups.toArray()) ?? [];

  const [filters, setFilters] = useState<DashboardFilters>({
    dateFrom: todayMinus(30),
    dateTo: todayMinus(0),
    channelSelections: [],
    productSelections: [],
    categorySelections: [],
    recordType: 'sale',
  });

  const channelNames = useMemo(
    () => Array.from(new Set(records.map((r) => r.channelName).filter(Boolean))).sort(),
    [records]
  );
  const group3Names = useMemo(
    () => Array.from(new Set(records.map((r) => r.group3).filter(Boolean))).sort(),
    [records]
  );
  const group2Names = useMemo(
    () => Array.from(new Set(records.map((r) => r.group2).filter(Boolean))).sort(),
    [records]
  );

  const channelOptions = useMemo(
    () => buildChannelOptions(channelNames, channelGroups),
    [channelNames, channelGroups]
  );
  const productOptions = useMemo(
    () => buildProductOptions(group3Names, productGroups),
    [group3Names, productGroups]
  );

  const filtered = useMemo(
    () => applyFilters(records, filters, channelGroups, productGroups),
    [records, filters, channelGroups, productGroups]
  );

  if (records.length === 0) {
    return (
      <div className="panel">
        <h2>대시보드</h2>
        <p className="hint">업로드된 데이터가 없습니다. 먼저 "데이터 업로드" 탭에서 엑셀 파일을 올려주세요.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        channelOptions={channelOptions}
        productOptions={productOptions}
        categoryOptions={group2Names}
      />
      <KpiCards records={filtered} />
      <TrendChart records={filtered} />
      <div className="chart-row">
        <BreakdownChart
          title="채널별 매출 Top 10"
          records={filtered}
          groupBy={(r) => r.channelName}
        />
        <BreakdownChart
          title="브랜드(품목그룹3)별 매출 Top 10"
          records={filtered}
          groupBy={(r) => r.group3}
        />
      </div>
      <BreakdownChart
        title="카테고리(품목그룹2)별 매출"
        records={filtered}
        groupBy={(r) => r.group2}
        topN={13}
      />
    </div>
  );
}
