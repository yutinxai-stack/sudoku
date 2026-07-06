import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbCreateUser,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc as fbDoc, 
  getDoc as fbGetDoc, 
  setDoc as fbSetDoc, 
  updateDoc as fbUpdateDoc, 
  collection as fbCollection,
  query as fbQuery,
  getDocs as fbGetDocs,
  addDoc as fbAddDoc,
  deleteDoc as fbDeleteDoc,
  orderBy as fbOrderBy
} from 'firebase/firestore';

// 檢查環境變數是否已填寫
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasFirebaseConfig = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'your_api_key_here' &&
  firebaseConfig.apiKey.trim() !== '';

let auth;
let db;
let isMock = false;

// 1. 初始化 Mock 系統所需的 LocalStorage 預設資料
function initLocalStorageMock() {
  if (!localStorage.getItem('sudoku_users')) {
    localStorage.setItem('sudoku_users', JSON.stringify({}));
  }
  
  const levelsData = localStorage.getItem('sudoku_levels');
  let isNewFormat = false;
  if (levelsData) {
    try {
      const parsed = JSON.parse(levelsData);
      // 檢查是否中等/困難難度的第一關序號為 1
      const medLvl = parsed.find(l => l.difficulty === 'medium');
      if (medLvl && Number(medLvl.number) === 1) {
        isNewFormat = true;
      }
    } catch (e) {}
  }

  if (!levelsData || !isNewFormat) {
    // 置入包含「簡單、困難、高手、專家」的預設數獨關卡 (起始皆為第一關)
    const defaultLevels = [
      {
        id: 'level_1',
        number: 1,
        difficulty: 'easy',
        // 簡單關卡
        board: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
        solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
        createdAt: new Date().toISOString()
      },
      {
        id: 'level_2',
        number: 1, // 起始為第一關
        difficulty: 'medium',
        // 困難關卡 (medium)
        board: '000260701680070090190004500820100040004602900050003028009300074040050036703018000',
        solution: '435269781682571394197834562826195743374682915951743628219356874548917236763428591',
        createdAt: new Date().toISOString()
      },
      {
        id: 'level_3',
        number: 1, // 起始為第一關
        difficulty: 'hard',
        // 高手關卡 (hard)
        board: '000000000000003085001020000000507000004000100090000000500009070700400005000000094',
        solution: '935618247247963185861724539158537962374296158692841573513879426789421365426357891',
        createdAt: new Date().toISOString()
      },
      {
        id: 'level_4',
        number: 1, // 起始為第一關
        difficulty: 'expert',
        // 專家關卡 (expert) - 世界最難數獨題
        board: '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
        solution: '812753649943682175675491283154237896369845721287169534521974368438526917796318452',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem('sudoku_levels', JSON.stringify(defaultLevels));
  }
}

if (hasFirebaseConfig) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    isMock = false;
  } catch (error) {
    console.error('Firebase 初始化失敗，啟用 Mock 模式:', error);
    isMock = true;
  }
} else {
  console.warn('未偵測到 Firebase Config，將以本地 LocalStorage Mock 模式啟動網頁！');
  isMock = true;
  initLocalStorageMock();
}

// 2. 建立 Mock Firebase 服務
const mockAuthSubscribers = [];
let mockCurrentUser = null;

// 定期觸發 Auth 狀態更新
function triggerAuthChange(user) {
  mockCurrentUser = user;
  mockAuthSubscribers.forEach(cb => cb(user));
}

