import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { UploadPanel } from './components/UploadPanel';
import { DataTable } from './components/DataTable';
import { GroupManager } from './components/GroupManager';
import { OtherSettings } from './components/OtherSettings';
import { CloudSync } from './components/CloudSync';
import './App.css';

type Tab = 'dashboard' | 'upload' | 'data' | 'groups' | 'other';

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'upload', label: '데이터 업로드' },
  { key: 'data', label: '데이터 관리' },
  { key: 'groups', label: '그룹 설정' },
  { key: 'other', label: '기타 설정' },
];

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="app">
      <header className="app-header">
        <h1>채널/품목 판매 대시보드</h1>
        <nav className="app-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <CloudSync />
      </header>
      <main className="app-main">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'upload' && <UploadPanel />}
        {tab === 'data' && <DataTable />}
        {tab === 'groups' && <GroupManager />}
        {tab === 'other' && <OtherSettings />}
      </main>
    </div>
  );
}

export default App;
