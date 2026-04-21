import { reactive } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { DeviceService } from './device-service.js';
import { StorageService } from './storage-service.js';

/**
 * 音檔解析器 (Cloud / Local 雙軌)
 * 根據 StorageService 設定，將相對路徑轉換為 Firebase Storage REST API 網址，
 * 或保持本地路徑。
 */
function resolveAudioUrl(path) {
  if (!path) return null;
  if (!StorageService.getUseCloudAudio()) return path;

  let cleanPath = path;
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }

  const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('%2F');
  const bucketName = 'looplang-6ef14.firebasestorage.app';

  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
}

/**
 * 記憶體緩存：將遠端音檔預先下載轉換為 Blob URL，
 * 這能徹底阻斷 iOS 嘗試串流（Streaming）網路檔案所引發的前綴裁切與卡頓問題，
 * 讓每一段音效的播放都達到如同本地檔案一般的瞬發順暢度。
 */
const blobCache = new Map();
const MAX_CACHE_SIZE = 30; // 快取上限

async function getAudioBlobUrl(url) {
  if (!url) return null;
  if (blobCache.has(url)) {
    // 依據 LRU 原則，重新放入以更新順序
    const objectUrl = blobCache.get(url);
    blobCache.delete(url);
    blobCache.set(url, objectUrl);
    return objectUrl;
  }
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error();
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    // 控制記憶體：如果超過上限，釋放最舊的 Blob
    if (blobCache.size >= MAX_CACHE_SIZE) {
      const firstKey = blobCache.keys().next().value;
      URL.revokeObjectURL(blobCache.get(firstKey));
      blobCache.delete(firstKey);
    }
    
    blobCache.set(url, objectUrl);
    return objectUrl;
  } catch (e) {
    return url; // 萬一下載失敗就退回傳統串流
  }
}

/**
 * Player Service (播放引擎)
 * 升級版：直接支援實體 Audio 物件，引入 TTS 作為備援，並掛載硬體控制層與 2 句預載機制。
 */
