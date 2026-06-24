import { useRef, useState } from 'react';
import { db } from '../db';
import { parseEcountWorkbook } from '../lib/parseEcount';
import type { SaleRecord } from '../types';
import { UploadCalendar } from './UploadCalendar';
import { CostUploadPanel } from './CostUploadPanel';

interface ParsedFile {
  fileName: string;
  records: SaleRecord[];
}

interface PendingUpload {
  files: ParsedFile[];
  conflictKeys: Set<string>; // `${date}|${type}`
  conflictLabels: string[]; // 표시용 "date (구분)" 목록
}

const TYPE_LABEL: Record<SaleRecord['type'], string> = { sale: '판매', gift: '사은품' };

export function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingUpload | null>(null);

  const commitFiles = async (files: ParsedFile[], overwriteConflicts: boolean, conflictKeys: Set<string>) => {
    setBusy(true);
    let totalAdded = 0;
    let totalReplaced = 0;
    let totalSkipped = 0;
    try {
      for (const { fileName, records } of files) {
        let toInsert = records;

        if (overwriteConflicts) {
          const dateTypePairs = new Map<string, Set<SaleRecord['type']>>();
          for (const r of records) {
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
        } else {
          toInsert = records.filter((r) => !conflictKeys.has(`${r.date}|${r.type}`));
          totalSkipped += records.length - toInsert.length;
        }

        if (toInsert.length > 0) await db.records.bulkAdd(toInsert);
        totalAdded += toInsert.length;
        setStatus((s) => s + `\n${fileName}: ${toInsert.length}건 반영`);
      }
      setStatus(
        (s) =>
          s +
          `\n\n총 ${totalAdded}건 반영됨` +
          (totalReplaced ? ` (기존 ${totalReplaced}건 교체)` : '') +
          (totalSkipped ? ` (중복 ${totalSkipped}건 건너뜀)` : '')
      );
    } catch (err) {
      setStatus((s) => s + `\n오류: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      setPending(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setStatus('');
    setPending(null);
    try {
      const parsedFiles: ParsedFile[] = [];
      for (const file of Array.from(fileList)) {
        const buf = await file.arrayBuffer();
        const records = parseEcountWorkbook(buf, file.name);
        if (records.length === 0) {
          setStatus((s) => s + `\n${file.name}: 인식 가능한 데이터 없음`);
          continue;
        }
        parsedFiles.push({ fileName: file.name, records });
      }

      if (parsedFiles.length === 0) {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }

      // 업로드하려는 (일자+구분) 조합 중 이미 데이터가 있는 것을 탐지
      const involvedDates = new Set<string>();
      for (const f of parsedFiles) for (const r of f.records) involvedDates.add(r.date);

      const existingKeys = new Set<string>();
      for (const date of involvedDates) {
        const existing = await db.records.where('date').equals(date).toArray();
        for (const e of existing) existingKeys.add(`${e.date}|${e.type}`);
      }

      const conflictKeys = new Set<string>();
      for (const f of parsedFiles) {
        for (const r of f.records) {
          const key = `${r.date}|${r.type}`;
          if (existingKeys.has(key)) conflictKeys.add(key);
        }
      }

      if (conflictKeys.size === 0) {
        await commitFiles(parsedFiles, true, conflictKeys);
        return;
      }

      const conflictLabels = Array.from(conflictKeys)
        .map((k) => {
          const [date, type] = k.split('|');
          return `${date} (${TYPE_LABEL[type as SaleRecord['type']]})`;
        })
        .sort();

      setBusy(false);
      setPending({ files: parsedFiles, conflictKeys, conflictLabels });
    } catch (err) {
      setStatus((s) => s + `\n오류: ${(err as Error).message}`);
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <h2>이카운트 데이터 업로드</h2>
      <p className="hint">
        이카운트에서 추출한 판매현황 / 자가사용현황(사은품) 엑셀 파일을 업로드하세요. 업로드한
        데이터는 계속 누적되며, 같은 일자·같은 구분(판매/사은품)의 데이터가 이미 있으면 확인 후
        최신 업로드 파일 내용으로 교체합니다.
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

      {pending && (
        <div className="upload-conflict-box">
          <p className="hint">
            이미 데이터가 있는 일자와 겹칩니다: <strong>{pending.conflictLabels.join(', ')}</strong>
            <br />
            최신 업로드 파일 내용으로 덮어쓸까요?
          </p>
          <div className="upload-conflict-actions">
            <button
              type="button"
              className="danger-button"
              onClick={() => commitFiles(pending.files, true, pending.conflictKeys)}
            >
              예 (덮어쓰기)
            </button>
            <button
              type="button"
              className="upload-conflict-no"
              onClick={() => commitFiles(pending.files, false, pending.conflictKeys)}
            >
              아니오 (겹치는 일자는 건너뛰기)
            </button>
          </div>
        </div>
      )}

      {status && <pre className="upload-status">{status.trim()}</pre>}
      <UploadCalendar />
      <CostUploadPanel />
    </div>
  );
}
