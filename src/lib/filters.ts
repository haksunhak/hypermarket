import { CHANNEL_TYPES } from '../types';
import type { ChannelGroup, ProductGroup, SaleRecord } from '../types';
import type { SelectOption } from '../components/MultiSelectFilter';
import { resolveChannelLabel, resolveDisplay } from './displayNames';

export interface DashboardFilters {
  dateMode: 'range' | 'single'; // 기간별 / 특정일
  dateFrom: string;
  dateTo: string;
  channelSelections: string[]; // raw channelName 값
  productSelections: string[]; // raw group3 값
  categorySelections: string[]; // raw group2 값
  groupSelections: string[]; // `channel::<groupId>` 또는 `product::<groupId>`
  channelTypeSelections: string[]; // 유통사/도매/온라인/매장/기타
  recordType: 'sale' | 'gift' | 'all';
}

export function buildChannelTypeOptions(channelTypeDisplayMap: Map<string, string>): SelectOption[] {
  return CHANNEL_TYPES.map((t, i) => ({
    value: t, // 내부 식별값은 항상 원본 유지 (필터링/저장 로직이 이 값에 의존)
    label: `${i + 1}. ${resolveDisplay(channelTypeDisplayMap, t)}`,
  }));
}

export function buildChannelOptions(
  channelNames: string[],
  displayMap: Map<string, string>,
  channelTypeMap: Map<string, string>,
  channelTypeDisplayMap: Map<string, string>
): SelectOption[] {
  return channelNames.map((n) => ({
    value: n,
    label: resolveChannelLabel(displayMap, channelTypeMap, n, channelTypeDisplayMap),
  }));
}

export function buildProductOptions(group3Names: string[], displayMap: Map<string, string>): SelectOption[] {
  return group3Names.map((n) => ({ value: n, label: resolveDisplay(displayMap, n) }));
}

export function buildCategoryOptions(group2Names: string[], displayMap: Map<string, string>): SelectOption[] {
  return group2Names.map((n) => ({ value: n, label: resolveDisplay(displayMap, n) }));
}

export function buildGroupOptions(channelGroups: ChannelGroup[], productGroups: ProductGroup[]): SelectOption[] {
  return [
    ...channelGroups.map((g) => ({ value: `channel::${g.id}`, label: `[채널그룹] ${g.name}` })),
    ...productGroups.map((g) => ({ value: `product::${g.id}`, label: `[품목그룹] ${g.name}` })),
  ];
}

function matchesGroup(
  record: SaleRecord,
  selections: string[],
  channelGroups: ChannelGroup[],
  productGroups: ProductGroup[]
): boolean {
  if (selections.length === 0) return true;
  return selections.some((sel) => {
    const [kind, id] = sel.split('::');
    if (kind === 'channel') {
      const group = channelGroups.find((g) => g.id === id);
      return group ? group.channelNames.includes(record.channelName) : false;
    }
    if (kind === 'product') {
      const group = productGroups.find((g) => g.id === id);
      return group ? group.itemCodes.includes(record.itemCode) : false;
    }
    return false;
  });
}

export interface ReportScope {
  label: string;
  matches: (record: SaleRecord) => boolean;
}

export function resolveReportScope(
  filters: DashboardFilters,
  productGroups: ProductGroup[],
  brandDisplayMap: Map<string, string>,
  channelGroups?: ChannelGroup[]
): ReportScope | null {
  const productGroupSelections = filters.groupSelections.filter((s) => s.startsWith('product::'));
  const channelGroupSelections = filters.groupSelections.filter((s) => s.startsWith('channel::'));

  if (productGroupSelections.length === 1) {
    const id = productGroupSelections[0].split('::')[1];
    const group = productGroups.find((g) => g.id === id);
    if (group) {
      const codes = new Set(group.itemCodes);
      return { label: group.name, matches: (r) => codes.has(r.itemCode) };
    }
  }
  if (channelGroupSelections.length === 1 && channelGroups) {
    const id = channelGroupSelections[0].split('::')[1];
    const group = channelGroups.find((g) => g.id === id);
    if (group) {
      const names = new Set(group.channelNames);
      return { label: group.name, matches: (r) => names.has(r.channelName) };
    }
  }
  if (filters.productSelections.length === 1) {
    const brand = filters.productSelections[0];
    return { label: resolveDisplay(brandDisplayMap, brand), matches: (r) => r.group3 === brand };
  }
  return null;
}

export function buildNonDatePredicate(
  filters: DashboardFilters,
  channelGroups: ChannelGroup[],
  productGroups: ProductGroup[],
  channelTypeMap: Map<string, string>
): (record: SaleRecord) => boolean {
  return (r) => {
    if (filters.recordType !== 'all' && r.type !== filters.recordType) return false;
    if (filters.categorySelections.length > 0 && !filters.categorySelections.includes(r.group2))
      return false;
    if (filters.channelSelections.length > 0 && !filters.channelSelections.includes(r.channelName))
      return false;
    if (filters.productSelections.length > 0 && !filters.productSelections.includes(r.group3))
      return false;
    if (
      filters.channelTypeSelections.length > 0 &&
      !filters.channelTypeSelections.includes(channelTypeMap.get(r.channelName) ?? '')
    )
      return false;
    if (!matchesGroup(r, filters.groupSelections, channelGroups, productGroups)) return false;
    return true;
  };
}

export function applyFilters(
  records: SaleRecord[],
  filters: DashboardFilters,
  channelGroups: ChannelGroup[],
  productGroups: ProductGroup[],
  channelTypeMap: Map<string, string>
): SaleRecord[] {
  const predicate = buildNonDatePredicate(filters, channelGroups, productGroups, channelTypeMap);
  return records.filter((r) => {
    if (filters.dateFrom && r.date < filters.dateFrom) return false;
    if (filters.dateTo && r.date > filters.dateTo) return false;
    return predicate(r);
  });
}
