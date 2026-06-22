import { useRef, useState } from 'react';
import { db } from '../db';
import { parseEcountWorkbook } from '../lib/parseEcount';
import type { SaleRecord } from '../types';
import { UploadCalendar } from './UploadCalendar';
import { CostUploadPanel } from './CostUploadPanel';

export function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    let totalAdded = 0;
    let totalReplaced = 0;
    try {
      for (const file of Array.from(files)) {
        const buf = await file.arrayBuffer();
        const parsed = parseEcountWorkbook(buf, file.name);
        if (parsed.length === 0) {
          setStatus((s) => s + `\n${file.name}: 인식 가능한 데이터 없음`);
          continue;
        }

        // 파일명과 무관하게 "같은 일자 + 같은 구분(판매/사은품)" 데이터는 새로 업로드한 내용으로 교체
        const dateTypePairs = new Map<string, Set<SaleRecord['type']>>();
        for (const r of parsed) {
          if (!dateTypePairs.has(r.date)) dateTypePairs.set(r.date, new Set());
          dateTypePairs.get(r.date)!.add(r.type);
        }
        for (const [date, types] of dateTypePairs) {
          const existingOnDate = await db.records.where('date').equals(date).toArray();
          const toRemove = existingOnDate.filter((e) => types.has(e.type));
          if (toRemove.length > 0) {
            await db.records.bulkDelete(toRemove.map((e) => e.id));
            totalReplaced += toRemove.length;
          }
        }

        await db.records.bulkAdd(parsed);
        totalAdded += parsed.length;
        setStatus((s) => s + `\n${file.name}: ${parsed.length}건 업로드 완료`);
      }
      setStatus(
        (s) =>
          s + `\n\n총 ${totalAdded}건 반영됨${totalReplaced ? ` (기존 ${totalReplaced}건 교체)` : ''}`
      );
    } catch (err) {
      setStatus((s) => s + `\n오류: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="panel">
      <h2>이카운트 데이터 업로드</h2>
      <p className="hint">
        이카운트에서 추출한 판매현황 / 자가사용현황(사은품) 엑셀 파일을 업로드하세요. 업로드한
        데이터는 계속 누적되며, 같은 일자·같은 구분(판매/사은품)의 데이터를 다시 올리면 파일명이
        달라도 기존 데이터를 새 내용으로 교체합니다.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        multiple
        disabled={busy}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {busy && <p>처리 중...</p>}
      {status && <pre className="upload-status">{status.trim()}</pre>}
      <UploadCalendar />
      <CostUploadPanel />
    </div>
  );
}
