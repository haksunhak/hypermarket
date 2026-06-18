export type RecordType = 'sale' | 'gift';

export interface SaleRecord {
  id: string;
  date: string; // YYYY-MM-DD
  warehouseCode: string;
  warehouseName: string; // 채널 대분류 (예: 다미_노원_와이브랜즈)
  channelCode: string;
  channelName: string; // 채널 세부 (관리항목명)
  itemCode: string;
  itemName: string;
  group1: string; // 자사/타사/상품외
  group2: string; // 카테고리
  group3: string; // 브랜드
  qty: number;
  supplyAmount: number;
  vat: number;
  totalAmount: number;
  type: RecordType;
  source: string; // 업로드 파일명
  uploadedAt: number;
}

export interface ProductGroup {
  id: string;
  name: string;
  itemCodes: string[];
  createdAt: number;
}

export interface ChannelGroup {
  id: string;
  name: string;
  channelNames: string[]; // 관리항목명 멤버
  createdAt: number;
}
