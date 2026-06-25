import { useCallback, useMemo, useState } from 'react';
import type { SaleRecord } from '../types';
import { CHANNEL_TYPES } from '../types';
import { buildChannelTypeReport } from '../lib/channelTypeReport';
import { marginRate } from '../lib/channelTypeReport';
import type { ReportScope } from '../lib/filters';
import { exportChannelTypeReportToExcel } from '../lib/exportExcel';
import { resolveDisplay } from '../lib/displayNames';
import { ChannelTypeReportTable } from './ChannelTypeReportTable';

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateWithWeekday(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${dateStr}(${WEEKDAYS_KO[d.getDay()]})`;
}

interface ChannelDetail {
  channelType: string;    // 채널구분 표시명
  channelName: string;    // 채널명 표시명
  rawType: string;        // 정렬용 원본 채널구분
  qty: number;
  saleAmount: number;
  cogs: number;
}

function buildChannelDetail(
  records: SaleRecord[],
  group2: string,
  channelTypeMap: Map<string, string>,
  channelDisplayMap: Map<string, string>,
  channelTypeDisplayMap: Map<string, string>,
  costMap: Map<string, number>
): ChannelDetail[] {
  const filtered = records.filter(r => (r.group2 || '(미분류)') === group2 && r.type === 'sale');
  const map = new Map<string, ChannelDetail>();
  for (const r of filtered) {
    if (!map.has(r.channelName)) {
      const rawType = channelTypeMap.get(r.channelName) ?? '';
      map.set(r.channelName, {
        channelType: resolveDisplay(channelTypeDisplayMap, rawType) || rawType || '미지정',
        channelName: resolveDisplay(channelDisplayMap, r.channelName),
        rawType,
        qty: 0, saleAmount: 0, cogs: 0,
      });
    }
    const d = map.get(r.channelName)!;
    d.qty += r.qty;
    d.saleAmount += r.totalAmount;
    d.cogs += r.qty * (costMap.get(r.itemCode) ?? 0);
  }
  const typeOrder = (raw: string) => {
    const i = (CHANNEL_TYPES as readonly string[]).indexOf(raw);
    return i >= 0 ? i : 999;
  };
  return [...map.values()].sort(
    (a, b) => typeOrder(a.rawType) - typeOrder(b.rawType) || b.saleAmount - a.saleAmount
  );
}

interface Props {
  records: SaleRecord[];
  dateFrom: string;
  dateTo: string;
  scope: ReportScope;
  channelTypeMap: Map<string, string>;
  channelDisplayMap: Map<string, string>;
  costMap: Map<string, number>;
  channelTypeDisplayMap: Map<string, string>;
}

export function ChannelTypeReportSection({
  records,
  dateFrom,
  dateTo,
  scope,
  channelTypeMap,
  channelDisplayMap,
  costMap,
  channelTypeDisplayMap,
}: Props) {
  const [selectedGroup2, setSelectedGroup2] = useState<string | null>(null);

  // 날짜 범위 + 스코프 — 일별 판매현황용
  const scopedRecords = useMemo(
    () =>
      records.filter(
        (r) => scope.matches(r) && (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo)
      ),
    [records, scope, dateFrom, dateTo]
  );

  // 날짜 제한 없이 스코프만 적용 — 전체 누계용
  const allScopedRecords = useMemo(
    () => records.filter((r) => scope.matches(r) && r.date),
    [records, scope]
  );

  // 종료일에 정확히 데이터가 없을 수 있으므로(예: 넓은 기간 조회 중 마지막 날짜에는
  // 선택한 그룹의 판매가 없는 경우), 선택 범위 내에서 실제 데이터가 있는 가장 최근
  // 날짜를 스냅샷 기준일로 사용한다. 그래야 "일별 판매현황" 표가 늘 비어 보이지 않는다.
  const snapshotDate = useMemo(() => {
    if (scopedRecords.length === 0) return dateTo;
    if (dateTo && scopedRecords.some((r) => r.date === dateTo)) return dateTo;
    let max = scopedRecords[0].date;
    for (const r of scopedRecords) {
      if (r.date > max) max = r.date;
    }
    return max;
  }, [scopedRecords, dateTo]);

  const dailyRecords = useMemo(
    () => (snapshotDate ? scopedRecords.filter((r) => r.date === snapshotDate) : []),
    [scopedRecords, snapshotDate]
  );

  const dailyReport = useMemo(
    () => buildChannelTypeReport(dailyRecords, channelTypeMap, costMap, channelTypeDisplayMap),
    [dailyRecords, channelTypeMap, costMap, channelTypeDisplayMap]
  );
  const cumulativeReport = useMemo(
    () => buildChannelTypeReport(allScopedRecords, channelTypeMap, costMap, channelTypeDisplayMap),
    [allScopedRecords, channelTypeMap, costMap, channelTypeDisplayMap]
  );

  // 전체 누계 날짜 범위 계산 (타이틀용)
  const cumulativeDateRange = useMemo(() => {
    if (allScopedRecords.length === 0) return '';
    let min = allScopedRecords[0].date;
    let max = allScopedRecords[0].date;
    for (const r of allScopedRecords) {
      if (r.date < min) min = r.date;
      if (r.date > max) max = r.date;
    }
    return `${min}~${max}`;
  }, [allScopedRecords]);

  const dailyTitle = snapshotDate
    ? `${formatDateWithWeekday(snapshotDate)} ${scope.label} 판매현황`
    : `${scope.label} 판매현황`;
  const cumulativeTitle = `판매 누계 (${cumulativeDateRange}) ${scope.label}`;

  const handleDownloadDaily = useCallback(() => {
    exportChannelTypeReportToExcel(dailyReport, dailyTitle);
  }, [dailyReport, dailyTitle]);

  const handleDownloadCumulative = useCallback(() => {
    exportChannelTypeReportToExcel(cumulativeReport, cumulativeTitle);
  }, [cumulativeReport, cumulativeTitle]);

  const handleGroupClick = useCallback((group2: string) => {
    setSelectedGroup2(prev => prev === group2 ? null : group2);
  }, []);

  const channelDetails = useMemo(() => {
    if (!selectedGroup2) return [];
    return buildChannelDetail(
      allScopedRecords, selectedGroup2,
      channelTypeMap, channelDisplayMap, channelTypeDisplayMap, costMap
    );
  }, [selectedGroup2, allScopedRecords, channelTypeMap, channelDisplayMap, channelTypeDisplayMap, costMap]);

  if (scopedRecords.length === 0) {
    return (
      <div className="panel">
        <h3>채널유형별 판매현황</h3>
        <p className="hint">선택한 품목/그룹과 기간에 해당하는 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="panel channel-type-report-panel">
      {snapshotDate && (
        <ChannelTypeReportTable
          title={dailyTitle}
          report={dailyReport}
          onDownload={handleDownloadDaily}
          onGroupClick={handleGroupClick}
          selectedGroup={selectedGroup2}
        />
      )}
      <ChannelTypeReportTable
        title={cumulativeTitle}
        report={cumulativeReport}
        onDownload={handleDownloadCumulative}
        onGroupClick={handleGroupClick}
        selectedGroup={selectedGroup2}
      />

      {/* 채널별 드릴다운 */}
      {selectedGroup2 && channelDetails.length > 0 && (
        <div className="channel-drill-panel">
          <div className="channel-drill-header">
            <span>채널별 판매 상세 — {selectedGroup2} ({cumulativeDateRange})</span>
            <button type="button" className="channel-drill-close" onClick={() => setSelectedGroup2(null)}>✕</button>
          </div>
          <div className="channel-type-table-scroll" style={{ height: 'auto', maxHeight: '320px', resize: 'none' }}>
            <table className="channel-drill-table">
              <thead>
                <tr>
                  <th>채널구분</th>
                  <th>채널명</th>
                  <th>수량</th>
                  <th>판매금액</th>
                  <th>매출원가</th>
                  <th>판매이익률</th>
                </tr>
              </thead>
              <tbody>
                {channelDetails.map((d, i) => {
                  const margin = d.saleAmount > 0
                    ? Math.round(marginRate({ qty: d.qty, saleAmount: d.saleAmount, cogs: d.cogs }) * 100)
                    : 0;
                  return (
                    <tr key={i}>
                      <td className="ctt-section" style={{ textAlign: 'center', background: '#eef2f7' }}>{d.channelType}</td>
                      <td style={{ textAlign: 'left' }}>{d.channelName}</td>
                      <td className="num">{d.qty === 0 ? '-' : d.qty.toLocaleString('ko-KR')}</td>
                      <td className="num">{d.saleAmount === 0 ? '-' : d.saleAmount.toLocaleString('ko-KR')}</td>
                      <td className="num">{d.cogs === 0 ? '-' : d.cogs.toLocaleString('ko-KR')}</td>
                      <td className="num">{d.saleAmount === 0 ? '-' : `${margin}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="ctt-grandtotal">
                  <td colSpan={2}>합계</td>
                  <td className="num">{channelDetails.reduce((s, d) => s + d.qty, 0).toLocaleString('ko-KR')}</td>
                  <td className="num">{channelDetails.reduce((s, d) => s + d.saleAmount, 0).toLocaleString('ko-KR')}</td>
                  <td className="num">{channelDetails.reduce((s, d) => s + d.cogs, 0).toLocaleString('ko-KR')}</td>
                  <td className="num">
                    {(() => {
                      const totAmt = channelDetails.reduce((s, d) => s + d.saleAmount, 0);
                      const totCogs = channelDetails.reduce((s, d) => s + d.cogs, 0);
                      return totAmt > 0 ? `${Math.round((totAmt - totCogs) / totAmt * 100)}%` : '-';
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
