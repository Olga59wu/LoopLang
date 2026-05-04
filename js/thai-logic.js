import { FirebaseService } from './firebase-service.js';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { tokenizeThai } from './thai-core.js?v=2';

function resolveAudioUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  let cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('%2F');
  const bucketName = 'looplang-6ef14.firebasestorage.app';
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
}

// DOM Elements - Drill
const loadingEl = document.getElementById('loading');
const emptyStateEl = document.getElementById('empty-state');
const activeCardEl = document.getElementById('active-card');
const textContainer = document.getElementById('thai-text-container');
const translationEl = document.getElementById('translation');
const actionButtonsEl = document.getElementById('action-buttons');
const btnShow = document.getElementById('btn-show');
const playBtn = document.getElementById('play-btn');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnDelete = document.getElementById('btn-delete');

// Top counter
const cardCounterEl = document.getElementById('card-counter');

// Auto Play Elements
const btnPlayAll = document.getElementById('btn-play-all');
const btnPlayDue = document.getElementById('btn-play-due');
const btnStopAutoPlay = document.getElementById('btn-stop-autoplay');
const autoPlayControls = document.getElementById('autoplay-controls');
const autoPlayActive = document.getElementById('autoplay-active');

// DOM Elements - Empty State
const btnForgot = document.getElementById('btn-forgot');
const btnHard = document.getElementById('btn-hard');
const btnRemember = document.getElementById('btn-remember');
const rememberTextEl = document.getElementById('remember-text');

// DOM Elements - Add Card Modal
const btnOpenAdd = document.getElementById('btn-open-add');
const btnCloseAdd = document.getElementById('btn-close-add');
const addModal = document.getElementById('add-modal');
const inputThaiText = document.getElementById('add-thai-text');
const toneSelectorsContainer = document.getElementById('tone-selectors-container');
const toneSelectors = document.getElementById('tone-selectors');
const inputTranslation = document.getElementById('add-translation');
const inputAudioUrl = document.getElementById('add-audio-url');
const btnSubmitAdd = document.getElementById('btn-submit-add');

// State
let currentUser = null;
let cards = [];
let currentIndex = 0;
let currentAudio = null;
let allCards = [];
let isAutoPlaying = false;
let autoPlayMode = null;
let autoPlayTimeout = null;

// 白名單設定
const WHITELIST_EMAILS = ['chipang59@gmail.com', 'olgawu.59@gmail.com'];
let toneRulesConfig = null;

// Application Initialization
FirebaseService.onAuthChange(async (user) => {
  if (user) {
    if (!WHITELIST_EMAILS.includes(user.email)) {
      alert("權限不足：您的帳號不在授權名單中。");
      await FirebaseService.auth.signOut();
      window.location.href = '/index.html';
      return;
    }
    currentUser = user;
    
    // 預先抓取雲端聲調規則
    try {
      const rulesDoc = await getDoc(doc(FirebaseService.db, "thai_config", "tone_rules"));
      if (rulesDoc.exists()) {
        toneRulesConfig = rulesDoc.data();
      }
    } catch (e) {
      console.error("無法載入雲端聲調規則，將回退至預設邏輯", e);
    }
    
    await loadDueCards();
    hideLoading();
  } else {
    window.location.href = '/index.html';
  }
});

