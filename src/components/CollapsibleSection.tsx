import { useState, type ReactNode } from 'react';

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button type="button" className="collapsible-header" onClick={() => setOpen((o) => !o)}>
        <span className="collapsible-caret">{open ? '▼' : '▶'}</span>
        <span>{title}</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}
