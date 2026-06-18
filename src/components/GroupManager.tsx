import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import type { SaleRecord } from '../types';
import { MultiSelectFilter } from './MultiSelectFilter';

function useDistinct(records: SaleRecord[] | undefined, key: keyof SaleRecord) {
  if (!records) return [] as string[];
  return Array.from(new Set(records.map((r) => String(r[key])).filter(Boolean))).sort();
}

export function GroupManager() {
  const records = useLiveQuery(() => db.records.toArray());
  const productGroups = useLiveQuery(() => db.productGroups.toArray()) ?? [];
  const channelGroups = useLiveQuery(() => db.channelGroups.toArray()) ?? [];

  const items = (records ?? []).reduce<Map<string, string>>((map, r) => {
    if (r.itemCode) map.set(r.itemCode, r.itemName);
    return map;
  }, new Map());
  const itemOptions = Array.from(items.entries())
    .map(([code, name]) => `${code} | ${name}`)
    .sort();

  const channelOptions = useDistinct(records, 'channelName');

  const [newProductGroupName, setNewProductGroupName] = useState('');
  const [newProductGroupItems, setNewProductGroupItems] = useState<string[]>([]);

  const [newChannelGroupName, setNewChannelGroupName] = useState('');
  const [newChannelGroupItems, setNewChannelGroupItems] = useState<string[]>([]);

  const addProductGroup = async () => {
    if (!newProductGroupName.trim() || newProductGroupItems.length === 0) return;
    await db.productGroups.add({
      id: uuid(),
      name: newProductGroupName.trim(),
      itemCodes: newProductGroupItems.map((s) => s.split(' | ')[0]),
      createdAt: Date.now(),
    });
    setNewProductGroupName('');
    setNewProductGroupItems([]);
  };

  const addChannelGroup = async () => {
    if (!newChannelGroupName.trim() || newChannelGroupItems.length === 0) return;
    await db.channelGroups.add({
      id: uuid(),
      name: newChannelGroupName.trim(),
      channelNames: newChannelGroupItems,
      createdAt: Date.now(),
    });
    setNewChannelGroupName('');
    setNewChannelGroupItems([]);
  };

  return (
    <div className="panel">
      <h2>주요 품목 / 채널 그룹 설정</h2>
      <p className="hint">
        대시보드에서 묶어서 볼 품목 그룹과 채널 그룹을 직접 정의할 수 있습니다.
      </p>

      <section className="group-section">
        <h3>주요 품목 그룹</h3>
        <div className="group-form">
          <input
            placeholder="그룹명 (예: 핵심 액상 라인업)"
            value={newProductGroupName}
            onChange={(e) => setNewProductGroupName(e.target.value)}
          />
          <MultiSelectFilter
            label="포함 품목"
            options={itemOptions}
            selected={newProductGroupItems}
            onChange={setNewProductGroupItems}
          />
          <button type="button" onClick={addProductGroup}>그룹 추가</button>
        </div>
        <ul className="group-list">
          {productGroups.map((g) => (
            <li key={g.id}>
              <strong>{g.name}</strong> — {g.itemCodes.length}개 품목
              <button type="button" onClick={() => db.productGroups.delete(g.id)}>삭제</button>
            </li>
          ))}
          {productGroups.length === 0 && <li className="hint">등록된 품목 그룹 없음</li>}
        </ul>
      </section>

      <section className="group-section">
        <h3>채널 그룹</h3>
        <div className="group-form">
          <input
            placeholder="그룹명 (예: 자사몰 전체)"
            value={newChannelGroupName}
            onChange={(e) => setNewChannelGroupName(e.target.value)}
          />
          <MultiSelectFilter
            label="포함 채널"
            options={channelOptions}
            selected={newChannelGroupItems}
            onChange={setNewChannelGroupItems}
          />
          <button type="button" onClick={addChannelGroup}>그룹 추가</button>
        </div>
        <ul className="group-list">
          {channelGroups.map((g) => (
            <li key={g.id}>
              <strong>{g.name}</strong> — {g.channelNames.length}개 채널
              <button type="button" onClick={() => db.channelGroups.delete(g.id)}>삭제</button>
            </li>
          ))}
          {channelGroups.length === 0 && <li className="hint">등록된 채널 그룹 없음</li>}
        </ul>
      </section>
    </div>
  );
}
