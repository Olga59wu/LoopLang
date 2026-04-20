// components/topic-card.js
/**
 * 首頁選單：呈現該語言下的情境主題入口
 * 內建單字數的提示。
 */
export default {
  props: {
    topic: Object // 來自 catalog.json 的各主題區塊定義
  },
  template: `
    <button 
      @click="$emit('select', topic.id)"
      class="p-5 glass-panel rounded-xl text-left w-full transition-all btn-active hit-area-lg"
    >
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-bold text-slate-800">{{ topic.title }}</h3>
        <!-- 系統標示提示有多少句子可跟讀 -->
        <span class="text-xs font-medium text-slate-500 bg-white/40 px-2.5 py-1 rounded-md shadow-sm border border-white/50">{{ topic.sentenceCount }} 句</span>
      </div>
      <p class="text-sm text-slate-500 font-medium leading-relaxed">{{ topic.description }}</p>
    </button>
  `
};
