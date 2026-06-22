import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CHANNEL_TYPES, type ChannelType, type DisplayNameDimension, type SaleRecord } from '../types';
import { buildDisplayMap, makeOverrideId, resolveDisplay } from '../lib/displayNames';

const SECTIONS: { dimension: DisplayNameDimension; title: string; field: keyof SaleRecord }[] = [
  { dimension: 'channel', title: '채널명', field: 'channelName' },
  { dimension: 'category', title: '카테고리', field: 'group2' },
  { dimension: 'brand', title: '품목/브랜드', field: 'group3' },
];

function ChannelTypeSelect({ raw, currentType }: { raw: string; currentType: string | undefined }) {
  const handleChange = async (value: string) => {
    if (!value) {
      await db.channelTypes.delete(raw);
    } else {
      await db.channelTypes.put({ id: raw, channelName: raw, channelType: value as ChannelType });
    }
  };

  return (
    <select
      className="channel-type-select"
      value={currentType ?? ''}
      onChange={(e) => handleChange(e.target.value)}
    >
      <option value="">0. 구분 없음</option>
      {CHANNEL_TYPES.map((t, i) => (
        <option key={t} value={t}>{`${i + 1}. ${t}`}</option>
      ))}
    </select>
  );
}

function RenameSection({
  dimension,
  title,
  rawValues,
  displayMap,
  channelTypeMap,
}: {
  dimension: DisplayNameDimension;
  title: string;
  rawValues: string[];
  displayMap: Map<string, string>;
  channelTypeMap?: Map<string, string>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const valueFor = (raw: string) => drafts[raw] ?? resolveDisplay(displayMap, raw);

  const save = async (raw: string) => {
    const next = (drafts[raw] ?? resolveDisplay(displayMap, raw)).trim();
    if (!next || next === raw) {
      await db.displayNames.delete(makeOverrideId(dimension, raw));
    } else {
      await db.displayNames.put({
        id: makeOverrideId(dimension, raw),
        dimension,
        rawValue: raw,
        displayName: next,
      });
    }
    setDrafts((d) => {
      const { [raw]: _, ...rest } = d;
      return rest;
    });
  };

  const reset = (raw: string) => {
    setDrafts((d) => ({ ...d, [raw]: raw }));
  };

  return (
    <section className="group-section">
      <h3>{title}</h3>
      {rawValues.length === 0 && <p className="hint">업로드된 데이터에서 값을 찾을 수 없습니다.</p>}
      <ul className="rename-list">
        {rawValues.map((raw) => {
          const overridden = displayMap.has(raw);
          return (
            <li key={raw} className="rename-row">
              {channelTypeMap && <ChannelTypeSelect raw={raw} currentType={channelTypeMap.get(raw)} />}
              <span className="rename-raw" title={raw}>{raw}</span>
              <span className="rename-arrow">→</span>
              <input
                value={valueFor(raw)}
                onChange={(e) => setDrafts((d) => ({ ...d, [raw]: e.target.value }))}
              />
              <button type="button" onClick={() => save(raw)}>저장</button>
              {overridden && (
                <button type="button" onClick={() => reset(raw)}>원래대로</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const RESET_CONFIRM_WORD = '초기화';

function ResetSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (confirmText !== RESET_CONFIRM_WORD) return;
    setBusy(true);
    try {
      await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map((t) => t.clear()));
      });
      setDone(true);
      setOpen(false);
      setConfirmText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="group-section reset-section">
      <h3>데이터 초기화</h3>
      <p className="hint">
        업로드한 판매·사은품 데이터, 채널/품목 그룹, 표시 이름, 채널 구분, 품목 원가 등 이 앱에
        저장된 모든 내용을 영구적으로 삭제합니다. 되돌릴 수 없으니 신중하게 사용하세요.
      </p>
      {!open && (
        <button type="button" className="danger-button" onClick={() => setOpen(true)}>
          전체 데이터 초기화
        </button>
      )}
      {open && (
        <div className="reset-confirm-box">
          <p className="hint">
            정말 초기화하려면 아래 입력칸에 <strong>{RESET_CONFIRM_WORD}</strong>를 입력하세요.
          </p>
          <div className="reset-confirm-row">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={RESET_CONFIRM_WORD}
            />
            <button
              type="button"
              className="danger-button"
              disabled={confirmText !== RESET_CONFIRM_WORD || busy}
              onClick={handleReset}
            >
              {busy ? '초기화 중...' : '영구 삭제'}
            </button>
            <button type="button" className="cancel-button" onClick={() => { setOpen(false); setConfirmText(''); }}>
              취소
            </button>
          </div>
        </div>
      )}
      {done && <p className="hint">초기화되었습니다. 모든 데이터가 삭제되었습니다.</p>}
    </section>
  );
}

export function OtherSettings() {
  const records = useLiveQuery(() => db.records.toArray());
  const overrides = useLiveQuery(() => db.displayNames.toArray()) ?? [];
  const channelTypeAssignments = useLiveQuery(() => db.channelTypes.toArray()) ?? [];

  const channelTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of channelTypeAssignments) map.set(a.channelName, a.channelType);
    return map;
  }, [channelTypeAssignments]);

  const distinctValues = useMemo(() => {
    const result: Record<DisplayNameDimension, string[]> = { channel: [], category: [], brand: [] };
    if (!records) return result;
    for (const { dimension, field } of SECTIONS) {
      result[dimension] = Array.from(new Set(records.map((r) => String(r[field])).filter(Boolean))).sort();
    }
    return result;
  }, [records]);

  return (
    <div className="panel">
      <h2>기타 설정</h2>
      <p className="hint">
        채널명, 카테고리, 품목/브랜드의 대시보드 표시 이름을 변경할 수 있습니다. 업로드 파일의
        원본 분류 값은 바뀌지 않으며, 화면에 보여지는 이름만 바뀝니다. 채널명에는 유통사·도매·
        온라인·매장·기타 중 구분을 지정해 이름 앞에 표시할 수 있습니다.
      </p>
      {SECTIONS.map(({ dimension, title }) => (
        <RenameSection
          key={dimension}
          dimension={dimension}
          title={title}
          rawValues={distinctValues[dimension]}
          displayMap={buildDisplayMap(overrides, dimension)}
          channelTypeMap={dimension === 'channel' ? channelTypeMap : undefined}
        />
      ))}
      <ResetSection />
    </div>
  );
}