export const PlayerService = {
  config: {
    pauseDurationSec: 2,
    lang: 'jp',
    speed: 1.0,
    loopMode: '1',
    playbackMode: 'standard'
  },

  state: reactive({
    playPhase: 'idle',
    sentences: [],
    currentIndex: 0,
    isPlaying: false,
    currentLoopIter: 1
  }),

  timeoutId: null,
  currentAudio: null, // 對應 DOM 的 main-player
  keepAliveAudio: null, // 對應 DOM 的 silent-audio
  _mainUnlocked: false,
  playbackSessionId: 0, // 執行序防護標籤，阻絕 TTS 遭掐斷後產生的幽靈重疊

  init(sentences, startIndex = 0, lang = 'jp') {
    this.state.sentences = sentences;
    this.state.currentIndex = startIndex;
    this.config.lang = lang;
    this.state.playPhase = 'idle';
    this.state.isPlaying = false;
    this.state.currentLoopIter = 1;

    this._stopAllAudio();

    // 初始化車機/藍芽控制綁定
    DeviceService.initMediaSession({
      onPlay: () => this.play(),
      onPause: () => this.pause(),
      onNext: () => this.next(),
      onPrev: () => this.prev()
    });

    // 初次預載
    this._preloadNext(this.state.currentIndex);
  },

  updatePlaylist(sentences, newIndex) {
    this.state.sentences = sentences;
    this.state.currentIndex = newIndex;

    // 通知系統刷新 Metadata
    if (this.state.sentences.length > 0 && this.state.currentIndex < this.state.sentences.length) {
      const sentence = this.state.sentences[this.state.currentIndex];
      if (sentence) {
        DeviceService.updateMetadata({
          title: sentence.text,
          album: 'LoopLang',
        });
      }
    }
  },

  setConfig(prefs) {
    if (typeof prefs === 'number') {
      this.config.pauseDurationSec = prefs; // backwards compatibility
      return;
    }
    this.config.pauseDurationSec = prefs.pauseDuration;
    this.config.speed = prefs.playbackSpeed;
    this.config.loopMode = prefs.loopMode;
    this.config.playbackMode = prefs.playbackMode;
    this.config.playTranslationAudio = prefs.playTranslationAudio !== false;
  },

  _ensureDomAudio() {
    // 綁定或建立心跳軌
    let silent = document.getElementById('looplang-silent-track');
    if (!silent) {
      silent = document.createElement('audio');
      silent.id = 'looplang-silent-track';
      silent.loop = true;
      silent.setAttribute('preload', 'auto');
      // 使用與 jpTyping.html 完全相同的極效能 WAV 空白檔
      silent.src = 'data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      document.body.appendChild(silent);
    }
    this.keepAliveAudio = silent;

    // 綁定或建立主音軌
    let main = document.getElementById('looplang-main-track');
    if (!main) {
      main = document.createElement('audio');
      main.id = 'looplang-main-track';
      main.setAttribute('playsinline', '');
      main.setAttribute('preload', 'auto');
      document.body.appendChild(main);
    }
    this.currentAudio = main;
  },

  // 觸發 iOS / Android 嚴苛的媒體限制 (必須在使用者點擊的 callstack 內同步執行)
  _unlockMobileEngines() {
    this._ensureDomAudio();

    // 啟動背景防睡眠音軌
    this.keepAliveAudio.play().catch(() => { });

    // 主音軌實體解鎖：比照 jpTyping，初次給予空音軌取得後續無限讀取權
    if (!this._mainUnlocked) {
      this.currentAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
      this.currentAudio.play().catch(() => { });
      this._mainUnlocked = true;
    }

    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(u);
    }
  },

  play() {
    if (this.state.sentences.length === 0) return;
    this._unlockMobileEngines();

    if (!this.state.isPlaying) {
      this.state.isPlaying = true;
      DeviceService.setPlaybackState('playing');

      // 如果處於暫停中，應該繼續原本階段，為簡化第一版邏輯，此處直接從原文重新起步。
      this._startSentenceEngine();
    }
  },

  pause() {
    this.state.isPlaying = false;
    this.state.playPhase = 'paused';
    this._stopAllAudio();
    if (this.keepAliveAudio) this.keepAliveAudio.pause(); // 真暫停時釋放硬體
    DeviceService.setPlaybackState('paused');
  },

  next() {
    this._unlockMobileEngines();
    this._stopAllAudio();
    this.state.currentLoopIter = 1; // reset loop when directly changing track

    if (this.state.sentences.length === 0) return;

    if (this.state.currentIndex < this.state.sentences.length - 1) {
      this.state.currentIndex++;
    } else {
      // 抵達清單底部時自動繞回第零首，達成全歌單循環
      this.state.currentIndex = 0;
    }

    if (this.state.isPlaying) {
      this._startSentenceEngine();
    } else {
      this.state.playPhase = 'idle';
    }
  },

  prev() {
    this._unlockMobileEngines();
    this._stopAllAudio();
    this.state.currentLoopIter = 1;
    if (this.state.currentIndex > 0) {
      this.state.currentIndex--;
      if (this.state.isPlaying) {
        this._startSentenceEngine();
      } else {
        this.state.playPhase = 'idle';
      }
    }
  },

  replay() {
    this._unlockMobileEngines();
    this._stopAllAudio();
    this.state.isPlaying = true;
    this._startSentenceEngine();
  },

  // --------- 引擎核心邏輯 ---------

  _stopAllAudio() {
    this.playbackSessionId++; // 註銷當前所有非同步任務的派發權限

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      // 不把 currentAudio 設為 null，藉此保留它在 iOS 的生命週期解鎖證明
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  _startSentenceEngine() {
    if (!this.state.isPlaying) return;
    this._stopAllAudio();
    this.state.playPhase = 'playingOriginal';

    const sentence = this.state.sentences[this.state.currentIndex];

    // 通知系統刷新 Metadata
    DeviceService.updateMetadata({
      title: sentence.text,
      album: 'LoopLang',
    });

    // 觸發預載 (當前句 + 後兩句)
    this._preloadNext(this.state.currentIndex);

    const targetUrl = resolveAudioUrl(sentence.audioUrl);

    // 優先播放實體音軌，若失敗則退回 TTS
    this._playAudioFileOrFallback(targetUrl, sentence.ttsText || sentence.text, this.config.lang, () => {
      if (!this.state.isPlaying) return;
      this._pauseAfterOriginal();
    });
  },

  _pauseAfterOriginal() {
    this.state.playPhase = 'pauseAfterOriginal';
    // 移除告知車機 pause，避免行動作業系統趁機關閉音訊硬體導致喚醒延遲與裁切
    // DeviceService.setPlaybackState('paused'); 

    this.timeoutId = setTimeout(() => {
      if (!this.state.isPlaying) return;

      // 如果是「衝刺模式」且使用者關閉讀中文，直接跳過發送翻譯語音
      if (this.config.playbackMode === 'sprint' || !this.config.playTranslationAudio) {
        this._handleLoopOrNext();
      } else {
        this._playTranslation();
      }
    }, this.config.pauseDurationSec * 1000);
  },

  _playTranslation() {
    this.state.playPhase = 'playingTranslation';
    const sentence = this.state.sentences[this.state.currentIndex];

    DeviceService.setPlaybackState('playing');

    // 檢查是否有專屬中譯音檔 (translationAudioUrl)
    const targetUrl = resolveAudioUrl(sentence.translationAudioUrl);

    this._playAudioFileOrFallback(targetUrl, sentence.translation, 'zh-TW', () => {
      if (!this.state.isPlaying) return;
      this._pauseAfterTranslation();
    });
  },

  _pauseAfterTranslation() {
    this.state.playPhase = 'pauseAfterTranslation';
    // 移除告知車機 pause，避免音訊硬體進入休眠
    // DeviceService.setPlaybackState('paused');

    this.timeoutId = setTimeout(() => {
      if (!this.state.isPlaying) return;
      this._handleLoopOrNext();
    }, this.config.pauseDurationSec * 1000);
  },

  _handleLoopOrNext() {
    let mode = this.config.loopMode;
    if (mode === 'inf') {
      this._startSentenceEngine();
      return;
    }
    let targetLoop = parseInt(mode, 10) || 1;
    if (this.state.currentLoopIter < targetLoop) {
      this.state.currentLoopIter++;
      this._startSentenceEngine();
    } else {
      this.next();
    }
  },

  /**
   * 中介代理：優先讀取實體音檔，失敗或無路徑則交涉至 Web Speech API
   * 防呆機制：若有音軌但遭遇 404，也能 catch 到 onerror 再 fallback。
   */
  async _playAudioFileOrFallback(url, fallbackText, langCode, onEndCallback) {
    const expectedSessionId = this.playbackSessionId;

    // 安全過濾器：只有未被註銷的執行序才能驅動狀態機前進
    const safeCallback = () => {
      if (this.playbackSessionId === expectedSessionId) {
        onEndCallback();
      }
    };

    if (url) {
      let audioResolved = false;
      const audio = this.currentAudio;

      audio.onended = null;
      audio.onerror = null;

      // 完全比照 jpTyping.html 的播放流程
      audio.pause();

      // 關鍵升級：將遠端 URL 轉換為已下載完畢的本地 Blob URL
      // 這保證了 audio.play() 瞬間資料已經在記憶體中，完全消滅了因為網路串流等待封包而引發的 0.2 秒裁切
      const finalUrl = await getAudioBlobUrl(url);
      if (this.playbackSessionId !== expectedSessionId) return; // 確保在下載期間沒有被使用者切歌

      audio.src = finalUrl; // <--- 之前這裡的 src 綁定被遺漏了，導致全部音檔解析失敗退回 TTS！
      audio.load();
      audio.playbackRate = this.config.speed; // 比照 jpTyping，靜態綁定不引發動態時序跳動

      // 建立一個等待機制，確保行動端瀏覽器解碼器已準備好
      await new Promise((resolve) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay);
          resolve();
        };
        audio.addEventListener('canplay', onCanPlay);

        // 防呆機制：避免某些極端情況下 canplay 沒觸發導致整個播放器卡死
        setTimeout(() => {
          audio.removeEventListener('canplay', onCanPlay);
          resolve();
        }, 150);
      });

      // 確保在等待解碼的期間，使用者沒有狂按下一首 (Session ID 檢查)
      if (this.playbackSessionId !== expectedSessionId) return;

      const fireFallback = () => {
        if (audioResolved) return;
        audioResolved = true;
        if (this.playbackSessionId !== expectedSessionId) return; // 提早擋下無效操作
        this._speakText(fallbackText, langCode, safeCallback);
      };

      audio.onended = () => {
        if (audioResolved) return;
        audioResolved = true;
        safeCallback();
      };

      audio.onerror = (e) => fireFallback();

      try {
        await audio.play();
      } catch (err) {
        if (err.name === 'AbortError' || err.message.includes('interrupted')) {
          return;
        }
        fireFallback();
      }

    } else {
      // JSON 無指派音檔時，直接走 TTS
      this._speakText(fallbackText, langCode, safeCallback);
    }
  },

  /**
   * TTS 備援播報
   */
  _speakText(text, langCode, onEndCallback) {
    if (!('speechSynthesis' in window)) {
      onEndCallback();
      return;
    }

    // 不在此處執行 cancel() 以免殺掉自己的解鎖行程

    // 移除不穩定的 padding，退回純粹的 TTS (jpTyping 並未加入 padding 且運作良好)
    // 加入 TTS 修復引擎以對齊 jpTyping
    const ttsFixMap = { '暇': 'ひま', '何': 'なに' };
    let queryText = text;
    if (langCode === 'jp') {
      queryText = (ttsFixMap[text] || text).replace(/\s*\/\s*/g, '。');
    } else {
      queryText = text.replace(/\s*\/\s*/g, '，');
    }

    // 強迫 iOS 語音引擎先吐一口氣再唸
    const utterance = new SpeechSynthesisUtterance('　' + queryText);
    utterance.rate = this.config.speed;
    if (langCode === 'jp') utterance.lang = 'ja-JP';
    else if (langCode === 'th') utterance.lang = 'th-TH';
    else if (langCode === 'kr') utterance.lang = 'ko-KR';
    else if (langCode === 'hk') utterance.lang = 'yue-Hant-HK';
    else utterance.lang = 'zh-TW';

    let ttsResolved = false;
    utterance.onend = () => {
      if (ttsResolved) return;
      ttsResolved = true;
      onEndCallback();
    };
    utterance.onerror = () => {
      if (ttsResolved) return;
      ttsResolved = true;
      onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  },

  /**
   * 資源預載引擎：全面升級為 Blob Cache Fetch 模式
   * 我們不再產生多餘的 `new Audio()` 佔用硬體解碼器，
   * 而是純粹透過背景 Fetch 把未來兩句話的音檔先下載到記憶體 (Blob)，
   * 當真正要播時，能達到 0 延遲播放，徹底排除串流引發的前綴裁切。
   */
  _preloadNext(currentIndex) {
    const list = this.state.sentences;
    for (let i = 1; i <= 2; i++) {
      const index = currentIndex + i;
      if (index < list.length) {
        const tgt = list[index];
        const originalUrl = resolveAudioUrl(tgt.audioUrl);
        const transUrl = resolveAudioUrl(tgt.translationAudioUrl);

        if (originalUrl) getAudioBlobUrl(originalUrl);
        if (transUrl) getAudioBlobUrl(transUrl);
      }
    }
  },

  /**
   * 獨立單句播放 (供外部清單頁面如收藏、已學會清單使用)
   * 特性：只播放原文，不播放中文，播完即止
   */
  playSingleTarget(sentence) {
    this._stopAllAudio();
    const targetUrl = resolveAudioUrl(sentence.audioUrl);
    const langCode = sentence.lang || this.config.lang;
    this._playAudioFileOrFallback(targetUrl, sentence.ttsText || sentence.text, langCode, () => {
      // 單播結束，不進行任何後續動作 (不跳針、不播中文)
    });
  },

  /**
   * 點擊單句發音 (附帶中文判斷)
   * 專供主播放器「點擊文字」時使用。不僅發音原文，還會依照設定決定是否唸出中文。
   */
  playSingleInteractive(sentence) {
    this._unlockMobileEngines();
    this.state.isPlaying = false; // 中斷原有的連續播放
    this._stopAllAudio();
    this.state.playPhase = 'playingOriginal';

    const currentSessionId = this.playbackSessionId;

    const targetUrl = resolveAudioUrl(sentence.audioUrl);
    const langCode = sentence.lang || this.config.lang;

    this._playAudioFileOrFallback(targetUrl, sentence.ttsText || sentence.text, langCode, () => {
      if (this.playbackSessionId !== currentSessionId) return;
      if (this.config.playTranslationAudio) {
        this.state.playPhase = 'playingTranslation';
        const transUrl = resolveAudioUrl(sentence.translationAudioUrl);
        this._playAudioFileOrFallback(transUrl, sentence.translation, 'zh-TW', () => {
          if (this.playbackSessionId !== currentSessionId) return;
          this.state.playPhase = 'idle';
        });
      } else {
        this.state.playPhase = 'idle';
      }
    });
  }
};
