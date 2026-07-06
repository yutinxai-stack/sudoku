/**
 * 數獨求解與驗證工具 (Backtracking 演算法)
 */

/**
 * 將 81 字元的字串轉換為 9x9 的 2D 陣列
 * @param {string} boardStr - 81 字元字串，0 代表空格
 * @returns {number[][]} 9x9 2D 陣列
 */
export function stringToGrid(boardStr) {
  const grid = [];
  for (let i = 0; i < 9; i++) {
    const row = [];
    for (let j = 0; j < 9; j++) {
      row.push(parseInt(boardStr[i * 9 + j], 10) || 0);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * 將 9x9 的 2D 陣列轉換為 81 字元的字串
 * @param {number[][]} grid - 9x9 2D 陣列
 * @returns {string} 81 字元字串
 */
export function gridToString(grid) {
  return grid.map(row => row.join('')).join('');
}

/**
 * 檢查在指定位置填入數字是否合法
 * @param {number[][]} grid - 9x9 數獨盤面
 * @param {number} row - 行 index (0-8)
 * @param {number} col - 列 index (0-8)
 * @param {number} num - 要填入的數字 (1-9)
 * @returns {boolean} 是否合法
 */
export function isValid(grid, row, col, num) {
  // 檢查列
  for (let x = 0; x < 9; x++) {
    if (grid[row][x] === num && x !== col) {
      return false;
    }
  }

  // 檢查行
  for (let x = 0; x < 9; x++) {
    if (grid[x][col] === num && x !== row) {
      return false;
    }
  }

  // 檢查 3x3 九宮格
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[i + startRow][j + startCol] === num && (i + startRow !== row || j + startCol !== col)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 尋找下一個空白格
 * @param {number[][]} grid 
 * @returns {[number, number] | null} [row, col] 或 null (代表已填滿)
 */
function findEmptyCell(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        return [r, c];
      }
    }
  }
  return null;
}

/**
 * 使用 Backtracking 求解數獨 (會直接修改傳入的 grid)
 * @param {number[][]} grid - 9x9 數獨盤面
 * @returns {boolean} 是否成功求解
 */
export function solveSudoku(grid) {
  const emptyCell = findEmptyCell(grid);
  if (!emptyCell) {
    return true; // 沒有空格了，表示求解成功
  }

  const [row, col] = emptyCell;
  for (let num = 1; num <= 9; num++) {
    if (isValid(grid, row, col, num)) {
      grid[row][col] = num;

      if (solveSudoku(grid)) {
        return true;
      }

      grid[row][col] = 0; // Backtrack
    }
  }

  return false; // 無解
}

/**
 * 驗證數獨題目是否有唯一解，並回傳解答
 * @param {string} boardStr - 81 字元題目字串
 * @returns {{ hasUnique: boolean, solution: string | null }}
 */
export function verifyAndSolve(boardStr) {
  if (!boardStr || boardStr.length !== 81) {
    return { hasUnique: false, solution: null };
  }

  const grid = stringToGrid(boardStr);
  
  // 先檢查初始盤面是否本身就違反規則
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      if (val !== 0) {
        if (!isValid(grid, r, c, val)) {
          return { hasUnique: false, solution: null };
        }
      }
    }
  }

  let solutionCount = 0;
  let firstSolution = null;

  // 內部遞迴函數，用來找出所有可能的解
  function solveAndCount(g) {
    const emptyCell = findEmptyCell(g);
    if (!emptyCell) {
      solutionCount++;
      if (solutionCount === 1) {
        firstSolution = gridToString(g);
      }
      return solutionCount >= 2; // 找到兩個以上的解就提前終止
    }

    const [row, col] = emptyCell;
    for (let num = 1; num <= 9; num++) {
      if (isValid(g, row, col, num)) {
        g[row][col] = num;
        
        const stop = solveAndCount(g);
        if (stop) return true;

        g[row][col] = 0; // Backtrack
      }
    }
    return false;
  }

  // 複製一份 grid 來求解，避免修改原始 grid
  const gridCopy = JSON.parse(JSON.stringify(grid));
  solveAndCount(gridCopy);

  return {
    hasUnique: solutionCount === 1,
    solution: firstSolution
  };
}
