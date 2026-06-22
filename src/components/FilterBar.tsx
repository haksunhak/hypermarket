import { CHANNEL_TYPE_OPTIONS, type DashboardFilters } from '../lib/filters';
import { MultiSelectFilter, type SelectOption } from './MultiSelectFilter';

interface Props {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  channelOptions: SelectOption[];
  productOptions: SelectOption[];
  categoryOptions: SelectOption[];
  groupOptions: SelectOption[];
}

export function FilterBar({
  filters,
  onChange,
  channelOptions,
  productOptions,
  categoryOptions,
  groupOptions,
}: Props) {
  const set = <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="filterbar">
      <div className="filter-date">
        <label>
          시작일
          <input type="date" value={filters.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} />
        </label>
        <label>
          종료일
          <input type="date" value={filters.dateTo} onChange={(e) => set('dateTo', e.target.value)} />
        </label>
      </div>

      <MultiSelectFilter
        label="채널유형"
        options={CHANNEL_TYPE_OPTIONS}
        selected={filters.channelTypeSelections}
        onChange={(v) => set('channelTypeSelections', v)}
      />
      <MultiSelectFilter
        label="채널"
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
