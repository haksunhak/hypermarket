import dayjs from 'dayjs';
import type { SaleRecord } from '../types';

export interface ComparisonResult {
  label: string;
  currentLabel: string; // 표시용 (예: "2026-06-22" 또는 주말 합산 시 "06-20~06-22")
  compareLabel: string;
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

/** 토(6)/일(0)이면 가장 가까운 이전 평일(금요일)까지 거슬러 올라간다 */
function toPreviousWeekday(d: dayjs.Dayjs): dayjs.Dayjs {
  let result = d;
  while (result.day() === 0 || result.day() === 6) {
    result = result.subtract(1, 'day');
  }
  return result;
}

/**
 * 월요일 매출은 직전 토·일 매출과 합산해서 비교한다. 매장 채널처럼 주말에만 매출이
 * 발생하는 경우, 평일 매출만 남기고 주말 매출을 통째로 누락시키면 월요일↔금요일 비교가
 * 실제보다 과장되거나 왜곡되어 보이기 때문에, 주말 매출을 다음 월요일에 포함해
 * "주말+월요일"을 하나의 비교 단위로 묶는다. 월요일이 아닌 평일은 그대로 단일 일자로 비교.
 */
function amountForComparisonDate(
  records: SaleRecord[],
  date: dayjs.Dayjs
): { amount: number; label: string } {
  const dateStr = date.format('YYYY-MM-DD');
  if (date.day() !== 1) {
    return { amount: sumAmountForDate(records, dateStr), label: date.format('MM-DD') };
  }
  const sat = date.subtract(2, 'day');
  const sun = date.subtract(1, 'day');
  const amount =
    sumAmountForDate(records, sat.format('YYYY-MM-DD')) +
    sumAmountForDate(records, sun.format('YYYY-MM-DD')) +
    sumAmountForDate(records, dateStr);
  return { amount, label: `${sat.format('MM-DD')}~${date.format('MM-DD')}(주말포함)` };
}

/** records는 호출 전에 날짜 범위를 제외한 다른 필터가 모두 적용되어 있어야 함 */
export function buildComparisons(records: SaleRecord[], baseDate: string): ComparisonResult[] {
  if (!baseDate) return [];
  const base = dayjs(baseDate);
  if (!base.isValid()) return [];

  const targets: { label: string; compareDate: dayjs.Dayjs; rollWeekend: boolean }[] = [
    { label: '전일 대비', compareDate: toPreviousWeekday(base.subtract(1, 'day')), rollWeekend: true },
    { label: '전주 대비', compareDate: toPreviousWeekday(base.subtract(1, 'week')), rollWeekend: true },
    { label: '전월 대비', compareDate: base.subtract(1, 'month'), rollWeekend: false },
    { label: '전년 대비', compareDate: base.subtract(1, 'year'), rollWeekend: false },
  ];

  return targets.map(({ label, compareDate, rollWeekend }) => {
    const current = rollWeekend
      ? amountForComparisonDate(records, base)
      : { amount: sumAmountForDate(records, baseDate), label: base.format('YYYY-MM-DD') };
    const compare = rollWeekend
      ? amountForComparisonDate(records, compareDate)
      : { amount: sumAmountForDate(records, compareDate.format('YYYY-MM-DD')), label: compareDate.format('YYYY-MM-DD') };

    const changePct = compare.amount > 0 ? ((current.amount - compare.amount) / compare.amount) * 100 : null;
    return {
      label,
      currentLabel: current.label,
      compareLabel: compare.label,
      currentAmount: current.amount,
      compareAmount: compare.amount,
      changePct,
    };
  });
}
