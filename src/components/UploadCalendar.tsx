import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs, { type Dayjs } from 'dayjs';
import { db } from '../db';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function UploadCalendar() {
  const records = useLiveQuery(() => db.records.toArray()) ?? [];
  const [month, setMonth] = useState(() => dayjs().startOf('month'));

  const statusByDate = useMemo(() => {
    const map = new Map<string, { sale: boolean; gift: boolean }>();
    for (const r of records) {
      const entry = map.get(r.date) ?? { sale: false, gift: false };
      if (r.type === 'sale') entry.sale = true;
      else entry.gift = true;
      map.set(r.date, entry);
    }
    return map;
  }, [records]);

  const weeks = useMemo(() => {
    const startOfMonth = month.startOf('month');
    const gridStart = startOfMonth.startOf('week');
    const days: Dayjs[] = [];
    let cursor = gridStart;
    for (let i = 0; i < 42; i++) {
      days.push(cursor);
      cursor = cursor.add(1, 'day');
    }
    const result: Dayjs[][] = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [month]);

  const today = dayjs().format('YYYY-MM-DD');

  return (
    <div className="upload-calendar">
      <div className="upload-calendar-header">
        <button type="button" onClick={() => setMonth((m) => m.subtract(1, 'month'))}>‹</button>
        <span>{month.format('YYYY년 M월')}</span>
        <button type="button" onClick={() => setMonth((m) => m.add(1, 'month'))}>›</button>
      </div>
      <div className="upload-calendar-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="upload-calendar-weekday">{w}</div>
        ))}
        {weeks.flat().map((d) => {
          const key = d.format('YYYY-MM-DD');
          const inMonth = d.month() === month.month();
          const status = statusByDate.get(key);
          const classNames = ['upload-calendar-cell'];
          if (!inMonth) classNames.push('is-outside');
          if (key === today) classNames.push('is-today');
          if (status?.sale) classNames.push('has-sale');
          if (status?.gift) classNames.push('has-gift');
          return (
            <div key={key} className={classNames.join(' ')} title={key}>
              <span className="upload-calendar-day">{d.date()}</span>
              {(status?.sale || status?.gift) && <span className="upload-calendar-dot" />}
            </div>
          );
        })}
      </div>
      <div className="upload-calendar-legend">
        <span><i className="legend-dot has-sale" />판매 데이터 있음</span>
        <span><i className="legend-dot has-gift" />사은품만 있음</span>
        <span><i className="legend-dot" />업로드 없음</span>
      </div>
    </div>
  );
}
