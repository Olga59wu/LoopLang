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

  /**
   * 取得單一主題的完整句子庫
   * @param {string} lang - 語言代碼 (例如：jp, th)
   * @param {string} topicSlug - 主題識別碼 (例如：greetings)
   * @returns {Promise<Array>} 該主題對應的句子陣列
   */
  async getTopicData(lang, topicSlug) {
    try {
      const resp = await fetch(`/data/${lang}.json`);
      if (!resp.ok) throw new Error('Failed to fetch topic data');
      const allData = await resp.json();

      if (topicSlug === 'all') {
        return allData;
      }

      return allData.filter(item => item.category === topicSlug);
    } catch (error) {
      console.error(`[DataService] getTopicData error (${lang}/${topicSlug}):`, error);
      return [];
    }
  }
};
