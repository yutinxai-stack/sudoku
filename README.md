# 👵 爺爺奶奶的數獨樂園 (Elderly-Friendly Sudoku)

這是一個專門為 65 歲以上長者設計的數獨遊戲網站。具有大字體、高對比主題、防呆點擊範圍，並內建金幣、提示、排行榜與管理員後台。

---

## 🌟 老人友善設計重點
1. **大字體與無障礙縮放**：頂部控制列可隨時將全網頁字體放大至 `1.2x` 或 `1.4x`。
2. **三種高對比配色**：
   - **預設模式**：清新大氣，色彩分明。
   - **高對比模式 (黑白黃)**：最符合弱視長者辨識的超高對比配色。
   - **護眼暖黃模式**：減輕長時間盯著螢幕的眼睛疲勞。
3. **特大防呆鍵盤**：為避免長者在小鍵盤或手機鍵盤輸入時不便，網格下方提供超大數字鍵盤。所有互動按鈕的點擊面積皆大於 `48px * 48px`。
4. **輔助對齊高亮**：當選中某一格時，該格所屬的行列與九宮格會亮起淡藍色，極易核對。填入衝突數字時會立即顯示紅字。

---

## 🎮 遊戲規則與提示機制
- **通關金幣**：過新關卡得 `200 🪙 + 1 💡`；重玩已通關的舊關卡得 `100 🪙`。
- **免費提示**：每關擁有 **3 次免費提示**。
- **額外提示**：若免費提示用完，將自動扣除 1 個可用提示庫存；若庫存不足，則使用 `100 🪙` 自動購買。
- **排行榜**：依金幣數量列出前十名，激發長者持續挑戰。

---

## 🛠️ 管理後台與智慧求解
- 進入後台需要帳號具備 `isAdmin: true`。
- 後台內建數獨求解器 (Solver)。管理員輸入題目後，點擊「自動求解與驗證」：
  - **唯一解**：驗證通過，自動計算出答案並允許儲存。
  - **多解或無解**：拋出警告，杜絕將錯誤題目上架。

---

## 🚀 快速啟動指南

本專案支援**零配置 Mock 模式**，即使不連接 Firebase，也能在瀏覽器 LocalStorage 完美運作！

### 1. 本地啟動與開發
```bash
# 1. 安裝相依套件 (若未安裝)
npm install --legacy-peer-deps

# 2. 啟動 Vite 本地伺服器
npm run dev
```
啟動後在瀏覽器開啟 `http://localhost:5173`。

### 2. 開箱測試 (LocalStorage Mock)
- 在登入畫面輸入任意 Email 與密碼 (密碼大於 6 位) 即可註冊/登入。
- **第一個註冊的使用者**會自動被設為**管理員 (Admin)**。
- 登入後點擊右上角「管理後台」即可使用 9x9 編輯器與 Solver 驗證。

### 3. 連接真實 Firebase 資料庫
1. 在 [Firebase Console](https://console.firebase.google.com/) 建立一個專案。
2. 啟用 **Authentication** (使用 Email/Password 登入) 與 **Cloud Firestore** 資料庫。
3. 在專案根目錄下建立 `.env.local` 並填入您的 Firebase 設定：
   ```env
   VITE_FIREBASE_API_KEY=您的_API_Key
   VITE_FIREBASE_AUTH_DOMAIN=您的_Auth_Domain
   VITE_FIREBASE_PROJECT_ID=您的_Project_Id
   VITE_FIREBASE_STORAGE_BUCKET=您的_Storage_Bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=您的_Sender_Id
   VITE_FIREBASE_APP_ID=您的_App_Id
   ```
4. 重新啟動 `npm run dev`，系統將自動從 LocalStorage 切換至真實 Firebase 服務！
