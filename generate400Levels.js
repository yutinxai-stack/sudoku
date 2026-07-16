const fs = require('fs');
const path = require('path');

// 1. 數獨核心求解器 (移植自 utils/sudokuSolver.js 以便 Node.js 執行)
function stringToGrid(boardStr) {
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

function gridToString(grid) {
  return grid.map(row => row.join('')).join('');
}

function isValid(grid, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (grid[row][x] === num && x !== col) return false;
  }
  for (let x = 0; x < 9; x++) {
    if (grid[x][col] === num && x !== row) return false;
  }
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

function findEmptyCell(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function verifyAndSolve(boardStr) {
  if (!boardStr || boardStr.length !== 81) {
    return { hasUnique: false, solution: null };
  }
  const grid = stringToGrid(boardStr);
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

  function solveAndCount(g) {
    const emptyCell = findEmptyCell(g);
    if (!emptyCell) {
      solutionCount++;
      if (solutionCount === 1) {
        firstSolution = gridToString(g);
      }
      return solutionCount >= 2;
    }
    const [row, col] = emptyCell;
    for (let num = 1; num <= 9; num++) {
      if (isValid(g, row, col, num)) {
        g[row][col] = num;
        const stop = solveAndCount(g);
        if (stop) return true;
        g[row][col] = 0;
      }
    }
    return false;
  }

  const gridCopy = JSON.parse(JSON.stringify(grid));
  solveAndCount(gridCopy);
  return {
    hasUnique: solutionCount === 1,
    solution: firstSolution
  };
}

// 2. 四大難度基礎題目
const baseBoards = {
  easy: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  medium: '000260701680070090190004500820100040004602900050003028009300074040050036703018000',
  hard: [
    '235648719',
    '476193285',
    '981725436',
    '123567948',
    '004000100',
    '090000000',
    '500009070',
    '700400000',
    '000001094'
  ].join(''),
  expert: '800000000003600000070090200050007000000045700000100030001000068008500010090000400'
};

// 3. 求解各難度正確的 solution
const baseLevels = {};
console.log('--- 🤖 正在利用 Backtracking 求解基礎關卡正確答案 ---');
for (const diff of Object.keys(baseBoards)) {
  const board = baseBoards[diff];
  const { hasUnique, solution } = verifyAndSolve(board);
  if (!hasUnique || !solution) {
    console.error(`❌ 錯誤：基礎題目 ${diff} 無解或擁有多解！`);
    process.exit(1);
  }
  console.log(`✅ 基礎關卡 ${diff} 驗證成功！擁有唯一解。`);
  baseLevels[diff] = { board, solution };
}

// 4. 隨機洗牌核心
function shuffleArray(arr) {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function rotate90(grid) {
  const rotated = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      rotated[c][8 - r] = grid[r][c];
    }
  }
  return rotated;
}

function reflectDiag(grid) {
  const reflected = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      reflected[c][r] = grid[r][c];
    }
  }
  return reflected;
}

