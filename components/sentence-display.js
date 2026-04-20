import { computed, ref, watch } from 'vue';

export default {
  props: {
    sentence: Object,
    showPhonetic: Boolean,
    showTranslation: Boolean,
    lang: String,
    playbackMode: {
      type: String,
      default: 'standard'
    }
  },
  setup(props) {
    const isRevealed = ref(false);

    watch(() => props.sentence, () => {
      isRevealed.value = false;
    });

    const shouldMask = computed(() => {
      return props.playbackMode === 'challenge' && !isRevealed.value;
    });

    const textStyleClass = computed(() => {
      let baseClass = 'font-bold mb-6 text-slate-800 drop-shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all duration-300 relative break-keep w-full ';

      if (props.lang === 'th') {
        baseClass += 'lang-th py-4 ';
      }

      const len = props.sentence.text.length;
      if (len >= 25) {
        baseClass += 'text-xl md:text-2xl leading-relaxed';
      } else if (len >= 15) {
        baseClass += 'text-2xl md:text-3xl leading-snug';
      } else if (len >= 8) {
        baseClass += 'text-3xl md:text-4xl leading-tight';
      } else {
        baseClass += 'text-4xl md:text-5xl leading-tight';
      }

      return baseClass;
    });

    const phoneticStyleClass = computed(() => {
      if (props.lang === 'hk') {
        return 'font-mono text-slate-400 tracking-widest text-base md:text-lg font-medium';
      }
      if (props.lang === 'th') {
        return 'font-sarabun text-slate-400 text-lg md:text-xl';
      }
      return 'font-mono text-slate-400 text-sm md:text-base tracking-widest font-medium';
    });

    // 自動偵測並轉換 [漢字|假名] 格式成為原生的 <ruby> 標籤
    const parsedTextHtml = computed(() => {
      if (!props.sentence || !props.sentence.text) return '';
      return props.sentence.text.replace(/\[([^\|\]]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');
    });

    return {
      isRevealed,
      shouldMask,
      textStyleClass,
      phoneticStyleClass,
      parsedTextHtml
    };
  },
  template: `
    <div class="flex flex-col items-center justify-center my-10 min-h-[200px] px-2 md:px-4 w-full">
      <transition name="slide-up" mode="out-in">
        <div :key="sentence.id" class="text-center w-full max-w-3xl flex flex-col items-center justify-center">
          
          <!-- 直接以 v-html 疊加渲染 Ruby 結構 -->
          <div 
            class="relative w-full cursor-pointer group"
            @click="isRevealed = true"
          >
            <!-- 遮罩覆蓋層 (挑戰模式下未解鎖時顯示) -->
            <div v-if="shouldMask" class="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/60 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm transition-all group-hover:bg-slate-100/40">
              <span class="text-slate-500 text-sm font-bold tracking-widest bg-white/80 px-4 py-1.5 rounded-full shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1 -mt-0.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>點擊解鎖</span>
            </div>

            <div 
              :class="[textStyleClass, shouldMask ? 'opacity-0 select-none' : '']"
              v-html="parsedTextHtml"
            >
            </div>
            
            <div 
              class="mb-4 min-h-[2rem]"
              :class="[phoneticStyleClass, shouldMask ? 'opacity-0' : '']"
            >
              <transition name="fade">
                <span v-if="showPhonetic">{{ sentence.phonetic }}</span>
              </transition>
            </div>
          </div>
          
          <div 
            class="text-xl md:text-2xl text-slate-600 font-medium min-h-[2.5rem] break-keep"
          >
            <transition name="fade">
              <span v-if="showTranslation">{{ sentence.translation }}</span>
            </transition>
          </div>
        </div>
      </transition>
    </div>
  `
};