import { useRef, useState } from 'react';
import { db } from '../db';

interface BackupData {
  version: number;
  exportedAt: string;
  records: unknown[];
  productGroups: unknown[];
  channelGroups: unknown[];
  displayNames: unknown[];
  channelTypes: unknown[];
  itemCosts: unknown[];
}

async function exportAllData() {
  const [records, productGroups, channelGroups, displayNames, channelTypes, itemCosts] =
    await Promise.all([
      db.records.toArray(),
      db.productGroups.toArray(),
      db.channelGroups.toArray(),
      db.displayNames.toArray(),
      db.channelTypes.toArray(),
      db.itemCosts.toArray(),
    ]);

  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
    productGroups,
    channelGroups,
    displayNames,
    channelTypes,
    itemCosts,
  };

  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hypermarket-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return records.length;
}

export function DataExportImport() {
  const importRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState<BackupData | null>(null);

  const handleExport = async () => {
    setBusy(true);
    setStatus('');
    try {
      const count = await exportAllData();
      setStatus(`내보내기 완료: 판매 레코드 ${count.toLocaleString('ko-KR')}건 포함`);
    } catch (e) {
      setStatus(`오류: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setBusy(true);
    setStatus('');
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      if (!data.version || !Array.isArray(data.records)) {
        throw new Error('유효하지 않은 백업 파일입니다.');
      }
      setPending(data);
    } catch (e) {
      setStatus(`오류: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const commitImport = async (data: BackupData, overwrite: boolean) => {
    setBusy(true);
    setStatus('');
    setPending(null);
    try {
      if (overwrite) {
        await Promise.all([
          db.records.clear(),
          db.productGroups.clear(),
          db.channelGroups.clear(),
          db.displayNames.clear(),
          db.channelTypes.clear(),
          db.itemCosts.clear(),
        ]);
      }
      await Promise.all([
        db.records.bulkPut(data.records as never[]),
        db.productGroups.bulkPut(data.productGroups as never[]),
        db.channelGroups.bulkPut(data.channelGroups as never[]),
        db.displayNames.bulkPut(data.displayNames as never[]),
        db.channelTypes.bulkPut(data.channelTypes as never[]),
        db.itemCosts.bulkPut(data.itemCosts as never[]),
      ]);
      const mode = overwrite ? '전체 교체' : '병합';
      setStatus(
        `가져오기 완료 (${mode}): 판매 레코드 ${(data.records.length).toLocaleString('ko-KR')}건`
      );
    } catch (e) {
      setStatus(`오류: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel export-import-panel">
      <h3>전체 데이터 백업 / 복원</h3>
      <p className="hint">
        모든 데이터(판매 레코드·그룹·설정 포함)를 JSON 파일로 내보내거나 가져옵니다.
        다른 PC에서 동일한 데이터를 사용할 때 활용하세요.
      </p>

      <div className="export-import-row">
        {/* 내보내기 */}
        <div className="export-import-card">
          <div className="ei-icon">⬇</div>
          <div className="ei-title">데이터 내보내기</div>
          <div className="ei-desc">현재 모든 데이터를 JSON 파일로 저장합니다.</div>
          <button
            type="button"
            className="ei-btn ei-btn-export"
            disabled={busy}
            onClick={handleExport}
          >
            내보내기 (JSON 다운로드)
          </button>
        </div>

        {/* 가져오기 */}
        <div className="export-import-card">
          <div className="ei-icon">⬆</div>
          <div className="ei-title">데이터 가져오기</div>
          <div className="ei-desc">내보낸 JSON 파일을 불러와 데이터를 복원합니다.</div>
          <button
            type="button"
            className="ei-btn ei-btn-import"
            disabled={busy}
            onClick={() => importRef.current?.click()}
          >
            가져오기 (JSON 파일 선택)
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
            }}
          />
        </div>
      </div>

      {/* 가져오기 확인 */}
      {pending && (
        <div className="upload-conflict-box">
          <p className="hint">
            백업 파일: <strong>{new Date(pending.exportedAt).toLocaleString('ko-KR')}</strong> 기준
            &nbsp;/&nbsp; 판매 레코드 <strong>{pending.records.length.toLocaleString('ko-KR')}건</strong>
            <br />
            기존 데이터를 어떻게 처리할까요?
          </p>
          <div className="upload-conflict-actions">
            <button
              type="button"
              className="danger-button"
              onClick={() => commitImport(pending, true)}
            >
              전체 교체 (기존 데이터 삭제 후 가져오기)
            </button>
            <button
              type="button"
              className="upload-conflict-no"
              onClick={() => commitImport(pending, false)}
            >
              병합 (기존 데이터 유지하며 추가)
            </button>
          </div>
        </div>
      )}

      {status && <p className={`ei-status ${status.startsWith('오류') ? 'ei-error' : 'ei-ok'}`}>{status}</p>}
    </div>
  );
}
