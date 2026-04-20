// components/pause-selector.js
/**
 * 停頓秒數切換元件：控制段落之間的等待空隙
 * 將選擇的值發送回父頁面，進而改變 PlayerService 的下一次運作機制。
 */
export default {
  props: {
    duration: Number
  },
  template: `
    <div class="flex items-center justify-center gap-2 my-4">
      <span class="text-sm text-zinc-500 mr-2">停頓秒數</span>
      <!-- 以點擊選項切換，確保行動端上單手可選 (不必下拉或拖拉) -->
      <button 
        v-for="sec in [0, 2, 5]" 
        :key="sec"
        @click="$emit('update:duration', sec)"
        class="w-10 h-10 rounded-full font-medium transition-all hit-area-lg"
        :class="duration === sec ? 'glass-btn-dark text-white' : 'glass-panel text-zinc-500'"
      >
        {{ sec }}
      </button>
    </div>
  `
};
