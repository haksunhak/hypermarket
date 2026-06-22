import dayjs from 'dayjs';
import type { SaleRecord } from '../types';

export interface ComparisonResult {
  label: string;
  currentDate: string;
  compareDate: string;
  currentAmount: number;
  compareAmount: number;
  changePct: number | null; // null이면 비교 대상 매출이 0이라 변화율 계산 불가
}

function sumAmountForDate(records: SaleRecord[], date: string): number {
  let total = 0;
  for (const r of records) {
    if (r.date === date && r.type === 'sale') total += r.totalAmount;
  }
  return total;
}

/** records는 호출 전에 날짜 범위를 제외한 다른 필터가 모두 적용되어 있어야 함 */
export function buildComparisons(records: SaleRecord[], baseDate: string): ComparisonResult[] {
  if (!baseDate) return [];
  const base = dayjs(baseDate);
  if (!base.isValid()) return [];

  const targets: { label: string; date: dayjs.Dayjs }[] = [
    { label: '전일 대비', date: base.subtract(1, 'day') },
    { label: '전월 대비', date: base.subtract(1, 'month') },
    { label: '전년 대비', date: base.subtract(1, 'year') },
  ];

  const currentAmount = sumAmountForDate(records, baseDate);

  return targets.map(({ label, date }) => {
    const compareDate = date.format('YYYY-MM-DD');
    const compareAmount = sumAmountForDate(records, compareDate);
    const changePct = compareAmount > 0 ? ((currentAmount - compareAmount) / compareAmount) * 100 : null;
    return { label, currentDate: baseDate, compareDate, currentAmount, compareAmount, changePct };
  });
}
