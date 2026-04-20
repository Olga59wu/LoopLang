// components/control-bar.js
/**
 * 播放元件：核心下層控制面板
 * 控制播放、暫停、上下句切換等操作事件，
 * 並將邏輯上拋 (`$emit`) 給使用到的父元件。
 */
export default {
  props: {
    isPlaying: Boolean, // 目前是否處於播放模式 (對應 PlayerService)
    playPhase: String   // 目前當下的詳細引擎播放階段
  },
  emits: ['play', 'pause', 'next', 'prev'],
  template: `
    <div class="flex items-center justify-center gap-10 mb-2">
      
      <button 
        @click="$emit('prev')" 
        class="text-slate-400 hover:text-slate-700 active:scale-90 transition-all hit-area-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 18V6l-8.5 6 8.5 6zm.5-6 8.5 6V6l-8.5 6z" />
        </svg>
      </button>

      <div class="relative">
        <div class="absolute inset-0 bg-slate-400/20 rounded-full blur-xl animate-pulse" v-if="isPlaying"></div>
        <button 
          @click="isPlaying ? $emit('pause') : $emit('play')" 
          class="w-14 h-14 md:w-16 md:h-16 glass-btn-dark rounded-full flex items-center justify-center text-white active:scale-95 transition-all relative z-10 shadow-lg"
        >
          <svg v-if="!isPlaying" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="ml-1">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </button>
      </div>

      <button 
        @click="$emit('next')" 
        class="text-slate-400 hover:text-slate-700 active:scale-90 transition-all hit-area-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 18l8.5-6L5 6v12zM13 6v12l8.5-6L13 6z" />
        </svg>
      </button>

    </div>
  `
};
