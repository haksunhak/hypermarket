import { useCallback, useMemo } from 'react';
import type { SaleRecord } from '../types';
import { buildChannelTypeReport } from '../lib/channelTypeReport';
import type { ReportScope } from '../lib/filters';
import { exportChannelTypeReportToExcel } from '../lib/exportExcel';
import { ChannelTypeReportTable } from './ChannelTypeReportTable';

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateWithWeekday(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${dateStr}(${WEEKDAYS_KO[d.getDay()]})`;
}

interface Props {
  records: SaleRecord[];
  dateFrom: string;
  dateTo: string;
  scope: ReportScope;
  channelTypeMap: Map<string, string>;
  costMap: Map<string, number>;
  channelTypeDisplayMap: Map<string, string>;
}

export function ChannelTypeReportSection({
  records,
  dateFrom,
  dateTo,
  scope,
  channelTypeMap,
  costMap,
  channelTypeDisplayMap,
}: Props) {
  const scopedRecords = useMemo(
    () =>
      records.filter(
        (r) => scope.matches(r) && (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo)
      ),
    [records, scope, dateFrom, dateTo]
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
    () => buildChannelTypeReport(scopedRecords, channelTypeMap, costMap, channelTypeDisplayMap),
    [scopedRecords, channelTypeMap, costMap, channelTypeDisplayMap]
  );

  const dailyTitle = snapshotDate
    ? `${formatDateWithWeekday(snapshotDate)} ${scope.label} 판매현황`
    : `${scope.label} 판매현황`;
  const cumulativeTitle = `판매 누계 (${dateFrom}~${dateTo}) ${scope.label}`;

  const handleDownloadDaily = useCallback(() => {
    exportChannelTypeReportToExcel(dailyReport, dailyTitle);
  }, [dailyReport, dailyTitle]);

  const handleDownloadCumulative = useCallback(() => {
    exportChannelTypeReportToExcel(cumulativeReport, cumulativeTitle);
  }, [cumulativeReport, cumulativeTitle]);

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
        />
      )}
      <ChannelTypeReportTable
        title={cumulativeTitle}
        report={cumulativeReport}
        onDownload={handleDownloadCumulative}
      />
    </div>
  );
}
