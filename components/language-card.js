// components/language-card.js
/**
 * 首頁選單：語言入口的選擇卡片
 * 與父層的選項相互溝通以套用 Active 狀態的設計改變 (反黑 UI)。
 */
export default {
  props: {
    lang: String,      // 語言系統碼, 如 'jp' 或 'th'
    label: String,     // 顯示名稱
    selected: Boolean  // 目前該項是否被使用者指定
  },
  template: `
    <button 
      @click="$emit('select', lang)"
      class="p-4 rounded-xl text-center transition-all duration-400 w-full hit-area-lg"
      :class="selected ? 'glass-btn-dark text-white' : 'glass-panel text-slate-700 hover:text-slate-900'"
    >
      <div class="text-xl font-bold tracking-wide">{{ label }}</div>
    </button>
  `
};
