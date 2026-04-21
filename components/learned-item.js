// components/learned-item.js
export default {
  props: {
    item: Object
  },
  template: `
    <div class="p-4 bg-white rounded-xl shadow-soft mb-4 flex justify-between items-start hover:shadow-md transition-shadow">
      <div 
        class="flex-1 cursor-pointer hit-area-lg group"
        @click="$emit('play', item)"
      >
        <div class="text-xs text-zinc-400 mb-1 flex items-center gap-1">
          <span>{{ item.langLabel }} - {{ item.topicTitle }}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
        </div>
        
        <div class="text-lg font-bold text-zinc-900 mb-1" :class="{'lang-th': item.lang === 'th'}">{{ item.text }}</div>
        
        <div class="text-sm text-zinc-500 font-phonetic mb-1">{{ item.phonetic }}</div>
        <div class="text-sm text-zinc-600">{{ item.translation }}</div>
      </div>
      
      <div class="flex flex-col gap-2 ml-4">
        <!-- 前往閱讀 -->
        <button 
          @click.stop="$emit('navigate', item.lang, item.topicId, item.order - 1)"
          class="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors hit-area-lg"
          title="前往段落"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
        <!-- 移除 -->
        <button 
          @click.stop="$emit('remove', item.id)"
          class="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors hit-area-lg"
          title="移除學習紀錄"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </button>
      </div>
    </div>
  `
};
