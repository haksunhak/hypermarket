import type { SaleRecord } from '../types';

export interface InsightCard {
  id: string;
  type: 'positive' | 'negative' | 'warning' | 'neutral';
  headline: string;
  body: string;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getPrevMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

function sumAmt(recs: SaleRecord[]): number {
  return recs.reduce((s, r) => s + r.totalAmount, 0);
}

function sumQty(recs: SaleRecord[]): number {
  return recs.reduce((s, r) => s + r.qty, 0);
}

function fmtAmt(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만원`;
  return `${n.toLocaleString('ko-KR')}원`;
}

function pctStr(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

export function computeInsights(
  allRecords: SaleRecord[],
  channelTypeMap: Map<string, string>,
  channelTypeDisplayMap: Map<string, string>
): InsightCard[] {
  const sales = allRecords.filter(r => r.type === 'sale');
  if (sales.length === 0) return [];

  const allDates = [...new Set(sales.map(r => r.date))].sort();
  const latestDate = allDates[allDates.length - 1];
  const currentMonth = latestDate.slice(0, 7);
  const prevMonth = getPrevMonth(currentMonth);

  const currM = sales.filter(r => r.date.startsWith(currentMonth));
  const prevM = sales.filter(r => r.date.startsWith(prevMonth));

  const cards: InsightCard[] = [];

  // ── 카드 1: 전월 대비 총 매출 ───────────────────────────────
  if (prevM.length > 0) {
    const cAmt = sumAmt(currM);
    const pAmt = sumAmt(prevM);
    const cQty = sumQty(currM);
    const pct = ((cAmt - pAmt) / pAmt) * 100;
    cards.push({
      id: 'mom-sales',
      type: pct >= 0 ? 'positive' : 'negative',
      headline: `${currentMonth} 매출 전월 대비 ${Math.abs(pct).toFixed(1)}% ${pct >= 0 ? '증가' : '감소'}`,
      body: `${currentMonth} 매출 ${fmtAmt(cAmt)} (수량 ${cQty.toLocaleString('ko-KR')}개) — 전월 ${fmtAmt(pAmt)} 대비 ${fmtAmt(Math.abs(cAmt - pAmt))} ${pct >= 0 ? '증가' : '감소'}했습니다.`,
    });
  }

  // ── 카드 2: 일평균 매출 전월 대비 ─────────────────────────
  const currDays = new Set(currM.map(r => r.date)).size;
  const prevDays = new Set(prevM.map(r => r.date)).size;
  if (currDays > 0 && prevDays > 0 && prevM.length > 0) {
    const cAvg = sumAmt(currM) / currDays;
    const pAvg = sumAmt(prevM) / prevDays;
    const pct = ((cAvg - pAvg) / pAvg) * 100;
    cards.push({
      id: 'daily-avg',
      type: pct >= 0 ? 'positive' : 'neutral',
      headline: `${currentMonth} 일평균 매출, 전월 대비 ${pctStr(pct)}`,
      body: `${currentMonth}은 ${currDays}일 판매. 일평균 ${fmtAmt(Math.round(cAvg))} — 전월(${fmtAmt(Math.round(pAvg))}/일) 대비 ${pct >= 0 ? '빠른' : '느린'} 페이스입니다.`,
    });
  }

  // ── 카드 3: 최근 30일 채널 동향 ───────────────────────────
  const d30 = addDays(latestDate, -30);
  const d60 = addDays(latestDate, -60);
  const last30 = sales.filter(r => r.date > d30);
  const prev30 = sales.filter(r => r.date > d60 && r.date <= d30);

  if (last30.length > 0 && prev30.length > 0) {
    const resolveType = (ch: string) => {
      const raw = channelTypeMap.get(ch) ?? '';
      return channelTypeDisplayMap.get(raw) || raw || '미지정';
    };
    const sumByType = (recs: SaleRecord[]) => {
      const m = new Map<string, number>();
      for (const r of recs) {
        const t = resolveType(r.channelName);
        m.set(t, (m.get(t) ?? 0) + r.totalAmount);
      }
      return m;
    };
    const l30t = sumByType(last30);
    const p30t = sumByType(prev30);
    const changes: { label: string; pct: number }[] = [];
    for (const [label, curr] of l30t) {
      const prev = p30t.get(label) ?? 0;
      if (prev > 0) changes.push({ label, pct: ((curr - prev) / prev) * 100 });
    }
    changes.sort((a, b) => a.pct - b.pct);
    if (changes.length > 0) {
      const parts = changes.slice(0, 4).map(c => `${c.label} ${pctStr(c.pct)}`);
      cards.push({
        id: 'channel-trend',
        type: 'neutral',
        headline: `최근 30일 채널 동향: ${changes.slice(0, 2).map(c => `${c.label} ${pctStr(c.pct)}`).join(' / ')}`,
        body: `직전 30일 대비 채널별 매출 변화 — ${parts.join(', ')}.`,
      });
    }
  }

  // ── 카드 4: 최대 하락 품목 (최근 30일) ───────────────────
  if (last30.length > 0 && prev30.length > 0) {
    const byItem = (recs: SaleRecord[]) => {
      const m = new Map<string, { name: string; amt: number }>();
      for (const r of recs) {
        const e = m.get(r.itemCode) ?? { name: r.itemName, amt: 0 };
        e.amt += r.totalAmount;
        m.set(r.itemCode, e);
      }
      return m;
    };
    const l30i = byItem(last30);
    const p30i = byItem(prev30);
    let worstPct = -10;
    let worstName = '';
    for (const [code, l] of l30i) {
      const p = p30i.get(code);
      if (p && p.amt >= 500_000) {
        const pct = ((l.amt - p.amt) / p.amt) * 100;
        if (pct < worstPct) { worstPct = pct; worstName = l.name; }
      }
    }
    if (worstName) {
      const short = worstName.length > 18 ? worstName.slice(0, 18) + '…' : worstName;
      cards.push({
        id: 'item-decline',
        type: 'warning',
        headline: `'${short}' 판매 둔화 (${pctStr(worstPct)})`,
        body: `최근 30일 매출이 직전 30일 대비 ${Math.abs(worstPct).toFixed(0)}% 줄었습니다. 프로모션 또는 발주량 조정을 검토하세요.`,
      });
    }
  }

  // ── 카드 5: 최대 성장 품목 (최근 30일) ───────────────────
  if (last30.length > 0 && prev30.length > 0) {
    const byItem = (recs: SaleRecord[]) => {
      const m = new Map<string, { name: string; amt: number }>();
      for (const r of recs) {
        const e = m.get(r.itemCode) ?? { name: r.itemName, amt: 0 };
        e.amt += r.totalAmount;
        m.set(r.itemCode, e);
      }
      return m;
    };
    const l30i = byItem(last30);
    const p30i = byItem(prev30);
    let bestPct = 20;
    let bestName = '';
    for (const [code, l] of l30i) {
      const p = p30i.get(code);
      if (p && p.amt >= 500_000 && l.amt > p.amt) {
        const pct = ((l.amt - p.amt) / p.amt) * 100;
        if (pct > bestPct) { bestPct = pct; bestName = l.name; }
      }
    }
    if (bestName) {
      const short = bestName.length > 18 ? bestName.slice(0, 18) + '…' : bestName;
      cards.push({
        id: 'item-growth',
        type: 'positive',
        headline: `'${short}' 판매 급증 (+${bestPct.toFixed(0)}%)`,
        body: `최근 30일 매출이 직전 30일 대비 ${bestPct.toFixed(0)}% 증가했습니다.`,
      });
    }
  }

  // ── 카드 6: 판매 집중도 — 상위 채널 의존도 ───────────────
  if (currM.length > 0) {
    const chSales = new Map<string, number>();
    for (const r of currM) chSales.set(r.channelName, (chSales.get(r.channelName) ?? 0) + r.totalAmount);
    const sorted = [...chSales.entries()].sort((a, b) => b[1] - a[1]);
    const total = sumAmt(currM);
    if (sorted.length >= 2 && total > 0) {
      const top1 = sorted[0];
      const top1Pct = (top1[1] / total) * 100;
      const top3Pct = sorted.slice(0, 3).reduce((s, [, v]) => s + v, 0) / total * 100;
      if (top1Pct >= 40) {
        cards.push({
          id: 'concentration',
          type: top1Pct >= 60 ? 'warning' : 'neutral',
          headline: `${currentMonth} 상위 채널 집중도: 1위 ${top1Pct.toFixed(0)}% / 상위 3개 ${top3Pct.toFixed(0)}%`,
          body: `'${top1[0]}' 채널이 이번 달 매출의 ${top1Pct.toFixed(0)}%를 차지합니다. 채널 다변화를 고려하세요.`,
        });
      }
    }
  }

  return cards;
}
