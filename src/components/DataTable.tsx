import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { SaleRecord } from '../types';

const PAGE_SIZE = 50;

type EditableField = 'date' | 'channelName' | 'itemName' | 'group2' | 'group3' | 'qty' | 'supplyAmount' | 'vat' | 'totalAmount';

export function DataTable() {
  const records = useLiveQuery(() => db.records.orderBy('date').reverse().toArray()) ?? [];
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SaleRecord | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) =>
        r.itemName.toLowerCase().includes(q) ||
        r.itemCode.toLowerCase().includes(q) ||
        r.channelName.toLowerCase().includes(q) ||
        r.date.includes(q)
    );
  }, [records, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRecords = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const startEdit = (r: SaleRecord) => {
    setEditingId(r.id);
    setDraft({ ...r });
  };

  const setField = (field: EditableField, value: string) => {
    if (!draft) return;
    if (['qty', 'supplyAmount', 'vat', 'totalAmount'].includes(field)) {
      setDraft({ ...draft, [field]: Number(value) || 0 });
    } else {
      setDraft({ ...draft, [field]: value });
    }
  };

  const saveEdit = async () => {
    if (!draft) return;
    await db.records.update(draft.id, { ...draft });
    setEditingId(null);
    setDraft(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('이 데이터를 삭제할까요?')) return;
    await db.records.delete(id);
  };

  return (
    <div className="panel">
      <h2>업로드 데이터 관리</h2>
      <p className="hint">잘못 입력된 데이터를 검색하여 직접 수정하거나 삭제할 수 있습니다.</p>
      <input
        className="search-input"
        placeholder="품목명, 품목코드, 채널, 날짜 검색"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
      />
      <table className="data-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>채널</th>
            <th>품목코드</th>
            <th>품목명</th>
            <th>카테고리</th>
            <th>브랜드</th>
            <th>수량</th>
            <th>공급가액</th>
            <th>부가세</th>
            <th>합계</th>
            <th>구분</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pageRecords.map((r) => {
            const isEditing = editingId === r.id;
            const row = isEditing && draft ? draft : r;
            return (
              <tr key={r.id} className={isEditing ? 'editing-row' : ''}>
                <td>
                  {isEditing ? (
                    <input type="date" value={row.date} onChange={(e) => setField('date', e.target.value)} />
                  ) : (
                    row.date
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input value={row.channelName} onChange={(e) => setField('channelName', e.target.value)} />
                  ) : (
                    row.channelName
                  )}
                </td>
                <td>{r.itemCode}</td>
                <td>
                  {isEditing ? (
                    <input value={row.itemName} onChange={(e) => setField('itemName', e.target.value)} />
                  ) : (
                    row.itemName
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input value={row.group2} onChange={(e) => setField('group2', e.target.value)} />
                  ) : (
                    row.group2
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input value={row.group3} onChange={(e) => setField('group3', e.target.value)} />
                  ) : (
                    row.group3
                  )}
                </td>
                <td className="num">
                  {isEditing ? (
                    <input type="number" value={row.qty} onChange={(e) => setField('qty', e.target.value)} />
                  ) : (
                    row.qty.toLocaleString('ko-KR')
                  )}
                </td>
                <td className="num">
                  {isEditing ? (
                    <input type="number" value={row.supplyAmount} onChange={(e) => setField('supplyAmount', e.target.value)} />
                  ) : (
                    row.supplyAmount.toLocaleString('ko-KR')
                  )}
                </td>
                <td className="num">
                  {isEditing ? (
                    <input type="number" value={row.vat} onChange={(e) => setField('vat', e.target.value)} />
                  ) : (
                    row.vat.toLocaleString('ko-KR')
                  )}
                </td>
                <td className="num">
                  {isEditing ? (
                    <input type="number" value={row.totalAmount} onChange={(e) => setField('totalAmount', e.target.value)} />
                  ) : (
                    row.totalAmount.toLocaleString('ko-KR')
                  )}
                </td>
                <td>{row.type === 'sale' ? '판매' : '사은품'}</td>
                <td className="row-actions">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={saveEdit}>저장</button>
                      <button type="button" onClick={cancelEdit}>취소</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(r)}>수정</button>
                      <button type="button" onClick={() => deleteRecord(r.id)}>삭제</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {pageRecords.length === 0 && (
            <tr>
              <td colSpan={12} className="hint">데이터가 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="pagination">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>이전</button>
        <span>{page + 1} / {pageCount} ({filtered.length}건)</span>
        <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>다음</button>
      </div>
    </div>
  );
}
