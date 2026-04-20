// js/player-service.js
import { reactive } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { DeviceService } from './device-service.js';

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
  currentAudio: null, // 持有目前播放之 Audio 物件引用

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
  },

  play() {
    if (this.state.sentences.length === 0) return;
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
    DeviceService.setPlaybackState('paused');
  },

  next() {
    this._stopAllAudio();
    this.state.currentLoopIter = 1; // reset loop when directly changing track
    
    if (this.state.currentIndex < this.state.sentences.length - 1) {
      this.state.currentIndex++;
      if (this.state.isPlaying) {
        this._startSentenceEngine();
      } else {
        this.state.playPhase = 'idle';
      }
    } else {
      this.state.isPlaying = false;
      this.state.playPhase = 'idle';
      DeviceService.setPlaybackState('none');
    }
  },

  prev() {
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
    this._stopAllAudio();
    this.state.isPlaying = true;
    this._startSentenceEngine();
  },

  // --------- 引擎核心邏輯 ---------

  _stopAllAudio() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
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

    // 優先播放實體音軌，若失敗則退回 TTS
    this._playAudioFileOrFallback(sentence.audioUrl, sentence.ttsText || sentence.text, this.config.lang, () => {
      if (!this.state.isPlaying) return;
      this._pauseAfterOriginal();
    });
  },

  _pauseAfterOriginal() {
    this.state.playPhase = 'pauseAfterOriginal';
    DeviceService.setPlaybackState('paused'); // 暫停時告知車機
    
    this.timeoutId = setTimeout(() => {
      if (!this.state.isPlaying) return;
      
      // 如果是「衝刺模式」，直接跳過發送翻譯語音
      if (this.config.playbackMode === 'sprint') {
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
    const targetUrl = sentence.translationAudioUrl || null;
    
    this._playAudioFileOrFallback(targetUrl, sentence.translation, 'zh-TW', () => {
      if (!this.state.isPlaying) return;
      this._pauseAfterTranslation();
    });
  },

  _pauseAfterTranslation() {
    this.state.playPhase = 'pauseAfterTranslation';
    DeviceService.setPlaybackState('paused');

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
  _playAudioFileOrFallback(url, fallbackText, langCode, onEndCallback) {
    if (url) {
      const audio = new Audio(url);
      audio.playbackRate = this.config.speed;
      this.currentAudio = audio;
      
      audio.onended = () => {
        this.currentAudio = null;
        onEndCallback();
      };
      
      audio.onerror = (e) => {
        console.warn(`[Player] 音檔無法播放 (${url})，自動跳轉 TTS 備援。`);
        this.currentAudio = null;
        this._speakText(fallbackText, langCode, onEndCallback);
      };

      // 嘗試立刻播放
      audio.play().catch((err) => {
        console.warn(`[Player] 播放交涉失敗 (${url}):`, err);
        this.currentAudio = null;
        this._speakText(fallbackText, langCode, onEndCallback);
      });
      
    } else {
      // JSON 無指派音檔時，直接走 TTS
      this._speakText(fallbackText, langCode, onEndCallback);
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
    window.speechSynthesis.cancel(); 
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.config.speed;
    if (langCode === 'jp') utterance.lang = 'ja-JP';
    else if (langCode === 'th') utterance.lang = 'th-TH';
    else if (langCode === 'kr') utterance.lang = 'ko-KR';
    else if (langCode === 'hk') utterance.lang = 'yue-Hant-HK';
    else utterance.lang = 'zh-TW';

    utterance.onend = () => { onEndCallback(); };
    utterance.onerror = () => { onEndCallback(); };

    window.speechSynthesis.speak(utterance);
  },

  /**
   * 資源預載引擎：往後讀取 2 句，強迫瀏覽器發生 Fetch 以利後續無縫銜接
   */
  _preloadNext(currentIndex) {
    const list = this.state.sentences;
    // 預載後面最多兩句
    for(let i = 1; i <= 2; i++) {
      const index = currentIndex + i;
      if (index < list.length) {
        const tgt = list[index];
        if (tgt.audioUrl) {
          const a = new Audio();
          a.preload = "auto";
          a.src = tgt.audioUrl;
        }
        if (tgt.translationAudioUrl) {
          const a2 = new Audio();
          a2.preload = "auto";
          a2.src = tgt.translationAudioUrl;
        }
      }
    }
  }
};
