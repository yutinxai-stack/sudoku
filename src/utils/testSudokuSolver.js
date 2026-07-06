import { verifyAndSolve } from './sudokuSolver.js';

// 測試案例 1：一個有唯一解的簡單數獨題目
const uniquePuzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const expectedSolution = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

console.log('--- 開始測試數獨演算法 ---');

console.log('1. 測試唯一解案例...');
const result1 = verifyAndSolve(uniquePuzzle);
console.log('唯一解結果:', result1.hasUnique);
console.log('是否與預期解答一致:', result1.solution === expectedSolution);

// 測試案例 2：多個解答的題目 (例如空盤面或填寫過少的盤面)
console.log('\n2. 測試多解案例 (全空盤面)...');
const emptyPuzzle = '0'.repeat(81);
const result2 = verifyAndSolve(emptyPuzzle);
console.log('是否為唯一解 (預期應為 false):', result2.hasUnique);
console.log('解答是否存在 (預期應有第一個解):', result2.solution !== null);

// 測試案例 3：無解的題目 (例如有行列衝突)
console.log('\n3. 測試無解案例 (衝突盤面)...');
// 第一列放兩個 5
const invalidPuzzle = '550070000600195000098000060800060003400803001700020006060000280000419005000080079';
const result3 = verifyAndSolve(invalidPuzzle);
console.log('是否為唯一解 (預期應為 false):', result3.hasUnique);
console.log('解答是否存在 (預期應為 null):', result3.solution === null);

console.log('\n--- 測試結束 ---');
