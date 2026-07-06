import React, { useState, useEffect } from 'react';
import { activeDb, collection, getDocs, doc, setDoc, updateDoc } from '../firebase';
import { Trophy, Coins, HelpCircle, Gamepad2, Award, Calendar } from 'lucide-react';

export default function LobbyPage({ 
  user, 
  userData, 
  onSelectLevel, 
  setCurrentPage 
}) {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // 雲端連線錯誤狀態
  const [activeTab, setActiveTab] = useState('easy'); // easy, medium, hard, expert
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // 載入關卡 (附帶 5 秒超時防卡死機制)
  useEffect(() => {
    let timeoutId;
    let isActive = true;

    async function fetchLevels() {
      try {
        setLoading(true);
        setLoadError(null);

        // 建立 5 秒超時 Promise
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('TIMEOUT'));
          }, 5000);
        });

        // 讀取資料庫 Promise
        const dbPromise = getDocs(collection(activeDb, 'levels'));

        // 進行競爭，若 5 秒內資料庫沒回應（通常是因為 API 未啟用），直接拋出超時
        let querySnapshot = await Promise.race([dbPromise, timeoutPromise]);
        clearTimeout(timeoutId);

        if (!isActive) return;

        let loadedLevels = [];
        querySnapshot.forEach((doc) => {
          loadedLevels.push({ id: doc.id, ...doc.data() });
        });

        // 💡 Auto Seeding 機制：如果發現缺少任何一個難度的第一關，則將對應的預設關卡補入資料庫
        const hasEasy1 = loadedLevels.some(l => l.difficulty === 'easy' && l.number === 1);
        const hasMedium1 = loadedLevels.some(l => l.difficulty === 'medium' && l.number === 1);
        const hasHard1 = loadedLevels.some(l => l.difficulty === 'hard' && l.number === 1);
        const hasExpert1 = loadedLevels.some(l => l.difficulty === 'expert' && l.number === 1);

        if (!hasEasy1 || !hasMedium1 || !hasHard1 || !hasExpert1) {
          const defaultSeedLevels = [];
          if (!hasEasy1) {
            defaultSeedLevels.push({
              id: 'level_1',
              number: 1,
              difficulty: 'easy',
              board: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
              solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
              createdAt: new Date().toISOString()
            });
          }
          if (!hasMedium1) {
            defaultSeedLevels.push({
              id: 'level_2',
              number: 1, // 起始為第一關
              difficulty: 'medium',
              board: '000260701680070090190004500820100040004602900050003028009300074040050036703018000',
              solution: '435269781682571394197834562826195743374682915951743628219356874548917236763428591',
              createdAt: new Date().toISOString()
            });
          }
          if (!hasHard1) {
            defaultSeedLevels.push({
              id: 'level_3',
              number: 1, // 起始為第一關
              difficulty: 'hard',
              board: '000000000000003085001020000000507000004000100090000000500009070700400005000000094',
              solution: '935618247247963185861724539158537962374296158692841573513879426789421365426357891',
              createdAt: new Date().toISOString()
            });
          }
          if (!hasExpert1) {
            defaultSeedLevels.push({
              id: 'level_4',
              number: 1, // 起始為第一關
              difficulty: 'expert',
              board: '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
              solution: '812753649943682175675491283154237896369845721287169534521974368438526917796318452',
              createdAt: new Date().toISOString()
            });
          }

          // 逐一寫入資料庫 (Firestore 或 LocalStorage)
          for (const lvl of defaultSeedLevels) {
            await setDoc(doc(activeDb, 'levels', lvl.id), lvl);
          }

          // 重新抓取
          querySnapshot = await getDocs(collection(activeDb, 'levels'));
          loadedLevels = [];
          querySnapshot.forEach((doc) => {
            loadedLevels.push({ id: doc.id, ...doc.data() });
          });
        }

        // 依關卡序號排序
        loadedLevels.sort((a, b) => a.number - b.number);
        setLevels(loadedLevels);
      } catch (err) {
        if (!isActive) return;
        console.error('載入關卡錯誤:', err);
        if (err.message === 'TIMEOUT' || err.code === 'permission-denied') {
          setLoadError('database-not-active');
        } else {
          setLoadError(err.message || '連線錯誤');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }
    fetchLevels();

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // 載入排行榜
  const handleOpenLeaderboard = async () => {
    setShowLeaderboard(true);
    try {
      const querySnapshot = await getDocs(collection(activeDb, 'users'));
      const usersList = [];
      querySnapshot.forEach((doc) => {
        usersList.push(doc.data());
      });
      // 依金幣降序排序，取前 10
      usersList.sort((a, b) => (b.coins || 0) - (a.coins || 0));
      setLeaderboard(usersList.slice(0, 10));
    } catch (err) {
      console.error('載入排行榜錯誤:', err);
    }
  };

  const getDifficultyLabel = (diff) => {
    switch (diff) {
      case 'easy': return '簡單';
      case 'medium': return '困難';
      case 'hard': return '高手';
      case 'expert': return '專家';
      default: return '未知';
    }
  };

  const tabs = [
    { key: 'easy', label: '簡單' },
    { key: 'medium', label: '困難' },
    { key: 'hard', label: '高手' },
    { key: 'expert', label: '專家' }
  ];

  const filteredLevels = levels.filter(level => level.difficulty === activeTab);

  return (
    <div className="container">
      {/* 使用者狀態 HUD */}
      <div className="hud-bar" style={{ padding: '1.2rem', borderRadius: '1.25rem' }}>
        <div className="hud-item" style={{ fontSize: '1.4rem' }}>
          <Coins size={28} color="#f59e0b" />
          <span>金幣: <strong style={{ color: 'var(--text-coins)', fontSize: '1.6rem' }}>{userData?.coins ?? 0}</strong></span>
        </div>
        <div className="hud-item" style={{ fontSize: '1.4rem' }}>
          <HelpCircle size={28} color="#2563eb" />
          <span>可用提示: <strong style={{ color: 'var(--text-hints)', fontSize: '1.6rem' }}>{userData?.hints ?? 3}</strong></span>
        </div>
        <button 
          className="btn btn-accent" 
          onClick={handleOpenLeaderboard}
          style={{ display: 'flex', gap: '0.4rem', fontSize: '1.2rem', padding: '0.6rem 1.2rem' }}
        >
          <Trophy size={20} />
          <span>黃金排行榜</span>
        </button>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          🎮 數獨關卡挑戰
        </h2>

        {/* 難度頁籤切換 */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`acc-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={{ flex: 1, fontSize: '1.3rem', padding: '0.8rem 0' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', fontSize: '1.4rem', padding: '2rem' }}>
            載入關卡中，請稍候...
          </div>
        ) : loadError ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2.5rem 1.5rem', 
            border: '3px dashed #f87171', 
            borderRadius: '1.25rem', 
            backgroundColor: 'var(--bg-main)', 
            color: 'var(--text-main)',
            margin: '1.5rem 0'
          }}>
            <h3 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>⚠️ 雲端資料庫連線失敗</h3>
            <div style={{ fontSize: '1.25rem', marginBottom: '2rem', lineHeight: '1.8', textAlign: 'left', maxWidth: '560px', margin: '0 auto 2rem auto' }}>
              這通常是因為您剛建立的 Firebase 專案尚未手動啟用雲端服務。<br />
              請用電腦點擊下方連結，登入您的 Google 帳號啟用它們：<br /><br />
              🔹 <strong><a href="https://console.firebase.google.com/project/sudoku-elderly-hsian/firestore" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>啟用步驟 1：建立雲端資料庫 (點此前往)</a></strong><br />
              <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>進去後點選「建立資料庫」➜ 選擇「測試模式」啟用。</span><br /><br />
              🔹 <strong><a href="https://console.firebase.google.com/project/sudoku-elderly-hsian/authentication" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>啟用步驟 2：開啟登入方式 (點此前往)</a></strong><br />
              <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>進去後點選「開始使用」➜ 選擇「電子郵件/密碼」並啟用。</span>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
              style={{ fontSize: '1.4rem', padding: '1rem 2.5rem', minHeight: '3.5rem' }}
            >
              🔄 已啟用，重新整理網頁並連線
            </button>
          </div>
        ) : filteredLevels.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: '1.3rem', padding: '3rem', color: 'var(--text-muted)' }}>
            ⚠️ 目前此難度尚無關卡。
            {userData?.isAdmin && (
              <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>
                您可以點擊右上角「管理後台」新增關卡！
              </p>
            )}
          </div>
        ) : (
          <div className="levels-grid">
            {filteredLevels.map((level) => {
              const isCompleted = userData?.completedLevels?.[level.id]?.completed;
              return (
                <div 
                  key={level.id}
                  className={`level-card ${isCompleted ? 'completed' : ''}`}
                  onClick={() => onSelectLevel(level)}
                  style={{ paddingBottom: '1.2rem' }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '1.3rem' }}>
                    第 {level.number} 關
                  </div>
                  <div className={`level-badge badge-${level.difficulty}`}>
                    {getDifficultyLabel(level.difficulty)}
                  </div>
                  {isCompleted ? (
                    <div style={{ color: '#10b981', fontWeight: 'bold', marginTop: '0.5rem', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                      ✅ 已通關<br/>
                      <span style={{ fontSize: '0.9rem', color: '#059669' }}>(挑戰可得 100 🪙)</span>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', marginTop: '0.5rem', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                      未挑戰<br/>
                      <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>(挑戰可得 200 🪙)</span>
                    </div>
                  )}
                  {/* 新增顯眼的大按鈕，提示長者點擊此處進入關卡 */}
                  <button 
                    className="btn btn-primary" 
                    style={{ 
                      width: '100%', 
                      fontSize: '1.1rem', 
                      padding: '0.4rem 0', 
                      minHeight: '2.8rem',
                      marginTop: '0.5rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onClick={(e) => {
                      // 阻止事件冒泡，因為外層 div 也有 onClick
                      e.stopPropagation();
                      onSelectLevel(level);
                    }}
                  >
                    {isCompleted ? '👉 重新挑戰' : '👉 開始挑戰'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 排行榜 Modal */}
      {showLeaderboard && (
        <div className="modal-overlay" onClick={() => setShowLeaderboard(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '1.5rem', color: '#d97706', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={32} /> 榮譽排行榜
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', fontSize: '1.2rem', padding: '1rem' }}>尚無資料</div>
              ) : (
                leaderboard.map((player, index) => {
                  let medal = '';
                  if (index === 0) medal = '🥇';
                  else if (index === 1) medal = '🥈';
                  else if (index === 2) medal = '🥉';
                  else medal = `${index + 1}.`;

                  return (
                    <div 
                      key={player.uid} 
                      className="list-item"
                      style={{ 
                        fontSize: '1.3rem', 
                        padding: '0.8rem 1.2rem', 
                        borderRadius: '0.5rem',
                        backgroundColor: index < 3 ? 'var(--cell-selected)' : 'transparent',
                        borderBottom: '1px solid var(--border)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: index < 3 ? 'bold' : 'normal' }}>
                        <span style={{ fontSize: '1.5rem', width: '2rem' }}>{medal}</span>
                        <span>{player.email?.split('@')[0]}</span>
                        {player.isAdmin && <span style={{ fontSize: '0.9rem', padding: '0.1rem 0.3rem', background: '#ccc', borderRadius: '4px' }}>管理員</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}>
                        <Coins size={18} color="#f59e0b" />
                        <span>{player.coins || 0}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={() => setShowLeaderboard(false)}
              style={{ width: '100%', fontSize: '1.2rem' }}
            >
              關閉視窗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
