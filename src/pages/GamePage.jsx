import React, { useState, useEffect } from 'react';
import { Type, Eye, Lightbulb, Coins, ArrowLeft, RotateCcw, CheckCircle, HelpCircle } from 'lucide-react';
import { activeDb, doc, updateDoc } from '../firebase';
import { stringToGrid, gridToString, isValid } from '../utils/sudokuSolver';

export default function GamePage({ 
  user, 
  userData, 
  level, 
  onBack, 
  onRefreshUserData,
  onUpdateUserDataLocal
}) {
  const [board, setBoard] = useState(Array(81).fill(0));
  const [initialBoard, setInitialBoard] = useState(Array(81).fill(0));
  const [selectedCell, setSelectedCell] = useState(null); // index (0-80)
  const [errors, setErrors] = useState(Array(81).fill(false));
  const [freeHintsUsed, setFreeHintsUsed] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [gameActive, setGameActive] = useState(true);

  // 初始化關卡
  useEffect(() => {
    if (level && level.board) {
      const initArr = level.board.split('').map(c => parseInt(c, 10) || 0);
      setBoard([...initArr]);
      setInitialBoard([...initArr]);
      setSelectedCell(null);
      setFreeHintsUsed(0);
      setGameCompleted(false);
      setTimer(0);
      setGameActive(true);
      calculateErrors(initArr);
    }
  }, [level]);

  // 計時器
  useEffect(() => {
    let interval = null;
    if (gameActive && !gameCompleted) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [gameActive, gameCompleted]);

  // 計算並標示填錯（與解答不符）的格子
  const calculateErrors = (currentBoard) => {
    const newErrors = Array(81).fill(false);
    
    // 檢查每一個使用者填入的數字是否與正確解答相同
    for (let i = 0; i < 81; i++) {
      const val = currentBoard[i];
      // 如果該格子有填入數字，且該格子不是原本題目給定的固定數字
      if (val !== 0 && initialBoard[i] === 0) {
        const correctVal = parseInt(level.solution[i], 10);
        // 如果填入的數字不等於正確解答，標記為錯誤 (字體變紅)
        if (val !== correctVal) {
          newErrors[i] = true;
        }
      }
    }
    setErrors(newErrors);
  };

  // 格式化時間 (MM:SS)
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 點擊格子
  const handleCellClick = (index) => {
    if (gameCompleted) return;
    // 如果是初始題目格，只選取它以亮起相關列（方便對照），但不能修改
    setSelectedCell(index);
  };

  // 行列宮關係高亮
  const isRelated = (idx) => {
    if (selectedCell === null) return false;
    if (selectedCell === idx) return false;
    
    const selRow = Math.floor(selectedCell / 9);
    const selCol = selectedCell % 9;
    const selBoxRow = selRow - (selRow % 3);
    const selBoxCol = selCol - (selCol % 3);

    const curRow = Math.floor(idx / 9);
    const curCol = idx % 9;
    const curBoxRow = curRow - (curRow % 3);
    const curBoxCol = curCol - (curCol % 3);

    // 同列、同行、同 3x3 九宮格
    return (
      selRow === curRow || 
      selCol === curCol || 
      (selBoxRow === curBoxRow && selBoxCol === curBoxCol)
    );
  };

  // 填入數字 (點選虛擬鍵盤或實體按鍵)
  const handleInputNumber = (num) => {
    if (selectedCell === null || gameCompleted) return;
    if (initialBoard[selectedCell] !== 0) return; // 初始格子不能修改

    const newBoard = [...board];
    newBoard[selectedCell] = num;
    setBoard(newBoard);
    calculateErrors(newBoard);

    // 檢查是否通關
    checkCompletion(newBoard);
  };

  // 檢查是否完全通關
  const checkCompletion = async (currentBoard) => {
    // 檢查是否還有空位
    if (currentBoard.includes(0)) return;

    // 檢查是否有衝突
    const grid2D = [];
    for (let r = 0; r < 9; r++) {
      const row = [];
      for (let c = 0; c < 9; c++) {
        row.push(currentBoard[r * 9 + c]);
      }
      grid2D.push(row);
    }

    // 驗證盤面是否全對
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      if (!isValid(grid2D, r, c, currentBoard[i])) {
        return; // 有錯誤，不通關
      }
    }

    // 或者更安全：比對 solution
    const boardStr = currentBoard.join('');
    if (boardStr === level.solution) {
      setGameCompleted(true);
      await awardPlayer();
    }
  };

  // 發放獎勵
  const awardPlayer = async () => {
    const isAlreadyCompleted = userData?.completedLevels?.[level.id]?.completed;
    
    let coinsGained = 0;
    let hintsGained = 0;
    let message = '';

    if (isAlreadyCompleted) {
      // 重玩舊關卡
      coinsGained = 100;
      message = `🎉 挑戰舊關卡成功！獲得 100 金幣 🪙！`;
    } else {
      // 首次挑戰新關卡
      coinsGained = 200;
      hintsGained = 1;
      message = `🎉 恭喜通關全新關卡！獲得 200 金幣 🪙 與 1 個免費提示 💡！`;
    }

    const updatedCoins = (userData.coins || 0) + coinsGained;
    const updatedHints = (userData.hints || 0) + hintsGained;
    
    const completedLevels = { ...(userData.completedLevels || {}) };
    completedLevels[level.id] = {
      completed: true,
      hintsUsedThisRun: freeHintsUsed,
      bestTime: userData?.completedLevels?.[level.id]?.bestTime 
        ? Math.min(userData.completedLevels[level.id].bestTime, timer) 
        : timer,
      completedAt: new Date().toISOString()
    };

    // 🌟 1. 立即進行本地樂觀更新（金幣增加、通關解鎖記錄寫入 state）
    if (onUpdateUserDataLocal) {
      onUpdateUserDataLocal({
        coins: updatedCoins,
        hints: updatedHints,
        completedLevels
      });
    }

    // 🌟 2. 立即彈出通關成功提示！
    alert(message);

    // 🌟 3. 在背景默默寫入雲端。如果寫入失敗，不卡死流程，也已在本地保留了存檔與解鎖效果！
    try {
      if (user) {
        const userRef = doc(activeDb, 'users', user.uid);
        await updateDoc(userRef, {
          coins: updatedCoins,
          hints: updatedHints,
          completedLevels
        });
        if (onRefreshUserData) onRefreshUserData();
      }
    } catch (e) {
      console.warn('雲端更新使用者獎勵失敗 (可能未啟用 Firestore)，已套用本地更新效果。', e);
    }
  };

  // 提示功能
  const handleUseHint = async () => {
    if (selectedCell === null || gameCompleted) {
      alert('請先點選一個格子以填入提示數字！');
      return;
    }
    if (initialBoard[selectedCell] !== 0) {
      alert('此處已是題目原本的數字，無法使用提示！');
      return;
    }

    const currentVal = board[selectedCell];
    const correctVal = parseInt(level.solution[selectedCell], 10);
    if (currentVal === correctVal) {
      alert('此格已是正確的數字囉！');
      return;
    }

    // 檢查是否還有關卡內 3 次的免費提示
    if (freeHintsUsed < 3) {
      // 使用關卡內免費提示
      setFreeHintsUsed(prev => prev + 1);
      const newBoard = [...board];
      newBoard[selectedCell] = correctVal;
      setBoard(newBoard);
      calculateErrors(newBoard);
      alert(`💡 使用本關第 ${freeHintsUsed + 1}/3 次內建提示（完全免費！）`);
      checkCompletion(newBoard);
      return;
    }

    // 超過 3 次，需要購買/扣除提示次數
    let useItem = false;
    let useCoins = false;

    if (userData.hints > 0) {
      useItem = true; // 優先扣除可用提示數
    } else if (userData.coins >= 100) {
      useCoins = true; // 可用提示數不足，扣除 100 金幣
    } else {
      alert('金幣與提示數不足！需要 100 金幣或 1 個可用提示數才能獲得額外提示。');
      return;
    }

    // 進行扣除與更新
    try {
      const userRef = doc(activeDb, 'users', user.uid);
      let updatedHints = userData.hints;
      let updatedCoins = userData.coins;

      if (useItem) {
        updatedHints -= 1;
        alert('💡 本關內建提示已用完，已扣除 1 個可用提示數！');
      } else if (useCoins) {
        updatedCoins -= 100;
        alert('💡 本關內建提示已用完，已使用 100 金幣購買一個提示！');
      }

      await updateDoc(userRef, {
        hints: updatedHints,
        coins: updatedCoins
      });

      // 填入解答
      const newBoard = [...board];
      newBoard[selectedCell] = correctVal;
      setBoard(newBoard);
      calculateErrors(newBoard);
      checkCompletion(newBoard);
      
      onRefreshUserData(); // 更新頂端金幣與提示 HUD
    } catch (e) {
      console.error('扣除金幣或提示失敗:', e);
      alert('提示購買交易失敗，請重試');
    }
  };

  // 重玩關卡 (清除非題目格子)
  const handleReset = () => {
    if (window.confirm('確定要清除所有填寫的數字，重新開始這一關嗎？')) {
      setBoard([...initialBoard]);
      setFreeHintsUsed(0);
      setGameCompleted(false);
      setTimer(0);
      calculateErrors(initialBoard);
    }
  };

  return (
    <div className="container">
      {/* 頂部操作與計時 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ display: 'flex', gap: '0.25rem', fontSize: '1.2rem', padding: '0.5rem 1rem' }}>
          <ArrowLeft size={24} /> 返回大廳
        </button>
        
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          ⏱️ 時間: {formatTime(timer)}
        </div>

        <button className="btn btn-secondary" onClick={handleReset} style={{ display: 'flex', gap: '0.25rem', fontSize: '1.2rem', padding: '0.5rem 1rem' }}>
          <RotateCcw size={20} /> 重玩
        </button>
      </div>

      {/* 頂端金幣/提示 HUD 提示 */}
      <div className="hud-bar" style={{ padding: '0.8rem 1rem', borderRadius: '0.75rem' }}>
        <div className="hud-item" style={{ fontSize: '1.2rem' }}>
          <Coins size={22} color="#f59e0b" /> 金幣: <span style={{ color: 'var(--text-coins)' }}>{userData?.coins ?? 0}</span>
        </div>
        <div className="hud-item" style={{ fontSize: '1.2rem' }}>
          <HelpCircle size={22} color="#2563eb" /> 庫存提示: <span style={{ color: 'var(--text-hints)' }}>{userData?.hints ?? 0}</span>
        </div>
        <div className="hud-item" style={{ fontSize: '1.2rem' }}>
          💡 本關免費提示剩餘: <span style={{ color: 'var(--text-success)' }}>{Math.max(0, 3 - freeHintsUsed)}/3 次</span>
        </div>
      </div>

      {/* 遊戲主要區塊 */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.6rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          第 {level.number} 關 ({level.difficulty === 'easy' ? '簡單' : level.difficulty === 'medium' ? '困難' : level.difficulty === 'hard' ? '高手' : '專家'})
        </h3>

        {/* 左右並排佈局 */}
        <div style={{ 
          display: 'flex', 
          gap: '2rem', 
          justifyContent: 'center', 
          alignItems: 'center', 
          flexWrap: 'wrap'
        }}>
          {/* 左側：數獨 9x9 盤面 */}
          <div style={{ flex: '2', minWidth: '320px', maxWidth: '480px', width: '100%' }}>
            <div className="sudoku-grid">
              {board.map((cellValue, idx) => {
                const isFixed = initialBoard[idx] !== 0;
                const isSelected = selectedCell === idx;
                const isRelatedCell = isRelated(idx);
                const isErr = errors[idx];
                const rowIdx = Math.floor(idx / 9);

                return (
                  <button
                    key={idx}
                    className={`sudoku-cell 
                      ${isFixed ? 'fixed' : 'user-filled'} 
                      ${isSelected ? 'selected' : ''} 
                      ${isRelatedCell ? 'related' : ''} 
                      ${isErr ? 'error' : ''}
                      sudoku-cell-row-${rowIdx}
                    `}
                    onClick={() => handleCellClick(idx)}
                  >
                    {cellValue !== 0 ? cellValue : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 右側：超大數字鍵盤 (排成 3 行 3 列的九宮格，加最底下一行) */}
          <div style={{ flex: '1', minWidth: '200px', maxWidth: '240px', width: '100%' }}>
            <div className="keyboard-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                  key={num} 
                  className="key-btn" 
                  onClick={() => handleInputNumber(num)}
                >
                  {num}
                </button>
              ))}
              {/* 清除鍵 C */}
              <button 
                className="key-btn clear-btn" 
                onClick={() => handleInputNumber(0)}
                title="清除所選格子內的數字"
              >
                C
              </button>
              {/* 提示鍵 Hint */}
              <button 
                className="key-btn hint-btn" 
                onClick={handleUseHint}
                title="取得提示，填入目前選中格子的答案"
                style={{ minHeight: '3.2rem' }}
              >
                <Lightbulb size={24} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> 提示
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 通關慶祝 Modal */}
      {gameCompleted && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '450px', padding: '2.5rem' }}>
            <h3 style={{ fontSize: '2.2rem', color: '#10b981', marginBottom: '1rem' }}>
              🎉 太棒了！過關了！
            </h3>
            <p style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
              花費時間: <strong style={{ fontSize: '1.6rem' }}>{formatTime(timer)}</strong>
            </p>
            
            <div className="card" style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', border: 'none', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>獲得獎勵：</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.3rem', fontWeight: 'bold' }}>
                  <Coins size={22} color="#f59e0b" />
                  <span>+{userData?.completedLevels?.[level.id]?.completed ? 100 : 200}</span>
                </div>
                {!userData?.completedLevels?.[level.id]?.completed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.3rem', fontWeight: 'bold' }}>
                    <HelpCircle size={22} color="#2563eb" />
                    <span>+1 提示</span>
                  </div>
                )}
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={onBack}
              style={{ width: '100%', fontSize: '1.4rem', padding: '1rem' }}
            >
              回關卡大廳
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
