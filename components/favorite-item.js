// components/favorite-item.js
/**
 * 收藏列：專屬單一書籤項目顯示渲染器
 * 將長串的句子屬性攤平。點擊後透過 emits 引發頁面路由轉換 (`player.html`)。
 */
export default {
  props: {
    item: Object // 從 Storage 取出的標準單一句子物件結構 (包含對應語系資訊)
  },
  template: `
    <div class="p-4 bg-white rounded-xl shadow-soft mb-4 flex justify-between items-start">
      <!-- 點擊區域：點下去可返回特定段落閱讀 -->
      <div 
        class="flex-1 cursor-pointer hit-area-lg"
        @click="$emit('navigate', item.lang, item.topicId, item.order - 1)"
      >
        <div class="text-xs text-zinc-400 mb-1">{{ item.langLabel }} - {{ item.topicTitle }}</div>
        
        <!-- 當為泰文時主動掛載 lang-th class 保留高寬排版 -->
        <div class="text-lg font-bold text-zinc-900 mb-1" :class="{'lang-th': item.lang === 'th'}">{{ item.text }}</div>
        
        <div class="text-sm text-zinc-500 font-phonetic mb-1">{{ item.phonetic }}</div>
        <div class="text-sm text-zinc-600">{{ item.translation }}</div>
      </div>
      
      <!-- 移除該筆書籤 -->
      <button 
        @click.stop="$emit('remove', item.id)"
        class="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-4 hit-area-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
      </button>
    </div>
  `
};
