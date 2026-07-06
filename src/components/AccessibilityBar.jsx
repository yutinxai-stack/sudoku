import React, { useState } from 'react';
import { Type, Eye, LogOut, Settings } from 'lucide-react';
import { signOut, activeAuth, activeDb, doc, updateDoc } from '../firebase';

const pickerAvatars = ['🐱', '🐶', '🐼', '🦉', '🐰', '🦊', '👴', '👵'];

export default function AccessibilityBar({ 
  fontScale, 
  setFontScale, 
  theme, 
  setTheme, 
  user, 
  userData,
  setCurrentPage,
  currentPage,
  onRefreshUserData,
  onUpdateAvatarLocal
}) {
  const [showPicker, setShowPicker] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(activeAuth);
      setCurrentPage('auth');
    } catch (e) {
      alert('登出失敗: ' + e.message);
    }
  };

  const handleSelectAvatar = async (newAvatar) => {
    if (!user) return;
    
    // 1. 立即更新本地 React state 頭像，讓長者看見一秒變換
    if (onUpdateAvatarLocal) {
      onUpdateAvatarLocal(newAvatar);
    }
    setShowPicker(false);

    // 2. 背景靜默更新雲端
    try {
      const userRef = doc(activeDb, 'users', user.uid);
      await updateDoc(userRef, { avatar: newAvatar });
      if (onRefreshUserData) onRefreshUserData();
    } catch (e) {
      console.warn('雲端更新頭像失敗 (可能未啟用 Firestore)，已套用本地更新效果。', e);
    }
  };

  return (
    <div className="accessibility-bar" style={{ position: 'relative' }}>
      <div className="acc-group">
        <span className="acc-label"><Type size={20} style={{ marginRight: '4px' }} /> 字體大小:</span>
        <button 
          className={`acc-btn ${fontScale === 1.0 ? 'active' : ''}`} 
          onClick={() => setFontScale(1.0)}
          aria-label="標準字體"
        >
          標準
        </button>
        <button 
          className={`acc-btn ${fontScale === 1.2 ? 'active' : ''}`} 
          onClick={() => setFontScale(1.2)}
          style={{ fontSize: '1.2rem' }}
          aria-label="中等字體"
        >
          中
        </button>
        <button 
          className={`acc-btn ${fontScale === 1.4 ? 'active' : ''}`} 
          onClick={() => setFontScale(1.4)}
          style={{ fontSize: '1.4rem' }}
          aria-label="特大字體"
        >
          大
        </button>
      </div>

      <div className="acc-group">
        <span className="acc-label"><Eye size={20} style={{ marginRight: '4px' }} /> 色彩配色:</span>
        <button 
          className={`acc-btn ${theme === 'default' ? 'active' : ''}`} 
          onClick={() => setTheme('default')}
        >
          預設
        </button>
        <button 
          className={`acc-btn ${theme === 'high-contrast' ? 'active' : ''}`} 
          onClick={() => setTheme('high-contrast')}
        >
          高對比(黑黃)
        </button>
        <button 
          className={`acc-btn ${theme === 'eye-care' ? 'active' : ''}`} 
          onClick={() => setTheme('eye-care')}
        >
          護眼(暖黃)
        </button>
      </div>

      {user && (
        <div className="acc-group" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          {/* 點擊可更換頭像的外框 */}
          <div 
            style={{ 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              marginRight: '1rem',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem',
              borderRadius: '0.5rem',
              border: '2px solid var(--border)',
              backgroundColor: 'var(--bg-main)'
            }}
            onClick={() => setShowPicker(!showPicker)}
            title="點擊更換頭像"
          >
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>
              {userData?.avatar || '👴'}
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
              歡迎, {(userData?.email || user?.email || '').split('@')[0]}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.4rem', fontWeight: 'normal' }}>(v1.0.3)</span>
            </span>

            {/* 浮動的頭像選擇器氣泡 */}
            {showPicker && (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '105%', 
                  left: 0, 
                  backgroundColor: 'var(--bg-card)', 
                  border: '3px solid var(--border)', 
                  borderRadius: '1rem', 
                  padding: '0.75rem', 
                  zIndex: 9999,
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.5rem',
                  minWidth: '220px'
                }}
                onClick={(e) => e.stopPropagation()} // 防止點選彈窗本身導致關閉
              >
                {pickerAvatars.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => handleSelectAvatar(av)}
                    style={{ 
                      fontSize: '1.8rem', 
                      background: 'none', 
                      border: '2px solid transparent', 
                      cursor: 'pointer',
                      borderRadius: '0.5rem',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    {av}
                  </button>
                ))}
              </div>
            )}
          </div>

          {userData?.isAdmin && currentPage !== 'admin' && (
            <button 
              className="acc-btn" 
              onClick={() => setCurrentPage('admin')}
              style={{ marginRight: '0.5rem', backgroundColor: '#e2e8f0' }}
            >
              <Settings size={18} style={{ marginRight: '4px' }} /> 管理後台
            </button>
          )}
          {currentPage === 'admin' && (
            <button 
              className="acc-btn" 
              onClick={() => setCurrentPage('lobby')}
              style={{ marginRight: '0.5rem', backgroundColor: '#e2e8f0' }}
            >
              返回大廳
            </button>
          )}
          <button 
            className="acc-btn" 
            onClick={handleLogout}
            style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}
          >
            <LogOut size={18} style={{ marginRight: '4px' }} /> 登出
          </button>
        </div>
      )}
    </div>
  );
}