const mockAuth = {
  isMock: true,
  currentUser: null,
  onAuthStateChanged: (callback) => {
    mockAuthSubscribers.push(callback);
    // 異步模擬，確保 React 在 subscribe 後能收到初始狀態
    setTimeout(() => {
      const savedUser = localStorage.getItem('sudoku_current_user');
      if (savedUser) {
        mockCurrentUser = JSON.parse(savedUser);
        callback(mockCurrentUser);
      } else {
        callback(null);
      }
    }, 100);
    return () => {
      const index = mockAuthSubscribers.indexOf(callback);
      if (index > -1) mockAuthSubscribers.splice(index, 1);
    };
  },
  signInWithEmailAndPassword: async (email, password) => {
    // 簡單模擬：密碼大於 6 位即可登入
    if (!email || password.length < 6) {
      throw new Error('登入失敗，電子信箱格式錯誤或密碼過短');
    }
    const users = JSON.parse(localStorage.getItem('sudoku_users') || '{}');
    const userKey = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // 如果使用者不存在則自動創建，或檢查密碼是否一致
    if (users[userKey]) {
      if (users[userKey].password !== password) {
        throw new Error('密碼錯誤！');
      }
      // 自動註冊
      const cleanName = email.split('@')[0];
      users[userKey] = {
        uid: userKey,
        email,
        password,
        coins: 0, // 註冊送 0 金幣
        hints: 3,   // 註冊送 3 提示
        isAdmin: cleanName === 'admin', // 🌟 如果帳號是 admin，直接賦予管理員權限！
        completedLevels: {}
      };
      localStorage.setItem('sudoku_users', JSON.stringify(users));
    }

    const loggedUser = {
      uid: users[userKey].uid,
      email: users[userKey].email,
      displayName: email.split('@')[0]
    };
    localStorage.setItem('sudoku_current_user', JSON.stringify(loggedUser));
    triggerAuthChange(loggedUser);
    return { user: loggedUser };
  },
  createUserWithEmailAndPassword: async (email, password) => {
    if (password.length < 6) {
      throw new Error('密碼長度需至少 6 個字元');
    }
    const users = JSON.parse(localStorage.getItem('sudoku_users') || '{}');
    const userKey = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (users[userKey]) {
      throw new Error('此電子信箱已被註冊');
    }

    // 第一個註冊的帳號設為管理員
    const isFirstUser = Object.keys(users).length === 0;

    users[userKey] = {
      uid: userKey,
      email,
      password,
      coins: 0,   // 註冊送 0 金幣
      hints: 3,
      isAdmin: isFirstUser, // 第一個註冊的為管理員
      completedLevels: {}
    };
    localStorage.setItem('sudoku_users', JSON.stringify(users));

    const loggedUser = {
      uid: userKey,
      email,
      displayName: email.split('@')[0]
    };
    localStorage.setItem('sudoku_current_user', JSON.stringify(loggedUser));
    triggerAuthChange(loggedUser);
    return { user: loggedUser };
  },
  signOut: async () => {
    localStorage.removeItem('sudoku_current_user');
    triggerAuthChange(null);
  }
};

const mockDb = {
  isMock: true,
  // 模擬 Firestore 的 API
  getDoc: async (docRef) => {
    const { path } = docRef;
    // path 格式為 "users/uid" 或 "levels/id"
    const [collectionName, docId] = path.split('/');
    
    if (collectionName === 'users') {
      const users = JSON.parse(localStorage.getItem('sudoku_users') || '{}');
      const user = users[docId];
      return {
        exists: () => !!user,
        data: () => user
      };
    }
    
    if (collectionName === 'levels') {
      const levels = JSON.parse(localStorage.getItem('sudoku_levels') || '[]');
      const level = levels.find(l => l.id === docId);
      return {
        exists: () => !!level,
        data: () => level
      };
    }

    return { exists: () => false, data: () => null };
  },
  setDoc: async (docRef, data, options) => {
    const { path } = docRef;
    const [collectionName, docId] = path.split('/');
    
    if (collectionName === 'users') {
      const users = JSON.parse(localStorage.getItem('sudoku_users') || '{}');
      if (options && options.merge) {
        users[docId] = { ...users[docId], ...data };
      } else {
        users[docId] = data;
      }
      localStorage.setItem('sudoku_users', JSON.stringify(users));
    }
    
    if (collectionName === 'levels') {
      const levels = JSON.parse(localStorage.getItem('sudoku_levels') || '[]');
      const index = levels.findIndex(l => l.id === docId);
      if (index > -1) {
        levels[index] = options && options.merge ? { ...levels[index], ...data } : data;
      } else {
        levels.push(data);
      }
      localStorage.setItem('sudoku_levels', JSON.stringify(levels));
    }
  },
  updateDoc: async (docRef, data) => {
    const { path } = docRef;
    const [collectionName, docId] = path.split('/');
    
    if (collectionName === 'users') {
      const users = JSON.parse(localStorage.getItem('sudoku_users') || '{}');
      if (users[docId]) {
        users[docId] = { ...users[docId], ...data };
        localStorage.setItem('sudoku_users', JSON.stringify(users));
      } else {
        throw new Error('Document does not exist');
      }
    }
    
    if (collectionName === 'levels') {
      const levels = JSON.parse(localStorage.getItem('sudoku_levels') || '[]');
      const index = levels.findIndex(l => l.id === docId);
      if (index > -1) {
        levels[index] = { ...levels[index], ...data };
        localStorage.setItem('sudoku_levels', JSON.stringify(levels));
      } else {
        throw new Error('Document does not exist');
      }
    }
  },
  getDocs: async (q) => {
    const { collectionName } = q;
    let docs = [];
    if (collectionName === 'levels') {
      const levels = JSON.parse(localStorage.getItem('sudoku_levels') || '[]');
      // 依關卡序號排序
      levels.sort((a, b) => a.number - b.number);
      docs = levels.map(l => ({
        id: l.id,
        data: () => l
      }));
    }
    if (collectionName === 'users') {
      const usersMap = JSON.parse(localStorage.getItem('sudoku_users') || '{}');
      const usersList = Object.values(usersMap);
      docs = usersList.map(u => ({
        id: u.uid,
        data: () => u
      }));
    }
    return {
      docs,
      empty: docs.length === 0,
      forEach: function(cb) {
        docs.forEach(cb);
      }
    };
  },
  addDoc: async (collectionRef, data) => {
    const { collectionName } = collectionRef;
    if (collectionName === 'levels') {
      const levels = JSON.parse(localStorage.getItem('sudoku_levels') || '[]');
      const newId = 'level_' + (levels.length + 1) + '_' + Date.now();
      const newLevel = { ...data, id: newId };
      levels.push(newLevel);
      localStorage.setItem('sudoku_levels', JSON.stringify(levels));
      return { id: newId };
    }
    return { id: 'unknown' };
  },
  deleteDoc: async (docRef) => {
    const { path } = docRef;
    const [collectionName, docId] = path.split('/');
    if (collectionName === 'levels') {
      let levels = JSON.parse(localStorage.getItem('sudoku_levels') || '[]');
      levels = levels.filter(l => l.id !== docId);
      localStorage.setItem('sudoku_levels', JSON.stringify(levels));
    }
  }
};

