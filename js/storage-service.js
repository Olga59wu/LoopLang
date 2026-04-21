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

  // 防抖計時器
  _recentSyncTimer: null,

  // --------- 學習進度區塊 ---------

  /**
   * 取得學習進度
   * @param {string} targetLang - 可選，特定語言代碼
   * @returns {Object|null} 針對特定語言的回傳其進度，若無帶參數則回傳時間戳最晚的全域進度
   */
  getRecentLearning(targetLang = null) {
    let data = localStorage.getItem(KEYS.RECENT);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      // 相容舊版存成單一物件的寫法 (判斷是否有 updatedAt 而且有 lang 存在最外層)
      let dict = parsed;
      if (parsed.lang && typeof parsed.lang === 'string' && !parsed[parsed.lang]) {
        dict = { [parsed.lang]: parsed };
      }
      
      if (targetLang) {
        if (dict[targetLang] && typeof dict[targetLang] === 'object') {
           return dict[targetLang];
        }
        return null;
      }
      
      // 無指定語言時，找出 updatedAt 時間最晚（最近使用）的那筆資料
      let latest = null;
      for (const langKey in dict) {
        const item = dict[langKey];
        // 嚴格安全過濾：排除從舊版 Firebase merge 過來的純字串殘留鍵 (例如 "lang": "jp")
        if (item && typeof item === 'object' && item.updatedAt) {
          if (!latest || new Date(item.updatedAt) > new Date(latest.updatedAt)) {
            latest = item;
          }
        }
      }
      return latest;
    } catch (e) {
      console.warn('getRecentLearning parse error', e);
      return null;
    }
  },

  /**
   * 儲存特定語言的當前閱讀位置作為「繼續學習」的跳轉端點
   */
  saveRecentLearning(lang, topicId, sentenceIndex) {
    const newData = {
      lang,
      topicId,
      sentenceIndex,
      updatedAt: new Date().toISOString()
    };
    
    let dict = {};
    const rawData = localStorage.getItem(KEYS.RECENT);
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        // 相容處理
        if (parsed.lang && typeof parsed.lang === 'string' && !parsed[parsed.lang]) {
          dict = { [parsed.lang]: parsed };
        } else {
          // 強制清理被 Firebase merge 污染的純字串屬性
          for (const k in parsed) {
            if (parsed[k] && typeof parsed[k] === 'object' && parsed[k].updatedAt) {
              dict[k] = parsed[k];
            }
          }
        }
      } catch(e) {}
    }
    
    // 寫入/更新對應語言
    dict[lang] = newData;
    localStorage.setItem(KEYS.RECENT, JSON.stringify(dict));
    
    // 雲端同步防抖 (Debounce)：避免連續播放時每換一句話就觸發一次 Firebase 寫入，導致帳單與配額爆表
    if (this._recentSyncTimer) {
      clearTimeout(this._recentSyncTimer);
    }
    
    this._recentSyncTimer = setTimeout(() => {
      FirebaseService.syncUserRoot({ recent: dict })
        .catch(e => console.warn('Recent sync failed', e));
    }, 10000); // 延遲 10 秒執行，這段期間的快速切換將只會保留最後一次狀態上傳
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
    if (Array.isArray(cloudFavorites)) {
      localStorage.setItem(KEYS.FAVORITES, JSON.stringify(cloudFavorites));
    }
    if (Array.isArray(cloudLearned)) {
      localStorage.setItem(KEYS.LEARNED, JSON.stringify(cloudLearned));
    }
  }
};
