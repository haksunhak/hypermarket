import { Fragment } from 'react';
import type { ChannelTypeReport, CellMetrics } from '../lib/channelTypeReport';
import { marginRate } from '../lib/channelTypeReport';

function fmtNum(n: number): string {
  return n === 0 ? '-' : n.toLocaleString('ko-KR');
}

function fmtPercent(cell: CellMetrics): string {
  return `${Math.round(marginRate(cell) * 100)}%`;
}

function CellGroup({ cell }: { cell: CellMetrics }) {
  return (
    <>
      <td className="num">{fmtNum(cell.qty)}</td>
      <td className="num">{fmtNum(cell.saleAmount)}</td>
      <td className="num">{fmtNum(cell.cogs)}</td>
      <td className="num pct">{fmtPercent(cell)}</td>
    </>
  );
}

interface Props {
  title: string;
  report: ChannelTypeReport;
  onDownload?: () => void;
  onGroupClick?: (group2: string) => void;
  selectedGroup?: string | null;
}

export function ChannelTypeReportTable({ title, report, onDownload, onGroupClick, selectedGroup }: Props) {
  const { columns, sections, grand, grandTotal } = report;

  return (
    <div className="channel-type-report">
      <div className="channel-type-report-title">
        {title}
        {onDownload && (
          <button type="button" className="ctr-download-btn" onClick={onDownload}>
            ⬇ 엑셀 다운로드
          </button>
        )}
      </div>
      <div className="channel-type-table-scroll">
      <table className="channel-type-table">
        <thead>
          <tr>
            <th rowSpan={2} className="ctt-rowhead">판매처</th>
            <th rowSpan={2} className="ctt-rowhead">품명</th>
            {columns.map((c) => (
              <th key={c} colSpan={4}>{c}</th>
            ))}
            <th colSpan={4}>합계</th>
          </tr>
          <tr>
            {columns.map((c) => (
              <Fragment key={c}>
                <th>수량</th>
                <th>판매금액</th>
                <th>매출원가</th>
                <th>판매이익률</th>
              </Fragment>
            ))}
            <th>수량</th>
            <th>판매금액</th>
            <th>매출원가</th>
            <th>판매이익률</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.group2}>
              {section.items.map((item, idx) => (
                <tr key={item.itemCode}>
                  {idx === 0 && (
                    <td
                      rowSpan={section.items.length + 1}
                      className={[
                        'ctt-section',
                        onGroupClick ? 'ctt-section-clickable' : '',
                        selectedGroup === section.group2 ? 'ctt-section-selected' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={onGroupClick ? () => onGroupClick(section.group2) : undefined}
                      title={onGroupClick ? '클릭하면 채널별 상세를 확인할 수 있습니다' : undefined}
                    >
                      {section.group2}
                      {onGroupClick && (
                        <span className="ctt-drill-arrow">
                          {selectedGroup === section.group2 ? '▲' : '▼'}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="ctt-itemname">{item.itemName}</td>
                  {columns.map((c) => (
                    <CellGroup key={c} cell={item.cells[c] ?? { qty: 0, saleAmount: 0, cogs: 0 }} />
                  ))}
                  <CellGroup cell={item.total} />
                </tr>
              ))}
              <tr className="ctt-subtotal">
                <td>소계</td>
                {columns.map((c) => (
                  <CellGroup key={c} cell={section.subtotal[c]} />
                ))}
                <CellGroup cell={section.subtotalTotal} />
              </tr>
            </Fragment>
          ))}
          <tr className="ctt-grandtotal">
            <td colSpan={2}>누계</td>
            {columns.map((c) => (
              <CellGroup key={c} cell={grand[c]} />
            ))}
            <CellGroup cell={grandTotal} />
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
}
