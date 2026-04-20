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
  PREF_PLAY_AUDIO: 'looplang_pref_play_audio',
  PREF_CLOUD_AUDIO: 'looplang_pref_cloud_audio',
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

  getPreferences(lang = 'default') {
    const getVal = (keyBase, defaultVal) => {
       const v = localStorage.getItem(`${keyBase}_${lang}`);
       if (v !== null) return v;
       // 降級讀取全域舊設定作為初始值
       const old = localStorage.getItem(keyBase);
       return old !== null ? old : defaultVal;
    };

    return {
      pauseDuration: parseInt(getVal(KEYS.PREF_PAUSE, '2'), 10),
      showPhonetic: getVal(KEYS.PREF_PHONETIC, 'true') !== 'false',
      showTranslation: getVal(KEYS.PREF_TRANSLATION, 'true') !== 'false',
      playTranslationAudio: getVal(KEYS.PREF_PLAY_AUDIO, 'true') !== 'false',
      playbackSpeed: parseFloat(getVal(KEYS.PREF_SPEED, '1.0')),
      loopMode: getVal(KEYS.PREF_LOOP, '1'),
      playbackMode: getVal(KEYS.PREF_MODE, 'standard'),
      filterMode: getVal(KEYS.PREF_FILTER, 'all')
    };
  },

  /**
   * 更新全域或特定語言設定
   */
  savePreferences(prefs, lang = 'default') {
    if (prefs.pauseDuration !== undefined) localStorage.setItem(`${KEYS.PREF_PAUSE}_${lang}`, prefs.pauseDuration);
    if (prefs.showPhonetic !== undefined) localStorage.setItem(`${KEYS.PREF_PHONETIC}_${lang}`, prefs.showPhonetic);
    if (prefs.showTranslation !== undefined) localStorage.setItem(`${KEYS.PREF_TRANSLATION}_${lang}`, prefs.showTranslation);
    if (prefs.playTranslationAudio !== undefined) localStorage.setItem(`${KEYS.PREF_PLAY_AUDIO}_${lang}`, prefs.playTranslationAudio);
    if (prefs.playbackSpeed !== undefined) localStorage.setItem(`${KEYS.PREF_SPEED}_${lang}`, prefs.playbackSpeed);
    if (prefs.loopMode !== undefined) localStorage.setItem(`${KEYS.PREF_LOOP}_${lang}`, prefs.loopMode);
    if (prefs.playbackMode !== undefined) localStorage.setItem(`${KEYS.PREF_MODE}_${lang}`, prefs.playbackMode);
    if (prefs.filterMode !== undefined) localStorage.setItem(`${KEYS.PREF_FILTER}_${lang}`, prefs.filterMode);
    
    // 雲端同步
    FirebaseService.syncUserRoot({ [`preferences_${lang}`]: prefs })
      .catch(e => console.warn('Preferences sync failed', e));
  },

  // --------- 開發與環境區塊 ---------
  getUseCloudAudio() {
    const val = localStorage.getItem(KEYS.PREF_CLOUD_AUDIO);
    return val !== 'false'; // 預設使用雲端
  },

  setUseCloudAudio(value) {
    localStorage.setItem(KEYS.PREF_CLOUD_AUDIO, value ? 'true' : 'false');
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
      
      // 相容舊的全域設定
      if (cloudRoot.preferences) {
        this.savePreferences(cloudRoot.preferences, 'default');
      }

      // 新版分拆語言的設定
      Object.keys(cloudRoot).forEach(key => {
        if (key.startsWith('preferences_')) {
          const lang = key.replace('preferences_', '');
          this.savePreferences(cloudRoot[key], lang);
        }
      });
    }
    if (cloudFavorites && cloudFavorites.length > 0) {
      localStorage.setItem(KEYS.FAVORITES, JSON.stringify(cloudFavorites));
    }
    if (cloudLearned && cloudLearned.length > 0) {
      localStorage.setItem(KEYS.LEARNED, JSON.stringify(cloudLearned));
    }
  }
};
