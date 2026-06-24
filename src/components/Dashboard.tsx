import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  applyFilters,
  buildCategoryOptions,
  buildChannelOptions,
  buildChannelTypeOptions,
  buildGroupOptions,
  buildNonDatePredicate,
  buildProductOptions,
  resolveReportScope,
  type DashboardFilters,
} from '../lib/filters';
import { buildChannelTypeMap, buildDisplayMap, resolveChannelLabel, resolveDisplay } from '../lib/displayNames';
import { buildCostMap } from '../lib/itemCost';
import { FilterBar } from './FilterBar';
import { KpiCards } from './KpiCards';
import { TrendChart } from './TrendChart';
import { BreakdownChart } from './BreakdownChart';
import { DonutChart } from './DonutChart';
import { ItemTrendCharts } from './ItemTrendCharts';
import { ItemDailyDetail } from './ItemDailyDetail';
import { ComparisonCards } from './ComparisonCards';
import { ChannelTypeReportSection } from './ChannelTypeReportSection';
import { DraggableWidgets, type WidgetDef } from './DraggableWidgets';
import { CollapsibleSection } from './CollapsibleSection';

const FILTERS_STORAGE_KEY = 'dashboard-filters';

function loadSavedFilters(): DashboardFilters | null {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DashboardFilters) : null;
  } catch {
    return null;
  }
}

function saveFilters(filters: DashboardFilters) {
  try {
    sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // 저장 실패는 무시 (탭을 옮겼다 돌아오면 기본 상태로 보임)
  }
}

function todayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function Dashboard() {
  const records = useLiveQuery(() => db.records.toArray()) ?? [];
  const channelGroups = useLiveQuery(() => db.channelGroups.toArray()) ?? [];
  const productGroups = useLiveQuery(() => db.productGroups.toArray()) ?? [];
  const displayOverrides = useLiveQuery(() => db.displayNames.toArray()) ?? [];
  const channelTypeAssignments = useLiveQuery(() => db.channelTypes.toArray()) ?? [];
  const itemCosts = useLiveQuery(() => db.itemCosts.toArray()) ?? [];

  const restoredFilters = useMemo(loadSavedFilters, []);

  const [filters, setFilters] = useState<DashboardFilters>(
    restoredFilters ?? {
      dateMode: 'single',
      dateFrom: todayStr(),
      dateTo: todayStr(),
      channelSelections: [],
      productSelections: [],
      categorySelections: [],
      groupSelections: [],
      channelTypeSelections: [],
      recordType: 'sale',
    }
  );

  // 다른 메뉴로 이동했다 돌아와도(컴포넌트가 다시 mount 되어도) 직전 선택이 유지되도록
  // sessionStorage에 저장해둔다 (탭/브라우저를 완전히 닫기 전까지 유지).
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  const handleFiltersChange = (next: DashboardFilters) => {
    setFilters(next);
  };

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

  const channelDisplayMap = useMemo(() => buildDisplayMap(displayOverrides, 'channel'), [displayOverrides]);
  const categoryDisplayMap = useMemo(() => buildDisplayMap(displayOverrides, 'category'), [displayOverrides]);
  const brandDisplayMap = useMemo(() => buildDisplayMap(displayOverrides, 'brand'), [displayOverrides]);
  const channelTypeDisplayMap = useMemo(() => buildDisplayMap(displayOverrides, 'channelType'), [displayOverrides]);
  const channelTypeMap = useMemo(() => buildChannelTypeMap(channelTypeAssignments), [channelTypeAssignments]);
  const costMap = useMemo(() => buildCostMap(itemCosts), [itemCosts]);

  const channelOptions = useMemo(
    () => buildChannelOptions(channelNames, channelDisplayMap, channelTypeMap, channelTypeDisplayMap),
    [channelNames, channelDisplayMap, channelTypeMap, channelTypeDisplayMap]
  );
  const channelTypeOptions = useMemo(
    () => buildChannelTypeOptions(channelTypeDisplayMap),
    [channelTypeDisplayMap]
  );
  const productOptions = useMemo(
    () => buildProductOptions(group3Names, brandDisplayMap),
    [group3Names, brandDisplayMap]
  );
  const categoryOptions = useMemo(
    () => buildCategoryOptions(group2Names, categoryDisplayMap),
    [group2Names, categoryDisplayMap]
  );
  const groupOptions = useMemo(
    () => buildGroupOptions(channelGroups, productGroups),
    [channelGroups, productGroups]
  );

  const filtered = useMemo(
    () => applyFilters(records, filters, channelGroups, productGroups, channelTypeMap),
    [records, filters, channelGroups, productGroups, channelTypeMap]
  );

  // 기간(날짜) 필터를 제외한 나머지 조건만 적용된 데이터 — 비교/일자별 상세 위젯에서
  // 현재 선택된 채널·카테고리·품목·그룹 범위를 유지한 채 다른 날짜를 조회할 때 사용
  const nonDatePredicate = useMemo(
    () => buildNonDatePredicate(filters, channelGroups, productGroups, channelTypeMap),
    [filters, channelGroups, productGroups, channelTypeMap]
  );
  const filteredAllDates = useMemo(
    () => records.filter(nonDatePredicate),
    [records, nonDatePredicate]
  );

  if (records.length === 0) {
    return (
      <div className="panel">
        <h2>대시보드</h2>
        <p className="hint">업로드된 데이터가 없습니다. 먼저 "데이터 업로드" 탭에서 엑셀 파일을 올려주세요.</p>
      </div>
    );
  }

  const reportScope = resolveReportScope(filters, productGroups, brandDisplayMap);

  const widgets: WidgetDef[] = [
    { key: 'kpi', node: <KpiCards records={filtered} /> },
    {
      key: 'comparison',
      node: <ComparisonCards records={filteredAllDates} baseDate={filters.dateTo} />,
    },
  ];

  // 품목/브랜드 또는 그룹을 선택했을 때만, 비교 카드 바로 아래에 판매현황·판매누계와
  // 일자별 상세를 노출한다. 선택 전에는 두 위젯 모두 표시하지 않는다.
  if (reportScope) {
    widgets.push(
      {
        key: 'channel-type-report',
        node: (
          <ChannelTypeReportSection
            records={filteredAllDates}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            scope={reportScope}
            channelTypeMap={channelTypeMap}
            costMap={costMap}
            channelTypeDisplayMap={channelTypeDisplayMap}
          />
        ),
      },
      {
        key: 'item-daily-detail',
        node: <ItemDailyDetail records={filteredAllDates.filter(reportScope.matches)} defaultDate={filters.dateTo} />,
      }
    );
  }

  widgets.push(
    {
      key: 'channel-brand-breakdown',
      node: (
        <div className="chart-row-3">
          <DonutChart
            title="채널별 매출 비중"
            records={filtered}
            groupBy={(r) => resolveChannelLabel(channelDisplayMap, channelTypeMap, r.channelName, channelTypeDisplayMap)}
          />
          <BreakdownChart
            title="채널별 매출 Top 10"
            records={filtered}
            groupBy={(r) => resolveChannelLabel(channelDisplayMap, channelTypeMap, r.channelName, channelTypeDisplayMap)}
          />
          <BreakdownChart
            title="브랜드(품목그룹3)별 매출 Top 10"
            records={filtered}
            groupBy={(r) => resolveDisplay(brandDisplayMap, r.group3)}
          />
        </div>
      ),
    },
    {
      key: 'category-breakdown',
      node: (
        <BreakdownChart
          title="카테고리(품목그룹2)별 매출"
          records={filtered}
          groupBy={(r) => resolveDisplay(categoryDisplayMap, r.group2)}
          topN={13}
        />
      ),
    },
    {
      key: 'trend',
      node: (
        <CollapsibleSection title="일별 매출 추이">
          <TrendChart records={filtered} />
        </CollapsibleSection>
      ),
    },
    {
      key: 'item-trend',
      node: (
        <CollapsibleSection title="품목별 추이">
          <ItemTrendCharts records={filtered} />
        </CollapsibleSection>
      ),
    }
  );

  return (
    <div className="dashboard-wrap">
      <FilterBar
        filters={filters}
        onChange={handleFiltersChange}
        channelOptions={channelOptions}
        productOptions={productOptions}
        categoryOptions={categoryOptions}
        groupOptions={groupOptions}
        channelTypeOptions={channelTypeOptions}
      />
      <p className="hint dashboard-drag-hint">위젯 오른쪽 위 ⠿⠿ 표시를 마우스로 드래그하면 순서를 바꿀 수 있습니다.</p>
      <DraggableWidgets widgets={widgets} />
    </div>
  );
}
