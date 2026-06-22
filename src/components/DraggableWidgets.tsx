import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface WidgetDef {
  key: string;
  node: ReactNode;
}

const STORAGE_KEY = 'dashboard-widget-order';

/**
 * prevOrder(저장된 순서)를 기준으로 currentKeys에 맞춰 병합한다. prevOrder에 없는
 * 새 키(조건부로 나타난 위젯 등)는 끝이 아니라, currentKeys 상의 자연스러운 위치(바로
 * 앞 형제 다음, 없으면 바로 뒤 형제 앞)에 끼워 넣는다.
 */
function mergeOrder(prevOrder: string[], currentKeys: string[]): string[] {
  const result = prevOrder.filter((k) => currentKeys.includes(k));
  const missing = currentKeys.filter((k) => !result.includes(k));

  for (const key of missing) {
    const naturalIdx = currentKeys.indexOf(key);
    let insertAt = result.length;

    for (let i = naturalIdx - 1; i >= 0; i--) {
      const pos = result.indexOf(currentKeys[i]);
      if (pos !== -1) {
        insertAt = pos + 1;
        break;
      }
    }
    if (insertAt === result.length) {
      for (let i = naturalIdx + 1; i < currentKeys.length; i++) {
        const pos = result.indexOf(currentKeys[i]);
        if (pos !== -1) {
          insertAt = pos;
          break;
        }
      }
    }
    result.splice(insertAt, 0, key);
  }

  return result;
}

function loadOrder(defaultKeys: string[]): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultKeys;
    const saved: string[] = JSON.parse(raw);
    return mergeOrder(saved, defaultKeys);
  } catch {
    return defaultKeys;
  }
}

function saveOrder(order: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // 저장 실패는 무시 (다음 세션엔 기본 순서로 표시됨)
  }
}

export function DraggableWidgets({ widgets }: { widgets: WidgetDef[] }) {
  const keys = widgets.map((w) => w.key);
  const keysSignature = keys.join(',');
  const [order, setOrder] = useState<string[]>(() => loadOrder(keys));

  useEffect(() => {
    setOrder((prev) => mergeOrder(prev, keys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature]);

  const dragKey = useRef<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const handleDrop = (targetKey: string) => {
    const source = dragKey.current;
    setDragOverKey(null);
    if (!source || source === targetKey) return;
    setOrder((prev) => {
      const next = prev.filter((k) => k !== source);
      const idx = next.indexOf(targetKey);
      next.splice(idx, 0, source);
      saveOrder(next);
      return next;
    });
  };

  const widgetMap = new Map(widgets.map((w) => [w.key, w]));
  const ordered = order.map((k) => widgetMap.get(k)).filter((w): w is WidgetDef => Boolean(w));

  return (
    <div className="dashboard">
      {ordered.map((w) => (
        <div
          key={w.key}
          className={`dashboard-widget${dragOverKey === w.key ? ' is-drag-over' : ''}`}
          draggable
          onDragStart={() => {
            dragKey.current = w.key;
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverKey(w.key);
          }}
          onDragLeave={() => setDragOverKey((k) => (k === w.key ? null : k))}
          onDrop={() => handleDrop(w.key)}
          onDragEnd={() => {
            dragKey.current = null;
            setDragOverKey(null);
          }}
        >
          <div className="dashboard-widget-handle" title="드래그하여 순서 변경">⠿⠿</div>
          {w.node}
        </div>
      ))}
    </div>
  );
}
