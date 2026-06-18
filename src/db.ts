import Dexie, { type Table } from 'dexie';
import type { SaleRecord, ProductGroup, ChannelGroup } from './types';

class AppDB extends Dexie {
  records!: Table<SaleRecord, string>;
  productGroups!: Table<ProductGroup, string>;
  channelGroups!: Table<ChannelGroup, string>;

  constructor() {
    super('hypermarket-dashboard');
    this.version(1).stores({
      records: 'id, date, warehouseName, channelName, itemCode, group1, group2, group3, type, source',
      productGroups: 'id, name',
      channelGroups: 'id, name',
    });
  }
}

export const db = new AppDB();
