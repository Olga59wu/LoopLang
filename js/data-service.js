// js/data-service.js

/**
 * Data Service (資料服務模組)
 * 負責處理所有的非同步網路請求，將專案中的 JSON 檔案進行抓取與解析。
 * 架構解耦：此模組獨立於 Vue 元件，未來若資料改由 API 或後端提供，僅需修改此處。
 */
export const DataService = {
  /**
   * 取得主目錄清單 (支援哪些語系與主題)
   * @returns {Promise<Array>} 目錄資料陣列，若發生錯誤則回傳空陣列以防崩潰
   */
  async getCatalog() {
    try {
      const resp = await fetch('/data/catalog.json');
      if (!resp.ok) throw new Error('Failed to fetch catalog');
      return await resp.json();
    } catch (error) {
      console.error('[DataService] getCatalog error:', error);
      return [];
    }
  },

  async getTopicData(lang, topicSlug) {
    try {
      if (topicSlug === 'all') {
        const resp = await fetch(`/data/${lang}.json`);
        if (!resp.ok) throw new Error('Failed to fetch all data');
        return await resp.json();
      }

      const resp = await fetch(`/data/${lang}_${topicSlug}.json`);
      if (!resp.ok) {
        console.warn(`[DataService] Split file not found for ${lang}_${topicSlug}, falling back to full json.`);
        const fallbackResp = await fetch(`/data/${lang}.json`);
        if (!fallbackResp.ok) throw new Error('Failed to fetch fallback data');
        const allData = await fallbackResp.json();
        return allData.filter(item => item.category === topicSlug);
      }
      return await resp.json();
    } catch (error) {
      console.error(`[DataService] getTopicData error (${lang}/${topicSlug}):`, error);
      return [];
    }
  }
};
