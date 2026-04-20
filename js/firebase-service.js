import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const googleProvider = new GoogleAuthProvider();

export const FirebaseService = {
  auth,
  
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

  // 1. 同步偏好設定與進度 (存於 users/{uid} 根文件)
  async syncUserRoot(data) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const userRef = doc(db, "users", uid);
    // 使用 merge: true 避免洗掉未傳遞的屬性
    await setDoc(userRef, data, { merge: true });
  },

  async pullUserRoot() {
    if (!auth.currentUser) return null;
    const uid = auth.currentUser.uid;
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  },

  // 2. 同步單一收藏 (存於 users/{uid}/favorites/{sentenceId})
  async syncFavorite(sentence) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const favRef = doc(db, "users", uid, "favorites", sentence.id);
    await setDoc(favRef, sentence);
  },

  async removeFavorite(sentenceId) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const favRef = doc(db, "users", uid, "favorites", sentenceId);
    await deleteDoc(favRef);
  },

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

  // 3. 同步已學會狀態 (存於 users/{uid}/learned/{sentenceId})
  async syncLearned(sentence) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const learnedRef = doc(db, "users", uid, "learned", sentence.id);
    await setDoc(learnedRef, sentence);
  },

  async removeLearned(sentenceId) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const learnedRef = doc(db, "users", uid, "learned", sentenceId);
    await deleteDoc(learnedRef);
  },

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
