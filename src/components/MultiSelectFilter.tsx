import { useState, useMemo } from 'react';

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function MultiSelectFilter({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );

  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };

  const summary = selected.length === 0 ? '전체' : `${selected.length}개 선택`;

  return (
    <div className="multiselect">
      <button type="button" className="multiselect-trigger" onClick={() => setOpen((o) => !o)}>
        <span className="multiselect-label">{label}</span>
        <span className="multiselect-summary">{summary}</span>
      </button>
      {open && (
        <div className="multiselect-panel">
          <input
            className="multiselect-search"
            placeholder="검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="multiselect-actions">
            <button type="button" onClick={() => onChange(options)}>전체 선택</button>
            <button type="button" onClick={() => onChange([])}>전체 해제</button>
            <button type="button" onClick={() => setOpen(false)}>닫기</button>
          </div>
          <div className="multiselect-options">
            {filtered.map((opt) => (
              <label key={opt} className="multiselect-option">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
            {filtered.length === 0 && <div className="multiselect-empty">결과 없음</div>}
          </div>
        </div>
      )}
    </div>
  );
}
