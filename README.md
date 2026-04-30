# LoopLang 專案架構與開發文件

## 1. 專案定位
LoopLang 是一個「極簡、邏輯導向、低操作負擔」的多語會話跟讀工具。
核心流程圍繞於：**自動播放 -> 停頓 -> 播放翻譯 -> 停頓 -> 下一句** 的節奏循環。
因應通勤、駕駛等不便頻繁點擊之情境，專案整合了底層的防休眠機制與實體車機連動，提供真正的免持（Hands-Free）體驗。

## 2. 目錄結構與模組責任

```text
/project-root
 ├── index.html                 # 首頁：提供語言與主題入口，並顯示最近學習進度
 ├── player.html                # 播放頁：核心播放與控制引擎介面
 ├── favorites.html             # 收藏頁：列出全域的書籤句子
 ├── settings.html              # 設定頁：全域偏好設定 (播放秒數等)
 │
 ├── styles/
 │    └── main.css              # 存放 Tailwind 輔助樣式與微動畫設定
 │
 ├── data/                      # 內容資料庫 (本地 JSON 來源)
 │    ├── catalog.json          # 主題索引目錄 (涵蓋 4 語言主題對應表)
 │    ├── jp.json               # 完整資料備份 (供全部內容與降級讀取使用)
 │    ├── jp_greetings.json     # 主題拆分檔 (打招呼)
 │    ├── jp_shopping.json      # 主題拆分檔 (購物與商場)
 │    └── ...                   # 其他語系主題拆分檔
 ├── scripts/                   # 內部開發輔助工具
 │    └── split-data.js         # 依照標籤自動重構分類層級的腳本
 │
 ├── js/                        # 商業核心邏輯 (Service Layer)
 │    ├── data-service.js       # 負責透過 fetch 載入所有 JSON 資料
 │    ├── player-service.js     # 核心亮點：雙軌音檔播放、預載引擎與 TTS 備援狀態機
 │    ├── device-service.js     # 硬體連動：Wake Lock (防休眠) 與 Media Session (車機控制)
 │    ├── storage-service.js    # 封裝所有 LocalStorage 讀取寫入操作
 │    ├── router-helpers.js     # 封裝 URL 參數解析與跳轉
 │    ├── shared-state.js       # 全域共用狀態接口
 │    └── firebase-service.js   # 雲端資料同步核心 (Firebase v10 Auth & Firestore)
 │
 ├── components/                # Vue 3 原生 ES Module 元件
 │    ├── control-bar.js        # 底部播放、暫停按鈕控制區
 │    ├── favorite-item.js      # 收藏列單一項目組件
 │    ├── language-card.js      # 首頁語系切換卡片
 │    ├── pause-selector.js     # 停頓秒數選項組件
 │    ├── sentence-display.js   # 句子展示組件，包含泰文專屬防裁切物理 Padding
 │    └── topic-card.js         # 首頁主題卡片
```

## 3. 核心設計模式
*   **多頁面與原生 Vue 3**：堅持多頁架構 (Multi-Page)，不需打包工具。各頁面透過 `<script type="module">` 引入 Vue 3 Composition API。
*   **雙層資料同步 (Local-First Sync)**：資料層採用 Firebase 雲端與 localStorage 雙軌並行。App 操作全程無縫讀寫本地快取，即使無網路也能流暢學習，待連線時由 `firebase-service.js` 背景非同步推播至 Firestore 進行跨裝置備份。支援嚴謹的空集合同步檢查，實現裝置間精確的全空覆蓋（Deletion Sync）。
*   **🔥 沉浸式語言體驗**：極簡 Glassmorphism（毛玻璃）介面、Bottom-sheet 扁平化導航，支援字卡直接點擊觸發「隨選朗讀」的直覺互動。
*   **📱 PWA 桌面/行動端安裝**：完整支援 Progressive Web App 架構，具備獨立圖示與啟動畫面。底層搭載 Service Worker 快取攔截器 (Cache First / Network First 混合策略)，大幅提升載入速度與離線韌性，且針對 Firebase API 實施絕對例外排除，確保資料庫同步零干擾。
*   **🎧 動態智慧歌單 (Dynamic Playlist)**：
    *   **進度削去法**：支援「✅標記已學會」，並開啟「排已學會」過濾器，精準對攻弱點。
    *   **突破難點**：支援「💖僅播標記」，考前衝刺專用。
    *   **動態合集**：支援特殊的「全部內容」模式，於客戶端非同步聚合跨主題 JSON，達成無縫連播。
*   **⚙️ 高度個人化播放**：可調整單句循環次數（1次、3次、5次...）、控制語速（0.8x - 1.2x），支援盲聽挑戰模式與快速衝刺模式。
*   **☁️ 雲端跨裝置同步與配額防護**：
    *   對接 Firebase 即時備份學習進度、自訂收藏與偏好設定至雲端。
    *   具備「多語言獨立記憶字典 (Per-Language Memory)」，無縫銜接四種語系的進度座標切換。
    *   內建「同步防抖節流閘門 (Debounce Sync)」，阻絕頻繁手動切換語句帶來的資料庫密集寫入，極大幅度降低 Firebase 帳單成本。
*   **雙重容錯播放策略**：升級為「Blob 記憶體快取技術 (Blob Cache)」，預先將網路音檔完整載入記憶體轉換為虛擬本地資源，徹底消滅 iOS Safari 因網路串流引發的 0.2 秒音頭裁切；若無音檔，則穩健退回 Web Speech API，並具備跨語系 `/` 斜線智能停頓引擎。
*   **硬體資源防護與預載**：全面捨棄使用背景 `new Audio()` 的惡意預載法（會耗盡手機解碼器引發資源搶佔），改用底層純資料流 `fetch` 建立快取；底層搭載 `playbackSessionId` 防護網與實體的 Keep-Alive 心跳空白音軌，徹底阻絕休眠以及多重非同步指令引發的時序崩潰跳軌。

## 4. 特殊情境解法
*   **強制登入閘門 (Auth Gate)**：利用 Vue 載入週期，在 `index.html` 頂層掛載 Firebase `onAuthStateChanged`。若無憑證直接切換至全螢幕登入 UI，阻絕訪客繞過進度追蹤的可能性。
*   **Media Session 與 Wake Lock**：`player.html` 載入即鎖定螢幕亮度，避免使用者開車聽到一半黑屏。透過背景拋送標題 metadata 給系統，車內方向盤的實體媒體鍵皆可順利切換上下句。
*   **泰文與特殊語言排版**：針對東南亞語系的母音上下疊加特性，UI 在渲染時會動態注入安全的 `Padding` 與 `line-height`，確保文字絕不遭遇裁切。
*   **一鍵安全重啟 (Reset Progress)**：內建不破壞當前學習模式（過濾器狀態）的進度歸零演算法，完美支援從自訂清單的第一句開始反覆練習。
