// js/storage-service.js
import { FirebaseService } from './firebase-service.js';

/**
 * 鍵名常數：統一定義 LocalStorage 所需之所有 Key
 * 目的是防呆，避免字串輸入錯誤導致無法讀取資料。
 */
const KEYS = {
  FAVORITES: 'looplang_favorites',
  RECENT: 'looplang_recent_learning',
  LEARNED: 'looplang_learned',
  PREF_PAUSE: 'looplang_pref_pause_duration',
  PREF_PHONETIC: 'looplang_pref_show_phonetic',
  PREF_TRANSLATION: 'looplang_pref_show_translation',
  PREF_SPEED: 'looplang_pref_speed',
  PREF_LOOP: 'looplang_pref_loop',
  PREF_MODE: 'looplang_pref_mode',
  PREF_FILTER: 'looplang_pref_filter'
};

/**
 * Storage Service (本地儲存服務模組)
 * 負責單向封裝 LocalStorage，阻絕外部元件直接操作 Storage API。
 * 包含：收藏清單存取、最新播放進度存取與使用者設定存取。
 */
export const StorageService = {
  // --------- 收藏功能區塊 ---------

  /**
   * 取得目前的收藏清單
   * @returns {Array} 收藏的陣列資料
   */
  getFavorites() {
    const data = localStorage.getItem(KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  },
  
  /**
   * 儲存特定句子至收藏庫
   * 如果已存在，則不會重複加入。
   */
  saveFavorite(sentence, lang, langLabel, topicId, topicTitle) {
    const faves = this.getFavorites();
    // 確保存入的句子不重複
    if (!faves.some(f => f.id === sentence.id)) {
      faves.push({
        ...sentence,
        lang,
        langLabel,
        topicId,
        topicTitle,
        addedAt: new Date().toISOString()
      });
      localStorage.setItem(KEYS.FAVORITES, JSON.stringify(faves));
      
      // 背景同步至雲端
      FirebaseService.syncFavorite({
        ...sentence,
        lang, langLabel, topicId, topicTitle,
        addedAt: new Date().toISOString()
      }).catch(e => console.warn('Favorite sync failed', e));
    }
  },

  /**
   * 從收藏清單移除特定句子
   * @param {string} sentenceId - 要刪除的句子 UUID 或自訂 ID
   */
  removeFavorite(sentenceId) {
    let faves = this.getFavorites();
    faves = faves.filter(f => f.id !== sentenceId);
    localStorage.setItem(KEYS.FAVORITES, JSON.stringify(faves));
    
    // 雲端同步刪除
    FirebaseService.removeFavorite(sentenceId).catch(e => console.warn('Favorite remove failed', e));
  },

  // --------- 已學會 (Learned) 區塊 ---------

  getLearned() {
    return JSON.parse(localStorage.getItem(KEYS.LEARNED) || '[]');
  },

  isLearned(sentenceId) {
    const list = this.getLearned();
    return list.some(i => i.id === sentenceId);
  },

  addLearned(sentence, lang, langLabel, topicId, topicTitle) {
    let list = this.getLearned();
    if (!list.some(i => i.id === sentence.id)) {
      list.push({
        ...sentence,
        lang, langLabel, topicId, topicTitle,
        addedAt: new Date().toISOString()
      });
      localStorage.setItem(KEYS.LEARNED, JSON.stringify(list));
      
      FirebaseService.syncLearned({
        ...sentence,
        lang, langLabel, topicId, topicTitle,
        addedAt: new Date().toISOString()
      }).catch(e => console.warn('Learned sync failed', e));
    }
  },

  removeLearned(sentenceId) {
    let list = this.getLearned();
    list = list.filter(i => i.id !== sentenceId);
    localStorage.setItem(KEYS.LEARNED, JSON.stringify(list));
    
    FirebaseService.removeLearned(sentenceId).catch(e => console.warn('Learned remove failed', e));
  },

  /**
   * 檢查該句是否已被收藏
   */
  isFavorite(sentenceId) {
    return this.getFavorites().some(f => f.id === sentenceId);
  },

  // --------- 學習進度區塊 ---------

  /**
   * 取得最近一次學習之語言、進度
   */
  getRecentLearning() {
    const data = localStorage.getItem(KEYS.RECENT);
    return data ? JSON.parse(data) : null;
  },

  /**
   * 儲存當前閱讀位置作為「繼續學習」的跳轉端點
   */
  saveRecentLearning(lang, topicId, sentenceIndex) {
    const recentData = {
      lang,
      topicId,
      sentenceIndex,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(KEYS.RECENT, JSON.stringify(recentData));
    
    // 雲端同步
    FirebaseService.syncUserRoot({ recent: recentData })
      .catch(e => console.warn('Recent sync failed', e));
  },

  // --------- 偏好設定區塊 ---------

  /**
   * 取得全域設定 (預設 2 秒停頓，預設開啟拼音與翻譯顯示)
   */
  getPreferences() {
    let modeRaw = localStorage.getItem(KEYS.PREF_MODE) || 'standard';
    return {
      pauseDuration: parseInt(localStorage.getItem(KEYS.PREF_PAUSE) || '2', 10),
      showPhonetic: localStorage.getItem(KEYS.PREF_PHONETIC) !== 'false',
      showTranslation: localStorage.getItem(KEYS.PREF_TRANSLATION) !== 'false',
      playbackSpeed: parseFloat(localStorage.getItem(KEYS.PREF_SPEED) || '1.0'),
      loopMode: localStorage.getItem(KEYS.PREF_LOOP) || '1', // '1', '3', '5', 'inf'
      playbackMode: modeRaw,
      filterMode: localStorage.getItem(KEYS.PREF_FILTER) || 'all'
    };
  },

  /**
   * 更新全域設定，支援部分參數寫入
   */
  savePreferences(prefs) {
    if (prefs.pauseDuration !== undefined) localStorage.setItem(KEYS.PREF_PAUSE, prefs.pauseDuration);
    if (prefs.showPhonetic !== undefined) localStorage.setItem(KEYS.PREF_PHONETIC, prefs.showPhonetic);
    if (prefs.showTranslation !== undefined) localStorage.setItem(KEYS.PREF_TRANSLATION, prefs.showTranslation);
    if (prefs.playbackSpeed !== undefined) localStorage.setItem(KEYS.PREF_SPEED, prefs.playbackSpeed);
    if (prefs.loopMode !== undefined) localStorage.setItem(KEYS.PREF_LOOP, prefs.loopMode);
    if (prefs.playbackMode !== undefined) localStorage.setItem(KEYS.PREF_MODE, prefs.playbackMode);
    if (prefs.filterMode !== undefined) localStorage.setItem(KEYS.PREF_FILTER, prefs.filterMode);
    
    // 雲端同步
    FirebaseService.syncUserRoot({ preferences: this.getPreferences() })
      .catch(e => console.warn('Preferences sync failed', e));
  },

  // --------- 雲端橋接區塊 ---------

  /**
   * 登出時清空所有本機資料，避免隱私外洩
   */
  clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },

  /**
   * 登入後，將下載下來的雲端根目錄資料與收藏，強制覆蓋本地端
   */
  async syncFromCloud(cloudRoot, cloudFavorites, cloudLearned) {
    if (cloudRoot) {
      if (cloudRoot.recent) {
        localStorage.setItem(KEYS.RECENT, JSON.stringify(cloudRoot.recent));
      }
      if (cloudRoot.preferences) {
        this.savePreferences(cloudRoot.preferences);
      }
    }
    if (cloudFavorites && cloudFavorites.length > 0) {
      localStorage.setItem(KEYS.FAVORITES, JSON.stringify(cloudFavorites));
    }
    if (cloudLearned && cloudLearned.length > 0) {
      localStorage.setItem(KEYS.LEARNED, JSON.stringify(cloudLearned));
    }
  }
};
