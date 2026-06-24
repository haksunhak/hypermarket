import type { DashboardFilters } from '../lib/filters';
import { MultiSelectFilter, type SelectOption } from './MultiSelectFilter';

interface Props {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  channelOptions: SelectOption[];
  productOptions: SelectOption[];
  categoryOptions: SelectOption[];
  groupOptions: SelectOption[];
  channelTypeOptions: SelectOption[];
}

export function FilterBar({
  filters,
  onChange,
  channelOptions,
  productOptions,
  categoryOptions,
  groupOptions,
  channelTypeOptions,
}: Props) {
  const set = <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const setMode = (mode: DashboardFilters['dateMode']) => {
    if (mode === filters.dateMode) return;
    if (mode === 'single') {
      // 특정일로 전환: 종료일을 기준으로 하루만 선택된 상태로 맞춘다
      onChange({ ...filters, dateMode: mode, dateFrom: filters.dateTo, dateTo: filters.dateTo });
    } else {
      onChange({ ...filters, dateMode: mode });
    }
  };

  return (
    <div className="filterbar">
      <div className="filter-date">
        <div className="date-mode-toggle">
          <button
            type="button"
            className={filters.dateMode === 'range' ? 'active' : ''}
            onClick={() => setMode('range')}
          >
            기간별
          </button>
          <button
            type="button"
            className={filters.dateMode === 'single' ? 'active' : ''}
            onClick={() => setMode('single')}
          >
            특정일
          </button>
        </div>
        <label>
          시작일
          <input
            type="date"
            value={filters.dateFrom}
            disabled={filters.dateMode === 'single'}
            onChange={(e) => set('dateFrom', e.target.value)}
          />
        </label>
        <label>
          종료일
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) =>
              filters.dateMode === 'single'
                ? onChange({ ...filters, dateFrom: e.target.value, dateTo: e.target.value })
                : set('dateTo', e.target.value)
            }
          />
        </label>
      </div>

      <MultiSelectFilter
        label="채널"
        options={channelTypeOptions}
        selected={filters.channelTypeSelections}
        onChange={(v) => set('channelTypeSelections', v)}
      />
      <MultiSelectFilter
        label="세부 채널"
        options={channelOptions}
        selected={filters.channelSelections}
        onChange={(v) => set('channelSelections', v)}
      />
      <MultiSelectFilter
        label="카테고리"
        options={categoryOptions}
        selected={filters.categorySelections}
        onChange={(v) => set('categorySelections', v)}
      />
      <MultiSelectFilter
        label="품목/브랜드"
        options={productOptions}
        selected={filters.productSelections}
        onChange={(v) => set('productSelections', v)}
      />
      <MultiSelectFilter
        label="그룹"
        options={groupOptions}
        selected={filters.groupSelections}
        onChange={(v) => set('groupSelections', v)}
        single
      />

      <div className="filter-type">
        <label>구분</label>
        <select value={filters.recordType} onChange={(e) => set('recordType', e.target.value as DashboardFilters['recordType'])}>
          <option value="sale">판매</option>
          <option value="gift">사은품</option>
          <option value="all">전체</option>
        </select>
      </div>
    </div>
  );
}
