// js/router-helpers.js

/**
 * Router Helpers (路由輔助模組)
 * 封裝跨頁跳轉與網址參數解析
 */
export const RouterHelpers = {
  getQueryParam(paramName) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(paramName);
  },

  /**
   * 跳轉至特定語言的中心樞紐 (選擇主題畫面)
   */
  navigateToLanguageHub(lang) {
    window.location.href = `player.html?lang=${encodeURIComponent(lang)}`;
  },

  /**
   * 跳轉至播放核心頁
   */
  navigateToPlayer(lang, topicId, sentenceIndex = 0) {
    window.location.href = `player.html?lang=${encodeURIComponent(lang)}&topic=${encodeURIComponent(topicId)}&idx=${sentenceIndex}`;
  },

  navigateToHome() {
    window.location.href = 'index.html';
  },

  navigateToFavorites() {
    window.location.href = 'favorites.html';
  },

  navigateToSettings() {
    window.location.href = 'settings.html';
  },

  navigateToLearned() {
    window.location.href = 'learned.html';
  },

  navigateToList(lang) {
    window.location.href = `list.html?lang=${encodeURIComponent(lang)}`;
  }
};
