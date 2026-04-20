// js/device-service.js

/**
 * Device Service (硬體設備整合服務)
 * 集中管理與裝置層級互動的 API，例如：
 * 1. Wake Lock API (防休眠)
 * 2. Media Session API (鎖屏、車機同步與硬體按鍵支援)
 */
export const DeviceService = {
  wakeLockReference: null,

  /**
   * 向系統請求保留螢幕亮起 (Wake Lock)
   * 用於播放畫面持續開啟時防呆。
   */
  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLockReference = await navigator.wakeLock.request('screen');
        // 監聽意外釋放 (如切換應用) 以便可能時重新獲取
        this.wakeLockReference.addEventListener('release', () => {
          console.log('[DeviceService] Wake Lock 已釋放。');
        });
      } catch (err) {
        console.warn(`[DeviceService] 無法獲取 Wake Lock: ${err.name}, ${err.message}`);
      }
    } else {
      console.warn('[DeviceService] 目前環境不支援 Wake Lock API。');
    }
  },

  /**
   * 釋放螢幕常亮狀態
   */
  releaseWakeLock() {
    if (this.wakeLockReference !== null) {
      this.wakeLockReference.release();
      this.wakeLockReference = null;
    }
  },

  /**
   * 初始化系統多媒體控制中心 (Media Session)
   * 支援在螢幕鎖定或車用藍牙面版上控制播放、暫停與上下句
   * @param {Object} callbacks - 傳入各硬體操作對應的回呼函式 {onPlay, onPause, onNext, onPrev}
   */
  initMediaSession(callbacks) {
    if (!('mediaSession' in navigator)) return;

    // 清空現存配置
    ['play', 'pause', 'previoustrack', 'nexttrack'].forEach(action => {
      navigator.mediaSession.setActionHandler(action, null);
    });

    if (callbacks.onPlay) {
      navigator.mediaSession.setActionHandler('play', () => callbacks.onPlay());
    }
    if (callbacks.onPause) {
      navigator.mediaSession.setActionHandler('pause', () => callbacks.onPause());
    }
    if (callbacks.onNext) {
      navigator.mediaSession.setActionHandler('nexttrack', () => callbacks.onNext());
    }
    if (callbacks.onPrev) {
      navigator.mediaSession.setActionHandler('previoustrack', () => callbacks.onPrev());
    }
  },

  /**
   * 更新鎖屏或車機面版上顯示的曲目資訊
   * @param {Object} metadata - { title, artist, album }
   */
  updateMetadata(metadata) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title || '未知內容',
        artist: metadata.artist || 'LoopLang',
        album: metadata.album || '多語跟讀練習',
        artwork: [
          // 預設可給定固定的 Logo 或留白以防畫面破圖
          { src: 'https://via.placeholder.com/512x512.png?text=LoopLang', sizes: '512x512', type: 'image/png' }
        ]
      });
    }
  },

  /**
   * 向系統宣告目前的播放狀態
   * @param {String} state - 'playing', 'paused', 或 'none'
   */
  setPlaybackState(state) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }
};