async function loadDueCards() {
  if (!currentUser) return;
  const db = FirebaseService.db;
  const uid = currentUser.uid;
  const nowMs = Date.now();
  
  try {
    let phrasesSnap;
    try {
      const phrasesRef = collection(db, "thai_phrases");
      phrasesSnap = await getDocs(phrasesRef);
    } catch (e) {
      console.error("[DEBUG] 抓取 thai_phrases 失敗:", e);
      alert("抓取題庫失敗: " + e.message);
      return;
    }
    
    let progressSnap;
    try {
      const progressRef = collection(db, "users", uid, "thai_progress");
      progressSnap = await getDocs(progressRef);
    } catch (e) {
      console.error("[DEBUG] 抓取 thai_progress 失敗:", e);
      alert("抓取進度失敗: " + e.message);
      return;
    }
    
    const progressMap = new Map();
    progressSnap.forEach(docSnap => {
      progressMap.set(docSnap.id, docSnap.data());
    });
    
    cards = [];
    allCards = [];
    
    phrasesSnap.forEach((docSnap) => {
      const phraseData = docSnap.data();
      const progress = progressMap.get(docSnap.id);
      
      let isDue = true;
      let interval = 0;
      
      if (progress) {
        interval = progress.interval || 0;
        if (progress.next_review && typeof progress.next_review.toMillis === 'function') {
          isDue = progress.next_review.toMillis() <= nowMs;
        }
      }
      
      const cardObj = { 
        id: docSnap.id, 
        ...phraseData,
        interval: interval
      };
      
      allCards.push(cardObj);
      
      if (isDue) {
        cards.push(cardObj);
      }
    });
    
    allCards.sort(() => Math.random() - 0.5);
    cards.sort(() => Math.random() - 0.5);
    
    if (cards.length > 0) {
      renderCard();
      activeCardEl.classList.remove('hidden');
      emptyStateEl.classList.add('hidden');
    } else {
      activeCardEl.classList.add('hidden');
      emptyStateEl.classList.remove('hidden');
    }
  } catch (error) {
    console.error("讀取卡片時發生錯誤:", error);
    alert("讀取資料時發生錯誤，請重新整理頁面。");
  }
}

function hideLoading() {
  loadingEl.classList.add('opacity-0');
  setTimeout(() => {
    loadingEl.classList.add('hidden');
  }, 300);
}

function renderCard() {
  if (currentIndex >= cards.length) {
    activeCardEl.classList.add('hidden');
    emptyStateEl.classList.remove('hidden');
    return;
  }
  
  const card = cards[currentIndex];
  
  // 更新導覽按鈕狀態
  btnPrev.disabled = currentIndex === 0;
  btnNext.disabled = currentIndex === cards.length - 1;
  
  // 更新計數器
  if (cardCounterEl) {
    cardCounterEl.textContent = `${currentIndex + 1} / ${cards.length}`;
  }

  translationEl.classList.add('opacity-0');
  translationEl.textContent = card.translation || '';
  actionButtonsEl.classList.add('hidden');
  btnShow.classList.remove('hidden');
  
  const nextRememberInterval = (card.interval && card.interval > 0) ? card.interval * 2 : 1;
  rememberTextEl.textContent = `${nextRememberInterval} 天`;
  
  textContainer.innerHTML = '';
  const syllables = card.text || [];
  const toneClasses = card.tone_classes || [];
  
  // 動態調整字體大小
  // 泰文的母音與聲調符號會堆疊，導致字元長度 (length) 變長，但視覺寬度不變。
  // 因此放寬字元數量的級距，讓視覺長度差不多的句子能保持相同字體大小。
  const totalLength = syllables.join('').length;
  // 重置字體相關 class
  textContainer.className = 'thai-text font-bold tracking-tight mb-8 text-center break-keep w-full min-h-[100px] transition-all duration-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex flex-wrap justify-center items-end gap-x-1.5 gap-y-5';
  
  if (totalLength >= 30) {
    textContainer.classList.add('text-2xl', 'md:text-3xl', 'leading-relaxed');
  } else if (totalLength >= 20) {
    textContainer.classList.add('text-3xl', 'md:text-4xl', 'leading-snug');
  } else if (totalLength >= 12) {
    textContainer.classList.add('text-4xl', 'md:text-5xl', 'leading-tight');
  } else {
    textContainer.classList.add('text-5xl', 'md:text-6xl', 'leading-tight');
  }
  
  const toneMap = {
    'mid': { label: '平聲', textColor: 'text-emerald-600', badgeClass: 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' },
    'low': { label: '低聲', textColor: 'text-sky-600', badgeClass: 'bg-sky-50 text-sky-600 ring-sky-500/20' },
    'falling': { label: '落聲', textColor: 'text-amber-500', badgeClass: 'bg-amber-50 text-amber-500 ring-amber-500/20' },
    'high': { label: '高聲', textColor: 'text-rose-500', badgeClass: 'bg-rose-50 text-rose-500 ring-rose-500/20' },
    'rising': { label: '升聲', textColor: 'text-purple-600', badgeClass: 'bg-purple-50 text-purple-600 ring-purple-500/20' }
  };
  
  syllables.forEach((syllable, i) => {
    const toneClass = toneClasses[i] || 'mid';
    const config = toneMap[toneClass] || toneMap['mid'];
    
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col items-center';

    const span = document.createElement('span');
    span.textContent = syllable;
    span.className = config.textColor + ' pb-2 relative z-10';
    
    const badge = document.createElement('span');
    badge.textContent = config.label;
    badge.className = `mt-2 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold tracking-widest ring-1 ring-inset ${config.badgeClass}`;
    
    wrapper.appendChild(span);
    wrapper.appendChild(badge);
    textContainer.appendChild(wrapper);
  });
  
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  if (card.audio_url) {
    currentAudio = new Audio(resolveAudioUrl(card.audio_url));
    currentAudio.load();
  }
}

btnShow.addEventListener('click', () => {
  translationEl.classList.remove('opacity-0');
  btnShow.classList.add('hidden');
  if (!isAutoPlaying) {
    actionButtonsEl.classList.remove('hidden');
  }
});

playBtn.addEventListener('click', () => {
  if (currentAudio) {
    currentAudio.currentTime = 0;
    currentAudio.play().catch(e => console.error("音檔播放失敗", e));
  } else {
    const card = cards[currentIndex];
    if (card && card.text) {
      const fullText = card.text.join("");
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.lang = 'th-TH';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }
});

btnPrev.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderCard();
  }
});

