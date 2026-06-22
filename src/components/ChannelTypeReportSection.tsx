import { useMemo } from 'react';
import type { SaleRecord } from '../types';
import { buildChannelTypeReport } from '../lib/channelTypeReport';
import type { ReportScope } from '../lib/filters';
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
}

export function ChannelTypeReportSection({ records, dateFrom, dateTo, scope, channelTypeMap, costMap }: Props) {
  const scopedRecords = useMemo(
    () =>
      records.filter(
        (r) => scope.matches(r) && (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo)
      ),
    [records, scope, dateFrom, dateTo]
  );

  const dailyRecords = useMemo(
    () => (dateTo ? scopedRecords.filter((r) => r.date === dateTo) : []),
    [scopedRecords, dateTo]
  );

  const dailyReport = useMemo(
    () => buildChannelTypeReport(dailyRecords, channelTypeMap, costMap),
    [dailyRecords, channelTypeMap, costMap]
  );
  const cumulativeReport = useMemo(
    () => buildChannelTypeReport(scopedRecords, channelTypeMap, costMap),
    [scopedRecords, channelTypeMap, costMap]
  );

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
      {dateTo && (
        <ChannelTypeReportTable
          title={`${formatDateWithWeekday(dateTo)} ${scope.label} 판매현황`}
          report={dailyReport}
        />
      )}
      <ChannelTypeReportTable title={`판매 누계 (${dateFrom}~${dateTo}) ${scope.label}`} report={cumulativeReport} />
    </div>
  );
}
