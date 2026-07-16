import React, { useState, useEffect } from 'react';
import { 
  activeAuth, 
  activeDb, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc,
  isMock
} from './firebase';
import AccessibilityBar from './components/AccessibilityBar';
import AuthPage from './pages/AuthPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [currentPage, setCurrentPage] = useState('auth'); // auth, lobby, game, admin
  const [selectedLevel, setSelectedLevel] = useState(null);
  
  // 老人輔助設定，保存於 localStorage，下次開網頁免重新設定
  const [fontScale, setFontScale] = useState(() => {
    return parseFloat(localStorage.getItem('sudoku_font_scale')) || 1.2; // 預設 1.2 倍大字體
  });
  const [theme, setTheme] = useState('default');

  // 監聽字體變化，並儲存與套用
  useEffect(() => {
    localStorage.setItem('sudoku_font_scale', fontScale);
    document.documentElement.style.setProperty('--font-scale', fontScale);
  }, [fontScale]);

  useEffect(() => {
    localStorage.setItem('sudoku_theme', 'default');
  }, []);

  // 監聽 Auth 狀態
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(activeAuth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.uid);
      } else {
        setUserData(null);
        setCurrentPage('auth');
      }
    });
    return () => unsubscribe();
  }, []);

  // 載入使用者金幣、提示、進度
  const fetchUserData = async (uid) => {
    try {
      const userRef = doc(activeDb, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setUserData(userSnap.data());
        if (currentPage === 'auth') {
          setCurrentPage('lobby');
        }
      } else {
        // 如果文件不存在（可能第三方登入或註冊防呆），自動建立
        const initProfile = {
          uid: uid,
          email: activeAuth.currentUser?.email || '',
          coins: 0,
          hints: 3,
          avatar: '🍀', // 預設頭像
          completedLevels: {},
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, initProfile);
        setUserData(initProfile);
        setCurrentPage('lobby');
      }
    } catch (e) {
      console.error('載入使用者資料失敗:', e);
    }
  };

  // 手動刷新使用者資料 (例如通關後、買提示後)
  const handleRefreshUserData = () => {
    if (user) {
      fetchUserData(user.uid);
    }
  };

  // 本地樂觀更新玩家資料，提升即時反應與離線體驗 (支援更新物件或單一頭像字串)
  const handleUpdateUserDataLocal = (updatesOrAvatar) => {
    if (typeof updatesOrAvatar === 'string') {
      setUserData(prev => prev ? { ...prev, avatar: updatesOrAvatar } : { avatar: updatesOrAvatar });
    } else {
      setUserData(prev => prev ? { ...prev, ...updatesOrAvatar } : updatesOrAvatar);
    }
  };

  const handleSelectLevel = (level) => {
    setSelectedLevel(level);
    setCurrentPage('game');
  };

  return (
    <div className={`theme-${theme}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 輔助列 (永遠置頂，提供老人隨時調整) */}
      <AccessibilityBar 
        fontScale={fontScale}
        setFontScale={setFontScale}
        theme={theme}
        setTheme={setTheme}
        user={user}
        userData={userData}
        setCurrentPage={setCurrentPage}
        currentPage={currentPage}
        onRefreshUserData={handleRefreshUserData}
        onUpdateAvatarLocal={handleUpdateUserDataLocal}
      />

      {/* 主畫面切換 */}
      <main style={{ flex: 1, paddingBottom: '3rem' }}>
        {currentPage === 'auth' && (
          <AuthPage 
            isMock={isMock} 
            setCurrentPage={setCurrentPage} 
          />
        )}
        
        {currentPage === 'lobby' && (
          <LobbyPage 
            user={user}
            userData={userData}
            onSelectLevel={handleSelectLevel}
            setCurrentPage={setCurrentPage}
          />
        )}
        
        {currentPage === 'game' && selectedLevel && (
          <GamePage 
            user={user}
            userData={userData}
            level={selectedLevel}
            onBack={() => setCurrentPage('lobby')}
            onRefreshUserData={handleRefreshUserData}
            onUpdateUserDataLocal={handleUpdateUserDataLocal}
          />
        )}
        
        {currentPage === 'admin' && (userData?.isAdmin || (user?.email || '').split('@')[0] === 'admin') && (
          <AdminPage 
            onBack={() => setCurrentPage('lobby')}
          />
        )}
      </main>

      {/* 底部 Mock 提示 */}
      {isMock && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          textAlign: 'center',
          padding: '0.4rem',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          zIndex: 999,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
        }}>
          📢 目前運作於「瀏覽器本地儲存模擬 (LocalStorage)」模式，無需 Firebase 雲端，開箱即用！
        </div>
      )}
    </div>
  );
}
