import React, { useState, useEffect } from 'react';
import { activeDb, collection, getDocs, doc, setDoc, addDoc, deleteDoc, updateDoc } from '../firebase';
import { ArrowLeft, Plus, Trash2, Edit, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { verifyAndSolve, stringToGrid, gridToString } from '../utils/sudokuSolver';

export default function AdminPage({ onBack }) {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 新增/修改彈出視窗狀態
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null); // 若為 null 則是新增，非 null 則是編輯
  const [formNumber, setFormNumber] = useState(1);
  const [formDifficulty, setFormDifficulty] = useState('easy');
  const [formBoard, setFormBoard] = useState(Array(81).fill(0));
  
  // 驗證狀態
  const [verificationResult, setVerificationResult] = useState({ tested: false, valid: false, message: '', solution: '' });
  const [selectedCell, setSelectedCell] = useState(null);

  // 載入所有關卡
  useEffect(() => {
    fetchLevels();
  }, []);

  async function fetchLevels() {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(activeDb, 'levels'));
      const loadedLevels = [];
      querySnapshot.forEach((doc) => {
        loadedLevels.push({ id: doc.id, ...doc.data() });
      });
      // 依關卡序號排序
      loadedLevels.sort((a, b) => a.number - b.number);
      setLevels(loadedLevels);
      
      // 自動推算部分在開啟 Modal 與切換難度時動態計算，此處免全局推算
    } catch (e) {
      console.error(e);
      alert('載入關卡失敗');
    } finally {
      setLoading(false);
    }
  }

  // 根據難度推算下一關的序號
  const getSuggestedNextNumber = (difficulty) => {
    const diffLevels = levels.filter(l => l.difficulty === difficulty);
    if (diffLevels.length > 0) {
      const maxNum = Math.max(...diffLevels.map(l => Number(l.number) || 0));
      return maxNum + 1;
    }
    return 1;
  };

  // 監聽難度變化，在新增模式下自動切換為對應難度的下一個序號
  useEffect(() => {
    if (!editingLevel && showModal) {
      setFormNumber(getSuggestedNextNumber(formDifficulty));
    }
  }, [formDifficulty, editingLevel, showModal, levels]);

  // 開啟新增視窗
  const handleOpenAdd = () => {
    setEditingLevel(null);
    setFormDifficulty('easy');
    setFormBoard(Array(81).fill(0));
    setVerificationResult({ tested: false, valid: false, message: '', solution: '' });
    setSelectedCell(null);
    setFormNumber(getSuggestedNextNumber('easy'));
    setShowModal(true);
  };

  // 開啟編輯視窗
  const handleOpenEdit = (level) => {
    setEditingLevel(level);
    setFormNumber(level.number);
    setFormDifficulty(level.difficulty);
    const boardArr = level.board.split('').map(c => parseInt(c, 10) || 0);
    setFormBoard(boardArr);
    setVerificationResult({
      tested: true,
      valid: true,
      message: '✅ 原關卡已儲存解答驗證無誤',
      solution: level.solution
    });
    setSelectedCell(null);
    setShowModal(true);
  };

  // 刪除關卡
  const handleDelete = async (levelId) => {
    if (window.confirm('確定要刪除此關卡嗎？刪除後將無法復原！')) {
      try {
        await deleteDoc(doc(activeDb, 'levels', levelId));
        alert('關卡已刪除！');
        fetchLevels();
      } catch (e) {
        alert('刪除失敗：' + e.message);
      }
    }
  };

  // 填寫後台 9x9 題目棋盤
  const handleCellClick = (index) => {
    setSelectedCell(index);
  };

  const handleInputNumber = (num) => {
    if (selectedCell === null) return;
    const newBoard = [...formBoard];
    newBoard[selectedCell] = num;
    setFormBoard(newBoard);
    // 重設驗證狀態，因為題目被修改了
    setVerificationResult({ tested: false, valid: false, message: '', solution: '' });
  };

  // 智慧求解與驗證
  const handleVerify = () => {
    const boardStr = formBoard.join('');
    
    // 計算非零格數，數獨題目已知提示數通常至少需有 17 個 (一般而言)，但為了方便測試不強制限縮，只做求解唯一解驗證
    const cluesCount = formBoard.filter(n => n !== 0).length;
    if (cluesCount === 0) {
      setVerificationResult({
        tested: true,
        valid: false,
        message: '❌ 請至少填入幾個數字再進行驗證！',
        solution: ''
      });
      return;
    }

    const { hasUnique, solution } = verifyAndSolve(boardStr);

    if (hasUnique) {
      setVerificationResult({
        tested: true,
        valid: true,
        message: `✅ 驗證成功：此題目擁有「唯一解答」！共有 ${cluesCount} 個提示數字。`,
        solution
      });
    } else {
      if (solution) {
        setVerificationResult({
          tested: true,
          valid: false,
          message: '❌ 驗證失敗：此題目擁有「複數個解答 (多解)」！數獨題必須只有唯一答案。',
          solution: ''
        });
      } else {
        setVerificationResult({
          tested: true,
          valid: false,
          message: '❌ 驗證失敗：此題目「無解」！請檢查是否有行列衝突。',
          solution: ''
        });
      }
    }
  };

  // 儲存關卡
  const handleSave = async () => {
    if (!verificationResult.valid) {
      alert('請先點擊「自動求解與驗證」並確保題目擁有唯一解！');
      return;
    }

    const levelData = {
      number: Number(formNumber),
      difficulty: formDifficulty,
      board: formBoard.join(''),
      solution: verificationResult.solution,
      createdAt: new Date().toISOString()
    };

    try {
      if (editingLevel) {
        // 修改
        await setDoc(doc(activeDb, 'levels', editingLevel.id), levelData, { merge: true });
        alert('關卡修改成功！');
      } else {
        // 新增
        const docId = `level_${levelData.number}_${Date.now().toString().slice(-4)}`;
        await setDoc(doc(activeDb, 'levels', docId), levelData);
        alert('新關卡新增成功！');
      }
      setShowModal(false);
      fetchLevels();
    } catch (e) {
      alert('儲存失敗：' + e.message);
    }
  };

  return (
    <div className="container">
      {/* 頂部導航 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ display: 'flex', gap: '0.25rem', fontSize: '1.2rem', padding: '0.5rem 1rem' }}>
          <ArrowLeft size={24} /> 返回大廳
        </button>
        <h2 style={{ fontSize: '1.8rem' }}>🛠️ 數獨關卡後台管理</h2>
        <button className="btn btn-primary" onClick={handleOpenAdd} style={{ display: 'flex', gap: '0.25rem', fontSize: '1.2rem', padding: '0.5rem 1.2rem' }}>
          <Plus size={22} /> 新增關卡
        </button>
      </div>

      {/* 關卡清單列表 */}
      <div className="card" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', fontSize: '1.3rem', padding: '2rem' }}>載入關卡列表中...</div>
        ) : levels.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: '1.3rem', padding: '3rem', color: 'var(--text-muted)' }}>
            目前尚無任何關卡。請點擊右上角「新增關卡」！
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '3px solid var(--grid-line-bold)', height: '3.5rem' }}>
                  <th style={{ padding: '0.5rem' }}>關卡序號</th>
                  <th style={{ padding: '0.5rem' }}>難度</th>
                  <th style={{ padding: '0.5rem' }}>已知提示數</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((lvl) => {
                  const cluesCount = lvl.board.split('').filter(c => c !== '0').length;
                  return (
                    <tr key={lvl.id} style={{ borderBottom: '2px solid var(--border)', height: '4rem' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>第 {lvl.number} 關</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span className={`level-badge badge-${lvl.difficulty}`} style={{ margin: 0 }}>
                          {lvl.difficulty === 'easy' ? '簡單' : lvl.difficulty === 'medium' ? '困難' : lvl.difficulty === 'hard' ? '高手' : '專家'}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem' }}>{cluesCount} / 81</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleOpenEdit(lvl)}
                          style={{ marginRight: '0.5rem', padding: '0.4rem 0.8rem', minHeight: '2.5rem', minWidth: '2.5rem' }}
                        >
                          <Edit size={16} /> 編輯
                        </button>
                        <button 
                          className="btn btn-danger" 
                          onClick={() => handleDelete(lvl.id)}
                          style={{ padding: '0.4rem 0.8rem', minHeight: '2.5rem', minWidth: '2.5rem' }}
                        >
                          <Trash2 size={16} /> 刪除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新增/編輯 Modal 視窗 */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh' }}>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              {editingLevel ? `✏️ 編輯關卡 - 第 ${formNumber} 關` : '➕ 新增數獨關卡'}
            </h3>

            {/* 屬性設定 */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>關卡序號</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formNumber} 
                  onChange={(e) => setFormNumber(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>難度</label>
                <select 
                  className="form-input" 
                  value={formDifficulty} 
                  onChange={(e) => setFormDifficulty(e.target.value)}
                  style={{ height: '3.3rem' }}
                >
                  <option value="easy">簡單 (Easy)</option>
                  <option value="medium">困難 (Medium)</option>
                  <option value="hard">高手 (Hard)</option>
                  <option value="expert">專家 (Expert)</option>
                </select>
              </div>
            </div>

            {/* 9x9 編輯網格與數字鍵盤 */}
            <div style={{ display: 'flex', gap: '1.5rem', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', display: 'block', textAlign: 'center', marginBottom: '0.5rem' }}>
                  👇 點選格子，再使用下方鍵盤輸入 1-9 (輸入 C 可清除)
                </span>
                
                {/* 9x9 棋盤 */}
                <div className="sudoku-grid" style={{ maxWidth: '380px' }}>
                  {formBoard.map((val, idx) => {
                    const isSelected = selectedCell === idx;
                    const rowIdx = Math.floor(idx / 9);
                    return (
                      <button
                        key={idx}
                        className={`sudoku-cell ${isSelected ? 'selected' : ''} sudoku-cell-row-${rowIdx}`}
                        onClick={() => handleCellClick(idx)}
                        style={{ fontSize: '1.4rem' }}
                      >
                        {val !== 0 ? val : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 編輯鍵盤 */}
              <div className="keyboard-grid" style={{ maxWidth: '380px', width: '100%', marginTop: 0 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button 
                    key={num} 
                    className="key-btn" 
                    onClick={() => handleInputNumber(num)}
                    style={{ fontSize: '1.4rem', padding: '0.5rem' }}
                  >
                    {num}
                  </button>
                ))}
                <button 
                  className="key-btn clear-btn" 
                  onClick={() => handleInputNumber(0)}
                  style={{ fontSize: '1.1rem' }}
                >
                  C
                </button>
              </div>
            </div>

            {/* 驗證區域 */}
            <div className="card" style={{ backgroundColor: 'var(--bg-main)', border: 'none', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>🔍 數獨解答驗證 (智慧求解)</span>
                <button 
                  className="btn btn-primary" 
                  onClick={handleVerify}
                  style={{ padding: '0.4rem 1rem', minHeight: '2.5rem', fontSize: '1rem', display: 'flex', gap: '0.25rem' }}
                >
                  <RefreshCw size={16} /> 求解與驗證
                </button>
              </div>

              {verificationResult.tested ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.5rem', 
                  color: verificationResult.valid ? '#059669' : '#dc2626',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}>
                  {verificationResult.valid ? <Check size={20} style={{ flexShrink: 0 }} /> : <AlertCircle size={20} style={{ flexShrink: 0 }} />}
                  <div>
                    {verificationResult.message}
                    {verificationResult.valid && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        fontFamily: 'monospace', 
                        fontSize: '0.9rem', 
                        color: 'var(--text-muted)', 
                        wordBreak: 'break-all',
                        background: 'var(--bg-card)',
                        padding: '0.5rem',
                        borderRadius: '0.25rem',
                        border: '1px dashed var(--border)'
                      }}>
                        解答: {verificationResult.solution}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>尚未進行驗證。請在儲存前先點擊「求解與驗證」以防發布錯題。</span>
              )}
            </div>

            {/* 底部按鈕 */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowModal(false)}
                style={{ flex: 1, fontSize: '1.2rem' }}
              >
                取消
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={!verificationResult.valid}
                style={{ flex: 1, fontSize: '1.2rem', opacity: verificationResult.valid ? 1 : 0.6 }}
              >
                儲存關卡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
