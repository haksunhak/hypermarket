import type { ChannelGroup, ProductGroup, SaleRecord } from '../types';

export const GROUP_PREFIX = '[그룹] ';

export interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
  channelSelections: string[]; // raw channelName 값 또는 `[그룹] 이름`
  productSelections: string[]; // raw group3 값 또는 `[그룹] 이름`
  categorySelections: string[]; // raw group2 값
  recordType: 'sale' | 'gift' | 'all';
}

export function buildChannelOptions(channelNames: string[], channelGroups: ChannelGroup[]) {
  return [...channelGroups.map((g) => `${GROUP_PREFIX}${g.name}`), ...channelNames];
}

export function buildProductOptions(group3Names: string[], productGroups: ProductGroup[]) {
  return [...productGroups.map((g) => `${GROUP_PREFIX}${g.name}`), ...group3Names];
}

function matchesChannel(
  record: SaleRecord,
  selections: string[],
  channelGroups: ChannelGroup[]
): boolean {
  if (selections.length === 0) return true;
  return selections.some((sel) => {
    if (sel.startsWith(GROUP_PREFIX)) {
      const group = channelGroups.find((g) => g.name === sel.slice(GROUP_PREFIX.length));
      return group ? group.channelNames.includes(record.channelName) : false;
    }
    return record.channelName === sel;
  });
}

function matchesProduct(
  record: SaleRecord,
  selections: string[],
  productGroups: ProductGroup[]
): boolean {
  if (selections.length === 0) return true;
  return selections.some((sel) => {
    if (sel.startsWith(GROUP_PREFIX)) {
      const group = productGroups.find((g) => g.name === sel.slice(GROUP_PREFIX.length));
      return group ? group.itemCodes.includes(record.itemCode) : false;
    }
    return record.group3 === sel;
  });
}

export function applyFilters(
  records: SaleRecord[],
  filters: DashboardFilters,
  channelGroups: ChannelGroup[],
  productGroups: ProductGroup[]
): SaleRecord[] {
  return records.filter((r) => {
    if (filters.dateFrom && r.date < filters.dateFrom) return false;
    if (filters.dateTo && r.date > filters.dateTo) return false;
    if (filters.recordType !== 'all' && r.type !== filters.recordType) return false;
    if (filters.categorySelections.length > 0 && !filters.categorySelections.includes(r.group2))
      return false;
    if (!matchesChannel(r, filters.channelSelections, channelGroups)) return false;
    if (!matchesProduct(r, filters.productSelections, productGroups)) return false;
    return true;
  });
}
