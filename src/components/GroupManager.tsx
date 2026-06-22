import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import type { SaleRecord } from '../types';
import { MultiSelectFilter } from './MultiSelectFilter';
import { buildDisplayMap, resolveDisplay } from '../lib/displayNames';

function useDistinct(records: SaleRecord[] | undefined, key: keyof SaleRecord) {
  if (!records) return [] as string[];
  return Array.from(new Set(records.map((r) => String(r[key])).filter(Boolean))).sort();
}

export function GroupManager() {
  const records = useLiveQuery(() => db.records.toArray());
  const productGroups = useLiveQuery(() => db.productGroups.toArray()) ?? [];
  const channelGroups = useLiveQuery(() => db.channelGroups.toArray()) ?? [];
  const displayOverrides = useLiveQuery(() => db.displayNames.toArray()) ?? [];
  const channelDisplayMap = buildDisplayMap(displayOverrides, 'channel');

  const items = (records ?? []).reduce<Map<string, string>>((map, r) => {
    if (r.itemCode) map.set(r.itemCode, r.itemName);
    return map;
  }, new Map());
  const itemOptions = Array.from(items.entries())
    .map(([code, name]) => `${code} | ${name}`)
    .sort();
  const itemNameByCode = items;

  const channelOptions = useDistinct(records, 'channelName').map((raw) => ({
    value: raw,
    label: resolveDisplay(channelDisplayMap, raw),
  }));

  const [newProductGroupName, setNewProductGroupName] = useState('');
  const [newProductGroupItems, setNewProductGroupItems] = useState<string[]>([]);

  const [newChannelGroupName, setNewChannelGroupName] = useState('');
  const [newChannelGroupItems, setNewChannelGroupItems] = useState<string[]>([]);

  const [editingProductGroupId, setEditingProductGroupId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductItems, setEditProductItems] = useState<string[]>([]);

  const [editingChannelGroupId, setEditingChannelGroupId] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelItems, setEditChannelItems] = useState<string[]>([]);

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

  const startEditProductGroup = (id: string, name: string, itemCodes: string[]) => {
    setEditingProductGroupId(id);
    setEditProductName(name);
    setEditProductItems(
      itemCodes.map((code) => `${code} | ${itemNameByCode.get(code) ?? ''}`)
    );
  };

  const saveProductGroupEdit = async (id: string) => {
    if (!editProductName.trim() || editProductItems.length === 0) return;
    await db.productGroups.update(id, {
      name: editProductName.trim(),
      itemCodes: editProductItems.map((s) => s.split(' | ')[0]),
    });
    setEditingProductGroupId(null);
  };

  const startEditChannelGroup = (id: string, name: string, channelNames: string[]) => {
    setEditingChannelGroupId(id);
    setEditChannelName(name);
    setEditChannelItems(channelNames);
  };

  const saveChannelGroupEdit = async (id: string) => {
    if (!editChannelName.trim() || editChannelItems.length === 0) return;
    await db.channelGroups.update(id, {
      name: editChannelName.trim(),
      channelNames: editChannelItems,
    });
    setEditingChannelGroupId(null);
  };

  return (
    <div className="panel">
      <h2>주요 품목 / 채널 그룹 설정</h2>
      <p className="hint">
        대시보드에서 묶어서 볼 품목 그룹과 채널 그룹을 직접 정의할 수 있습니다.
      </p>

      <section className="group-section">
        <h3>주요 품목 그룹</h3>
        <p className="hint">
          품목을 검색해 체크박스로 선택한 뒤 "그룹 추가"를 누르면 그룹이 만들어집니다. 추가 후
          이름 입력칸과 선택 목록이 초기화되니, 같은 방식으로 계속 새 그룹을 만들 수 있습니다.
        </p>
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
          <button
            type="button"
            className="add-group-button"
            disabled={!newProductGroupName.trim() || newProductGroupItems.length === 0}
            onClick={addProductGroup}
          >
            그룹 추가{newProductGroupItems.length > 0 ? ` (${newProductGroupItems.length}개 품목)` : ''}
          </button>
        </div>
        <ul className="group-list">
          {productGroups.map((g) =>
            editingProductGroupId === g.id ? (
              <li key={g.id} className="group-edit-row">
                <input value={editProductName} onChange={(e) => setEditProductName(e.target.value)} />
                <MultiSelectFilter
                  label="포함 품목"
                  options={itemOptions}
                  selected={editProductItems}
                  onChange={setEditProductItems}
                />
                <button
                  type="button"
                  className="add-group-button"
                  disabled={!editProductName.trim() || editProductItems.length === 0}
                  onClick={() => saveProductGroupEdit(g.id)}
                >
                  저장
                </button>
                <button type="button" className="cancel-button" onClick={() => setEditingProductGroupId(null)}>취소</button>
              </li>
            ) : (
              <li key={g.id}>
                <strong>{g.name}</strong> — {g.itemCodes.length}개 품목
                <button type="button" className="edit-button" onClick={() => startEditProductGroup(g.id, g.name, g.itemCodes)}>수정</button>
                <button type="button" className="delete-button" onClick={() => db.productGroups.delete(g.id)}>삭제</button>
              </li>
            )
          )}
          {productGroups.length === 0 && <li className="hint">등록된 품목 그룹 없음</li>}
        </ul>
      </section>

      <section className="group-section">
        <h3>채널 그룹</h3>
        <p className="hint">
          채널을 검색해 체크박스로 선택한 뒤 "그룹 추가"를 누르면 그룹이 만들어집니다. 같은
          방식으로 반복해서 여러 채널 그룹을 만들 수 있습니다.
        </p>
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
          <button
            type="button"
            className="add-group-button"
            disabled={!newChannelGroupName.trim() || newChannelGroupItems.length === 0}
            onClick={addChannelGroup}
          >
            그룹 추가{newChannelGroupItems.length > 0 ? ` (${newChannelGroupItems.length}개 채널)` : ''}
          </button>
        </div>
        <ul className="group-list">
          {channelGroups.map((g) =>
            editingChannelGroupId === g.id ? (
              <li key={g.id} className="group-edit-row">
                <input value={editChannelName} onChange={(e) => setEditChannelName(e.target.value)} />
                <MultiSelectFilter
                  label="포함 채널"
                  options={channelOptions}
                  selected={editChannelItems}
                  onChange={setEditChannelItems}
                />
                <button
                  type="button"
                  className="add-group-button"
                  disabled={!editChannelName.trim() || editChannelItems.length === 0}
                  onClick={() => saveChannelGroupEdit(g.id)}
                >
                  저장
                </button>
                <button type="button" className="cancel-button" onClick={() => setEditingChannelGroupId(null)}>취소</button>
              </li>
            ) : (
              <li key={g.id}>
                <strong>{g.name}</strong> — {g.channelNames.length}개 채널
                <button type="button" className="edit-button" onClick={() => startEditChannelGroup(g.id, g.name, g.channelNames)}>수정</button>
                <button type="button" className="delete-button" onClick={() => db.channelGroups.delete(g.id)}>삭제</button>
              </li>
            )
          )}
          {channelGroups.length === 0 && <li className="hint">등록된 채널 그룹 없음</li>}
        </ul>
      </section>
    </div>
  );
}