// 統一導出的 Firebase 引用 (自動依據是否填寫 Config 切換真假)
export const activeAuth = isMock ? mockAuth : auth;
export const activeDb = isMock ? mockDb : db;
export { isMock };

// 統一導出 Firestore 輔助函式，支援 Mock 機制
export function doc(dbRef, collectionName, docId) {
  if (isMock) {
    return { path: `${collectionName}/${docId}` };
  }
  return fbDoc(dbRef, collectionName, docId);
}

export function collection(dbRef, collectionName) {
  if (isMock) {
    return { collectionName };
  }
  return fbCollection(dbRef, collectionName);
}

export function query(collectionRef, ...constraints) {
  if (isMock) {
    return { collectionName: collectionRef.collectionName };
  }
  return fbQuery(collectionRef, ...constraints);
}

export async function getDoc(docRef) {
  if (isMock) {
    return mockDb.getDoc(docRef);
  }
  return fbGetDoc(docRef);
}

export async function setDoc(docRef, data, options) {
  if (isMock) {
    return mockDb.setDoc(docRef, data, options);
  }
  return fbSetDoc(docRef, data, options);
}

export async function updateDoc(docRef, data) {
  if (isMock) {
    return mockDb.updateDoc(docRef, data);
  }
  return fbUpdateDoc(docRef, data);
}

export async function getDocs(queryRef) {
  if (isMock) {
    return mockDb.getDocs(queryRef);
  }
  return fbGetDocs(queryRef);
}

export async function addDoc(collectionRef, data) {
  if (isMock) {
    return mockDb.addDoc(collectionRef, data);
  }
  return fbAddDoc(collectionRef, data);
}

export async function deleteDoc(docRef) {
  if (isMock) {
    return mockDb.deleteDoc(docRef);
  }
  return fbDeleteDoc(docRef);
}

export async function signInWithEmailAndPassword(authRef, email, password) {
  if (isMock) {
    return mockAuth.signInWithEmailAndPassword(email, password);
  }
  return fbSignIn(authRef, email, password);
}

export async function createUserWithEmailAndPassword(authRef, email, password) {
  if (isMock) {
    return mockAuth.createUserWithEmailAndPassword(email, password);
  }
  return fbCreateUser(authRef, email, password);
}

export async function signOut(authRef) {
  if (isMock) {
    return mockAuth.signOut();
  }
  return fbSignOut(authRef);
}

export function onAuthStateChanged(authRef, callback) {
  if (isMock) {
    return mockAuth.onAuthStateChanged(callback);
  }
  return fbOnAuthStateChanged(authRef, callback);
}

export function orderBy(field, direction = 'asc') {
  if (isMock) {
    return { type: 'orderBy', field, direction };
  }
  return fbOrderBy(field, direction);
}