function generateShuffledBoard(baseBoardStr, baseSolutionStr) {
  // 1) 數字隨機映射 (1-9 數字洗牌替換)
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const mappedNums = shuffleArray(nums);
  const mapNum = (char) => {
    if (char === '0') return '0';
    const val = parseInt(char, 10);
    return mappedNums[val - 1].toString();
  };
  let bStr = baseBoardStr.split('').map(mapNum).join('');
  let sStr = baseSolutionStr.split('').map(mapNum).join('');

  // 轉為 2D 陣列
  let bGrid = [];
  let sGrid = [];
  for (let i = 0; i < 9; i++) {
    bGrid.push(bStr.slice(i * 9, i * 9 + 9).split('').map(Number));
    sGrid.push(sStr.slice(i * 9, i * 9 + 9).split('').map(Number));
  }

  // 2) 打亂大行內部 (Row swapping inside blocks)
  const blockIndices = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
  const rowBlocks = shuffleArray(blockIndices);
  const shuffledBGridRows = [];
  const shuffledSGridRows = [];
  for (const block of rowBlocks) {
    const perm = shuffleArray(block);
    for (const r of perm) {
      shuffledBGridRows.push(bGrid[r]);
      shuffledSGridRows.push(sGrid[r]);
    }
  }
  bGrid = shuffledBGridRows;
  sGrid = shuffledSGridRows;

  // 3) 打亂大列內部 (Col swapping inside blocks)
  const colBlocks = shuffleArray(blockIndices);
  const colPerm = [];
  for (const block of colBlocks) {
    const perm = shuffleArray(block);
    colPerm.push(...perm);
  }
  const newBGrid = Array.from({ length: 9 }, () => Array(9).fill(0));
  const newSGrid = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      newBGrid[r][c] = bGrid[r][colPerm[c]];
      newSGrid[r][c] = sGrid[r][colPerm[c]];
    }
  }
  bGrid = newBGrid;
  sGrid = newSGrid;

  // 4) 隨機旋轉與翻轉
  const rotTimes = Math.floor(Math.random() * 4);
  for (let i = 0; i < rotTimes; i++) {
    bGrid = rotate90(bGrid);
    sGrid = rotate90(sGrid);
  }
  if (Math.random() > 0.5) {
    bGrid = reflectDiag(bGrid);
    sGrid = reflectDiag(sGrid);
  }

  return {
    board: bGrid.map(r => r.join('')).join(''),
    solution: sGrid.map(r => r.join('')).join('')
  };
}

// 5. 生成 400 關並自動驗證解答
const difficulties = ['easy', 'medium', 'hard', 'expert'];
const finalLevels = [];

for (const diff of difficulties) {
  console.log(`正在洗牌生成 ${diff} 難度 100 關...`);
  const base = baseLevels[diff];
  const generatedBoards = new Set();

  // 第一關為基礎關卡
  finalLevels.push({
    id: `level_${diff}_1`,
    number: 1,
    difficulty: diff,
    board: base.board,
    solution: base.solution,
    createdAt: new Date().toISOString()
  });
  generatedBoards.add(base.board);

  // 生成後續 99 關
  for (let i = 2; i <= 100; i++) {
    let attempts = 0;
    while (attempts < 500) {
      const { board, solution } = generateShuffledBoard(base.board, base.solution);
      if (!generatedBoards.has(board)) {
        // 自我驗證 Assert：確保洗牌生成出來的關卡確實只有唯一解，且等於 solution 欄位！
        const check = verifyAndSolve(board);
        if (!check.hasUnique || check.solution !== solution) {
          console.error(`⚠️ 警告：第 ${i} 關洗牌出了非唯一解或解不對！重新嘗試...`);
          attempts++;
          continue;
        }

        generatedBoards.add(board);
        finalLevels.push({
          id: `level_${diff}_${i}`,
          number: i,
          difficulty: diff,
          board,
          solution,
          createdAt: new Date().toISOString()
        });
        break;
      }
      attempts++;
    }
  }
}

// 6. 全體總驗證
console.log('--- 🔬 正在進行 400 關總驗證 (確保每一關都有唯一解且解答 100% 正確) ---');
for (const lvl of finalLevels) {
  const check = verifyAndSolve(lvl.board);
  if (!check.hasUnique) {
    console.error(`❌ 嚴重錯誤：關卡 ${lvl.id} 沒有唯一解答！`);
    process.exit(1);
  }
  if (check.solution !== lvl.solution) {
    console.error(`❌ 嚴重錯誤：關卡 ${lvl.id} 的解答不對！`);
    process.exit(1);
  }
}
console.log('✅ 400 關全體總驗證成功！無任何錯題、無任何多解，解答 100% 精準對齊！');

// 7. 寫入檔案
const jsonContent = JSON.stringify(finalLevels, null, 2);
const paths = [
  'G:\\我的雲端硬碟\\sudoku\\public\\data\\data.txt',
  'G:\\我的雲端硬碟\\sudoku\\data\\data.txt',
  'C:\\Users\\hsian\\sudoku_temp\\public\\data\\data.txt'
];

for (const p of paths) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, jsonContent, 'utf-8');
    console.log(`成功寫入關卡至: ${p}`);
  } catch (err) {
    console.error(`寫入檔案失敗 ${p}:`, err);
  }
}

console.log('🎉 400 關卡重建完畢！');
