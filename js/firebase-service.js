import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOumz1aAO5IySZ4lavQT7FNIdmAUn1RKI",
  authDomain: "looplang-6ef14.firebaseapp.com",
  projectId: "looplang-6ef14",
  storageBucket: "looplang-6ef14.firebasestorage.app",
  messagingSenderId: "377537534816",
  appId: "1:377537534816:web:07a5b6727767267cbe5c05"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Firebase Auth 與 Firestore 雲端同步模組
 * 負責處理 Google SSO 登入、以及各種使用者產生之資料的雲端讀寫作業。
 */
export const FirebaseService = {
  auth,
  storage,
  
  /**
   * 註冊 Auth 狀態變更監聽器
   * @param {Function} callback - 當登入狀態改變時觸發的回呼函式
   * @returns {import("firebase/auth").Unsubscribe} 卸載監聽器的函式
   */
  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  },

  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  },

  async logout() {
    return signOut(auth);
  },

  // --- Firestore 資料同步區塊 ---

  /**
   * 1. 同步偏好設定與最近播放進度 (存於 users/{uid} 根文件)
   * @param {Object} data - 要寫入的資料物件 (例如 recent, preferences)
   * @returns {Promise<void>}
   */
  async syncUserRoot(data) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const userRef = doc(db, "users", uid);
    // 使用 merge: true 避免洗掉未傳遞的屬性
    await setDoc(userRef, data, { merge: true });
  },

  /**
   * 下載根層級同步資料
   * @returns {Promise<Object|null>} 若有根節點設定則回傳，無則回傳 null
   */
  async pullUserRoot() {
    if (!auth.currentUser) return null;
    const uid = auth.currentUser.uid;
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  },

  /**
   * 2. 同步單一收藏 (新增或覆寫) 
   * 存於 users/{uid}/favorites/{sentenceId} 子集合
   * @param {Object} sentence - 句子與標記資料
   * @returns {Promise<void>}
   */
  async syncFavorite(sentence) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const favRef = doc(db, "users", uid, "favorites", sentence.id);
    await setDoc(favRef, sentence);
  },

  /**
   * 移除單一收藏
   * @param {string} sentenceId - 句子 UUID
   * @returns {Promise<void>}
   */
  async removeFavorite(sentenceId) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const favRef = doc(db, "users", uid, "favorites", sentenceId);
    await deleteDoc(favRef);
  },

  /**
   * 完整拉取所有收藏清單 (用於首頁/登入後 Hydration)
   * @returns {Promise<Array>} 收藏句子的陣列集合
   */
  async pullAllFavorites() {
    if (!auth.currentUser) return [];
    const uid = auth.currentUser.uid;
    const favsSnapshot = await getDocs(collection(db, "users", uid, "favorites"));
    const results = [];
    favsSnapshot.forEach(doc => {
      results.push(doc.data());
    });
    return results;
  },

  /**
   * 3. 同步單筆「已學會」狀態
   * 存於 users/{uid}/learned/{sentenceId} 子集合
   * @param {Object} sentence - 句子狀態物件
   * @returns {Promise<void>}
   */
  async syncLearned(sentence) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const learnedRef = doc(db, "users", uid, "learned", sentence.id);
    await setDoc(learnedRef, sentence);
  },

  /**
   * 移除已學會標記 (退回未學)
   * @param {string} sentenceId - 句子 UUID
   * @returns {Promise<void>}
   */
  async removeLearned(sentenceId) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const learnedRef = doc(db, "users", uid, "learned", sentenceId);
    await deleteDoc(learnedRef);
  },

  /**
   * 完整拉取所有「已學會」清單
   * @returns {Promise<Array>} 已學會句子的陣列集合
   */
  async pullAllLearned() {
    if (!auth.currentUser) return [];
    const uid = auth.currentUser.uid;
    const learnedSnap = await getDocs(collection(db, "users", uid, "learned"));
    const results = [];
    learnedSnap.forEach(doc => {
      results.push(doc.data());
    });
    return results;
  }
};
