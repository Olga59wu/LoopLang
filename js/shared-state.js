import { reactive } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

/**
 * Shared State (系統共用輕量狀態管理)
 * 作為跨模組間可共用的簡單 Vue 3 響應式資料，類似於極簡的 Pinia Store。
 */
export const sharedState = reactive({
  catalog: [],      // 已下載下來的目錄快取
  isLoaded: false   // 全局第一次讀取是否完成判定旗標
});
