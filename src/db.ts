import Dexie, { type Table } from 'dexie';
import type {
  SaleRecord,
  ProductGroup,
  ChannelGroup,
  DisplayNameOverride,
  ChannelTypeAssignment,
  ItemCost,
} from './types';

class AppDB extends Dexie {
  records!: Table<SaleRecord, string>;
  productGroups!: Table<ProductGroup, string>;
  channelGroups!: Table<ChannelGroup, string>;
  displayNames!: Table<DisplayNameOverride, string>;
  channelTypes!: Table<ChannelTypeAssignment, string>;
  itemCosts!: Table<ItemCost, string>;

  constructor() {
    super('hypermarket-dashboard');
    this.version(1).stores({
      records: 'id, date, warehouseName, channelName, itemCode, group1, group2, group3, type, source',
      productGroups: 'id, name',
      channelGroups: 'id, name',
    });
    this.version(2).stores({
      records: 'id, date, warehouseName, channelName, itemCode, group1, group2, group3, type, source',
      productGroups: 'id, name',
      channelGroups: 'id, name',
      displayNames: 'id, dimension, rawValue',
    });
    this.version(3).stores({
      records: 'id, date, warehouseName, channelName, itemCode, group1, group2, group3, type, source',
      productGroups: 'id, name',
      channelGroups: 'id, name',
      displayNames: 'id, dimension, rawValue',
      channelTypes: 'id, channelName, channelType',
    });
    this.version(4).stores({
      records: 'id, date, warehouseName, channelName, itemCode, group1, group2, group3, type, source',
      productGroups: 'id, name',
      channelGroups: 'id, name',
      displayNames: 'id, dimension, rawValue',
      channelTypes: 'id, channelName, channelType',
      itemCosts: 'id, itemCode',
    });
  }
}

export const db = new AppDB();