btnNext.addEventListener('click', () => {
  if (currentIndex < cards.length - 1) {
    currentIndex++;
    renderCard();
  }
});

btnDelete.addEventListener('click', async () => {
  const currentCard = cards[currentIndex];
  if (!currentCard || !currentCard.id) return;

  const confirmDelete = confirm("確定要刪除這張卡片嗎？此動作無法復原。");
  if (!confirmDelete) return;

  try {
    const originalIcon = btnDelete.innerHTML;
    btnDelete.innerHTML = `<svg class="animate-spin h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    
    await deleteDoc(doc(FirebaseService.db, "thai_phrases", currentCard.id));
    
    // 自陣列中移除
    cards.splice(currentIndex, 1);
    allCards = allCards.filter(c => c.id !== currentCard.id);
    
    // 調整 index 並重新渲染
    if (currentIndex >= cards.length) {
      currentIndex = Math.max(0, cards.length - 1);
    }
    
    btnDelete.innerHTML = originalIcon;
    
    if (cards.length > 0) {
      renderCard();
    } else {
      activeCardEl.classList.add('hidden');
      emptyStateEl.classList.remove('hidden');
    }
  } catch (error) {
    console.error("刪除失敗:", error);
    alert("刪除發生錯誤: " + error.message);
    btnDelete.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>`;
  }
});

async function processReview(quality) {
  if (currentIndex >= cards.length || !currentUser) return;
  const card = cards[currentIndex];
  
  let newInterval = card.interval || 0;
  
  if (quality === 'forgot') {
    newInterval = 1;
  } else if (quality === 'hard') {
    newInterval = newInterval === 0 ? 1 : newInterval + 1;
  } else if (quality === 'remember') {
    newInterval = newInterval === 0 ? 1 : newInterval * 2;
  }
  
  const nowMs = Date.now();
  const nextReviewMs = nowMs + (newInterval * 24 * 60 * 60 * 1000);
  const nextReviewTimestamp = Timestamp.fromMillis(nextReviewMs);
  
  const docRef = doc(FirebaseService.db, "users", currentUser.uid, "thai_progress", card.id);
  
  try {
    actionButtonsEl.style.pointerEvents = 'none';
    actionButtonsEl.style.opacity = '0.5';
    
    await setDoc(docRef, {
      interval: newInterval,
      next_review: nextReviewTimestamp
    }, { merge: true });
    
    currentIndex++;
    renderCard();
    
  } catch (error) {
    console.error("更新進度失敗:", error);
    alert("更新進度失敗，請檢查網路連線。");
  } finally {
    actionButtonsEl.style.pointerEvents = 'auto';
    actionButtonsEl.style.opacity = '1';
  }
}

