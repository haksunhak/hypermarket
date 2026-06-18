import { useRef, useState } from 'react';
import { db } from '../db';
import { parseEcountWorkbook } from '../lib/parseEcount';
import type { SaleRecord } from '../types';

export function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    let totalAdded = 0;
    let totalSkipped = 0;
    try {
      for (const file of Array.from(files)) {
        const buf = await file.arrayBuffer();
        const parsed = parseEcountWorkbook(buf, file.name);
        if (parsed.length === 0) {
          setStatus((s) => s + `\n${file.name}: 인식 가능한 데이터 없음`);
          continue;
        }

        // 같은 파일명+일자 범위 중복 업로드 방지: source+date+itemCode+channelName 조합으로 기존 레코드 제거 후 재삽입
        const dates = new Set(parsed.map((p) => p.date));
        const existing = await db.records
          .where('source')
          .equals(parsed[0].source)
          .toArray();
        const existingToRemove = existing.filter((e) => dates.has(e.date));
        if (existingToRemove.length > 0) {
          await db.records.bulkDelete(existingToRemove.map((e) => e.id));
          totalSkipped += existingToRemove.length;
        }

        await db.records.bulkAdd(parsed as SaleRecord[]);
        totalAdded += parsed.length;
        setStatus((s) => s + `\n${file.name}: ${parsed.length}건 업로드 완료`);
      }
      setStatus(
        (s) =>
          s + `\n\n총 ${totalAdded}건 반영됨${totalSkipped ? ` (기존 ${totalSkipped}건 교체)` : ''}`
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
        이카운트에서 추출한 판매현황 / 자가사용현황(사은품) 엑셀 파일을 업로드하세요.
        같은 파일(시트)의 동일 일자 데이터를 다시 올리면 기존 데이터가 교체됩니다.
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
    </div>
  );
}
