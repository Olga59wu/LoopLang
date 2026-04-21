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
      if (topicSlug === 'all') {
        const catalog = await DataService.getCatalog();
        const lData = catalog.find(c => c.lang === lang);
        if (!lData || !lData.topics) {
          console.error('[DataService] all: lData or lData.topics not found for lang', lang);
          return [];
        }
        
        // 過濾掉可能為全部內容的虛擬標籤 (保險起見)
        const validTopics = lData.topics.filter(t => t.slug !== 'all');

        // 使用 DataService 本體並發請求，並用 reduce 替代 flat
        const requests = validTopics.map(t => 
          fetch(`/data/${lang}/${t.slug}.json`)
            .then(r => r.ok ? r.json() : [])
            .catch(err => {
              console.error('[DataService] fetch failed', t.slug, err);
              return [];
            })
        );
        const results = await Promise.all(requests);
        const flattened = results.reduce((acc, val) => acc.concat(val), []);
        
        if (flattened.length === 0) {
           console.error('[DataService] all: flattened results are completely empty', results);
        }

        return flattened;
      }

      // 依據專案結構推導 JSON 實體路徑
      const resp = await fetch(`/data/${lang}/${topicSlug}.json`);
      if (!resp.ok) throw new Error('Failed to fetch topic data');
      return await resp.json();
    } catch (error) {
      console.error(`[DataService] getTopicData error (${lang}/${topicSlug}):`, error);
      return [];
    }
  }
};