btnForgot.addEventListener('click', () => processReview('forgot'));
btnHard.addEventListener('click', () => processReview('hard'));
btnRemember.addEventListener('click', () => processReview('remember'));

// --- Tokenizer & Auto Segmentation ---

btnOpenAdd.addEventListener('click', () => {
  addModal.classList.remove('hidden');
});

btnCloseAdd.addEventListener('click', () => {
  addModal.classList.add('hidden');
  inputThaiText.value = '';
  inputTranslation.value = '';
  inputAudioUrl.value = '';
  toneSelectors.innerHTML = '';
  toneSelectorsContainer.classList.add('hidden');
});

// 自動斷詞 (Auto Segmentation) 機制
inputThaiText.addEventListener('blur', (e) => {
  const text = e.target.value.trim();
  // 若為空，或使用者已經手動輸入空格，則尊重使用者不介入
  if (!text || text.includes(' ')) return;
  
  // 使用現代瀏覽器內建的 Intl.Segmenter 進行泰文語義斷詞
  if (window.Intl && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
      const segments = Array.from(segmenter.segment(text));
      
      // 過濾掉標點符號與非字元
      const words = segments.filter(s => s.isWordLike).map(s => s.segment);
      
      // 如果斷出大於一個詞，就自動補上空格並觸發 input 更新
      if (words.length > 1) {
        e.target.value = words.join(' ');
        e.target.dispatchEvent(new Event('input'));
      }
    } catch (err) {
      console.warn("[PWA] Intl.Segmenter 斷詞失敗:", err);
    }
  }
});

inputThaiText.addEventListener('input', (e) => {
  const text = e.target.value.trim();
  if (!text) {
    toneSelectorsContainer.classList.add('hidden');
    toneSelectors.innerHTML = '';
    return;
  }
  
  const tokens = tokenizeThai(text);
  toneSelectorsContainer.classList.remove('hidden');
  
  toneSelectors.innerHTML = '';
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.text) continue;
    
    const selectRow = document.createElement('div');
    selectRow.className = "flex justify-between items-center bg-slate-50 border border-slate-100 p-2 rounded-lg";
    
    const label = document.createElement('span');
    label.className = "thai-text font-bold text-lg text-slate-700 w-1/2 overflow-hidden text-ellipsis";
    label.textContent = token.text;
    
    const select = document.createElement('select');
    select.className = "bg-white border border-slate-200 rounded-md p-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500";
    select.innerHTML = `
      <option value="mid">Mid (平聲/綠)</option>
      <option value="high">High (高聲/紅)</option>
      <option value="low">Low (低聲/藍)</option>
      <option value="falling">Falling (落聲/橘)</option>
      <option value="rising">Rising (升聲/紫)</option>
    `;
    
    const result = detectThaiTone(token, toneRulesConfig);
    select.value = result.tone;
    if (result.reason) {
      select.title = result.reason;
      label.title = result.reason;
      if (token.infectedBy) {
        label.classList.add('text-indigo-600', 'border-b', 'border-dashed', 'border-indigo-400');
      }
    }
    
    selectRow.appendChild(label);
    selectRow.appendChild(select);
    toneSelectors.appendChild(selectRow);
  }
});

