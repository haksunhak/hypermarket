import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseItemCostWorkbook } from '../lib/parseItemCost';

export function CostUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const costCount = useLiveQuery(() => db.itemCosts.count()) ?? 0;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    let total = 0;
    try {
      for (const file of Array.from(files)) {
        const buf = await file.arrayBuffer();
        const parsed = parseItemCostWorkbook(buf);
        if (parsed.length === 0) {
          setStatus((s) => s + `\n${file.name}: 인식 가능한 원가 데이터 없음 (품목코드/바코드, 단가 컬럼 확인 필요)`);
          continue;
        }
        await db.itemCosts.bulkPut(parsed);
        total += parsed.length;
        setStatus((s) => s + `\n${file.name}: ${parsed.length}개 품목 원가 반영 완료`);
      }
      setStatus((s) => s + `\n\n총 ${total}개 품목 원가 갱신됨`);
    } catch (err) {
      setStatus((s) => s + `\n오류: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="group-section">
      <h3>품목 원가 업로드</h3>
      <p className="hint">
        품목코드(또는 바코드)와 매입단가(원가) 컬럼이 포함된 엑셀을 업로드하면, 매출원가·판매이익률
        계산에 사용됩니다. 판매 데이터의 품목코드는 바코드와 동일한 값이라 "바코드" 컬럼만 있는
        원가 파일도 그대로 매칭됩니다. 같은 품목코드를 다시 업로드하면 최신 원가로 갱신됩니다. 현재
        등록된 품목 원가: <strong>{costCount}개</strong>
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
