// components/learned-item.js
export default {
  props: {
    item: Object
  },
  template: `
    <div class="p-4 bg-white rounded-xl shadow-soft mb-4 flex justify-between items-start">
      <div 
        class="flex-1 cursor-pointer hit-area-lg"
        @click="$emit('navigate', item.lang, item.topicId, item.order - 1)"
      >
        <div class="text-xs text-zinc-400 mb-1">{{ item.langLabel }} - {{ item.topicTitle }}</div>
        
        <div class="text-lg font-bold text-zinc-900 mb-1" :class="{'lang-th': item.lang === 'th'}">{{ item.text }}</div>
        
        <div class="text-sm text-zinc-500 font-phonetic mb-1">{{ item.phonetic }}</div>
        <div class="text-sm text-zinc-600">{{ item.translation }}</div>
      </div>
      
      <button 
        @click.stop="$emit('remove', item.id)"
        class="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors ml-4 hit-area-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </button>
    </div>
  `
};