btnSubmitAdd.addEventListener('click', async () => {
  const textVal = inputThaiText.value.trim();
  const translationVal = inputTranslation.value.trim();
  const audioVal = inputAudioUrl.value.trim();
  
  if (!textVal || !translationVal) {
    alert("請完整填寫泰文與翻譯！");
    return;
  }
  
  const renderedLabels = toneSelectors.querySelectorAll('span.thai-text');
  const finalSyllables = Array.from(renderedLabels).map(span => span.textContent);
  
  const toneSelects = toneSelectors.querySelectorAll('select');
  const toneClasses = Array.from(toneSelects).map(select => select.value);
  
  const newCard = {
    text: finalSyllables.length > 0 ? finalSyllables : [textVal],
    translation: translationVal,
    tone_classes: toneClasses,
    audio_url: audioVal
  };
  
  try {
    btnSubmitAdd.disabled = true;
    btnSubmitAdd.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>儲存中...</span>`;
    
    await addDoc(collection(FirebaseService.db, "thai_phrases"), newCard);
    
    alert("新增成功！重整網頁即可開始複習。");
    
    // 清空表單
    inputThaiText.value = '';
    inputTranslation.value = '';
    inputAudioUrl.value = '';
    toneSelectors.innerHTML = '';
    toneSelectorsContainer.classList.add('hidden');
    addModal.classList.add('hidden');
    
  } catch (error) {
    console.error("寫入資料庫失敗:", error);
    alert("寫入失敗，請確認您的帳號是否具備管理員權限！");
  } finally {
    btnSubmitAdd.disabled = false;
    btnSubmitAdd.innerHTML = `<span>儲存卡片</span>`;
  }
});

// --- Auto Play Logic ---

function startAutoPlay(mode) {
  isAutoPlaying = true;
  autoPlayMode = mode;
  
  autoPlayControls.classList.add('hidden');
  autoPlayActive.classList.remove('hidden');
  btnShow.classList.add('hidden');
  actionButtonsEl.classList.add('hidden');
  
  if (mode === 'all') {
    cards = [...allCards];
  }
  
  currentIndex = 0;
  if (cards.length > 0) {
    activeCardEl.classList.remove('hidden');
    emptyStateEl.classList.add('hidden');
    renderCard();
    runAutoPlayStep();
  } else {
    stopAutoPlay();
    alert("沒有可播放的卡片！");
  }
}

function stopAutoPlay() {
  isAutoPlaying = false;
  autoPlayMode = null;
  clearTimeout(autoPlayTimeout);
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  
  autoPlayControls.classList.remove('hidden');
  autoPlayActive.classList.add('hidden');
  
  // Reload state to restore proper SRS deck
  loadDueCards(); 
}

function playAudioForAutoPlay() {
  return new Promise((resolve) => {
    if (currentAudio) {
      currentAudio.currentTime = 0;
      currentAudio.play().then(() => {
        currentAudio.onended = resolve;
      }).catch(e => {
        console.error("音檔播放失敗", e);
        resolve(); // skip on error
      });
    } else {
      const card = cards[currentIndex];
      if (card && card.text) {
        const fullText = card.text.join("");
        const utterance = new SpeechSynthesisUtterance(fullText);
        utterance.lang = 'th-TH';
        utterance.rate = 0.8;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    }
  });
}

function runAutoPlayStep() {
  if (!isAutoPlaying) return;
  
  // Ensure manual UI is hidden
  actionButtonsEl.classList.add('hidden');
  btnShow.classList.add('hidden');
  
  // 1. Play audio
  playAudioForAutoPlay().then(() => {
    if (!isAutoPlaying) return;
    
    // 2. Wait 1.5s for echoing
    autoPlayTimeout = setTimeout(() => {
      if (!isAutoPlaying) return;
      
      // 3. Show translation
      translationEl.classList.remove('opacity-0');
      
      // 4. Wait 1.5s
      autoPlayTimeout = setTimeout(() => {
        if (!isAutoPlaying) return;
        
        // 5. Next card
        if (currentIndex < cards.length - 1) {
          currentIndex++;
        } else {
          // Loop back to start & reshuffle
          currentIndex = 0;
          cards.sort(() => Math.random() - 0.5);
        }
        renderCard();
        
        // 6. Loop
        runAutoPlayStep();
      }, 1500);
    }, 1500);
  });
}

btnPlayAll.addEventListener('click', () => startAutoPlay('all'));
btnPlayDue.addEventListener('click', () => startAutoPlay('due'));
btnStopAutoPlay.addEventListener('click', () => stopAutoPlay());
