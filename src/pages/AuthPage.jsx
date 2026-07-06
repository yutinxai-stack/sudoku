import React, { useState } from 'react';
import { activeAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, activeDb, doc, setDoc } from '../firebase';
import { KeyRound, User, UserPlus, LogIn } from 'lucide-react';

const avatars = [
  { char: '🐱', name: '貓咪' },
  { char: '🐶', name: '狗狗' },
  { char: '🐼', name: '熊貓' },
  { char: '🦉', name: '貓頭鷹' },
  { char: '🐰', name: '兔子' },
  { char: '🦊', name: '狐狸' },
  { char: '👴', name: '爺爺' },
  { char: '👵', name: '奶奶' }
];

export default function AuthPage({ isMock, setCurrentPage }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🐱');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 移除非英數字字元，防止 email 格式出錯；如果包含 @ 則視為已是 email
    const cleanUsername = username.trim().toLowerCase();
    const formattedEmail = cleanUsername.includes('@') 
      ? cleanUsername 
      : `${cleanUsername.replace(/[^a-z0-9_]/g, '')}@sudoku.local`;

    if (!cleanUsername) {
      setError('帳號不可為空！');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // 註冊
        const credential = await createUserWithEmailAndPassword(activeAuth, formattedEmail, password);
        const user = credential.user;
        
        // 初始化使用者在資料庫中的 Profile
        await setDoc(doc(activeDb, 'users', user.uid), {
          uid: user.uid,
          email: formattedEmail,
          coins: 0,        // 註冊送 0 金幣
          hints: 3,        // 註冊送 3 提示
          avatar: selectedAvatar, // 可愛動物頭像
          completedLevels: {},
          createdAt: new Date().toISOString()
        }, { merge: true });

        alert('註冊成功！已為您準備好帳號與 3 次提示！');
      } else {
        // 登入
        await signInWithEmailAndPassword(activeAuth, formattedEmail, password);
      }
      setCurrentPage('lobby');
    } catch (err) {
      console.error(err);
      setError(err.message || '認證失敗，請檢查帳號密碼');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card auth-form" style={{ width: '100%' }}>
        <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          {isRegister ? '👵 註冊新帳號' : '👴 數獨登入'}
        </h2>
        
        {isMock && (
          <div style={{ 
            backgroundColor: '#fef3c7', 
            color: '#d97706', 
            padding: '0.8rem', 
            borderRadius: '0.5rem', 
            marginBottom: '1rem',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            border: '2px solid #fcd34d'
          }}>
            💡 提示：目前為離線示範模式。您可以輸入任意英數字「帳號」，密碼至少 6 位，即可登入/註冊。第一個註冊的使用者會自動升級為管理員！
          </div>
        )}

        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            color: '#dc2626', 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            marginBottom: '1.5rem',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            border: '2px solid #fca5a5'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username"><User size={18} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> 帳號 (英數字)</label>
            <input 
              type="text" 
              id="username"
              className="form-input" 
              placeholder="請輸入您的帳號"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              style={{ fontSize: '1.3rem', padding: '1rem' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label htmlFor="password"><KeyRound size={18} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> 密碼 (Password)</label>
            <input 
              type="password" 
              id="password"
              className="form-input" 
              placeholder="請輸入您的密碼 (至少 6 位)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{ fontSize: '1.3rem', padding: '1rem' }}
            />
          </div>

          {isRegister && (
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '1.2rem' }}>👵 選擇您喜歡的可愛頭像：</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {avatars.map((av) => (
                  <button
                    key={av.char}
                    type="button"
                    className={`acc-btn ${selectedAvatar === av.char ? 'active' : ''}`}
                    onClick={() => setSelectedAvatar(av.char)}
                    style={{ fontSize: '2rem', padding: '0.5rem 0', minHeight: '3.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {av.char}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', fontSize: '1.4rem', padding: '1.2rem', minHeight: '3.8rem', display: 'flex', gap: '0.5rem' }}
          >
            {isRegister ? <UserPlus size={24} /> : <LogIn size={24} />}
            {loading ? '處理中...' : (isRegister ? '立即註冊' : '確認登入')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            className="btn btn-secondary"
            style={{ fontSize: '1.1rem', border: 'none', background: 'transparent', textDecoration: 'underline' }}
          >
            {isRegister ? '已經有帳號了？點我登入' : '還沒有帳號嗎？點我註冊'}
          </button>
        </div>
      </div>
    </div>
  );
}
