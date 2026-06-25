import { useEffect, useState } from 'react';
import { db } from '../db';

interface CloudUser {
  isLoggedIn: boolean;
  email?: string;
}

export function CloudSync() {
  const cloudUrl = import.meta.env.VITE_DEXIE_CLOUD_URL as string | undefined;
  const [user, setUser] = useState<CloudUser | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!cloudUrl) return;
    const sub = db.cloud.currentUser.subscribe((u) => {
      setUser(u as CloudUser);
    });
    return () => sub.unsubscribe();
  }, [cloudUrl]);

  useEffect(() => {
    if (!cloudUrl) return;
    const sub = db.cloud.syncState.subscribe((state) => {
      setSyncing(state?.phase === 'pushing' || state?.phase === 'pulling');
    });
    return () => sub.unsubscribe();
  }, [cloudUrl]);

  if (!cloudUrl) return null;

  const isLoggedIn = user?.isLoggedIn;

  return (
    <div className="cloud-sync-bar">
      {isLoggedIn ? (
        <>
          <span className={`cloud-status ${syncing ? 'cloud-syncing' : 'cloud-ok'}`}>
            {syncing ? '⟳ 동기화 중' : '☁ 동기화됨'}
          </span>
          <span className="cloud-email">{user?.email}</span>
          <button
            className="cloud-btn cloud-btn-logout"
            onClick={() => db.cloud.logout()}
          >
            로그아웃
          </button>
        </>
      ) : (
        <>
          <span className="cloud-status cloud-offline">☁ 로컬 전용</span>
          <button
            className="cloud-btn cloud-btn-login"
            onClick={() => db.cloud.login()}
          >
            클라우드 로그인
          </button>
        </>
      )}
    </div>
  );
}
