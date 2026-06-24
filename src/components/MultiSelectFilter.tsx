import { useState, useMemo } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: (string | SelectOption)[];
  selected: string[];
  onChange: (next: string[]) => void;
  single?: boolean; // true면 라디오처럼 한 개만 선택 가능
}

function normalize(opt: string | SelectOption): SelectOption {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

export function MultiSelectFilter({ label, options, selected, onChange, single = false }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const normalized = useMemo(() => options.map(normalize), [options]);

  const filtered = useMemo(
    () => normalized.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())),
    [normalized, query]
  );

  const toggle = (value: string) => {
    if (single) {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
      return;
    }
    if (selected.includes(value)) onChange(selected.filter((s) => s !== value));
    else onChange([...selected, value]);
  };

  const selectFiltered = () => {
    const filteredValues = new Set(filtered.map((o) => o.value));
    onChange([...selected.filter((s) => !filteredValues.has(s)), ...filtered.map((o) => o.value)]);
  };

  const deselectFiltered = () => {
    const filteredValues = new Set(filtered.map((o) => o.value));
    onChange(selected.filter((s) => !filteredValues.has(s)));
  };

  const summary = selected.length === 0 ? '전체' : `${selected.length}개 선택`;
  const isSearching = query.trim().length > 0;

  return (
    <div className="multiselect">
      <button type="button" className="multiselect-trigger" onClick={() => setOpen((o) => !o)}>
        <span className="multiselect-label">{label}</span>
        <span className="multiselect-summary">{summary}</span>
      </button>
      {open && (
        <>
          <div className="multiselect-backdrop" onClick={() => setOpen(false)} />
          <div className="multiselect-panel">
          <input
            className="multiselect-search"
            placeholder="검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="multiselect-actions">
            {!single && (
              <>
                <button type="button" onClick={selectFiltered}>
                  {isSearching ? '검색결과 선택' : '전체 선택'}
                </button>
                <button type="button" onClick={deselectFiltered}>
                  {isSearching ? '검색결과 해제' : '전체 해제'}
                </button>
              </>
            )}
            <button type="button" onClick={() => setOpen(false)}>닫기</button>
          </div>
          <div className="multiselect-options">
            {filtered.map((opt) => (
              <label key={opt.value} className="multiselect-option">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
                <span title={opt.label}>{opt.label}</span>
              </label>
            ))}
            {filtered.length === 0 && <div className="multiselect-empty">결과 없음</div>}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
