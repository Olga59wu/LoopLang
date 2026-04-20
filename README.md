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
 │    ├── catalog.json          # 主題索引目錄
 │    ├── jp/greetings.json     # 具體語系與主題內容 (包含中/日雙軌音檔 URL)
 │    └── th/greetings.json     # 具體語系與主題內容 (泰文)
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
*   **雙層資料同步 (Local-First Sync)**：資料層採用 Firebase 雲端與 localStorage 雙軌並行。App 操作全程無縫讀寫本地快取，即使無網路也能流暢學習，待連線時由 `firebase-service.js` 背景非同步推播至 Firestore 進行跨裝置備份。
*   **🔥 沉浸式語言體驗**：極簡 Glassmorphism（毛玻璃）介面與 Bottom-sheet 扁平化導航。
*   **🎧 動態智慧歌單 (Dynamic Playlist)**：
    *   **進度削去法**：支援「✅標記已學會」，並開啟「排已學會」過濾器，精準對攻弱點。
    *   **突破難點**：支援「💖僅播星星」，考前衝刺專用。
*   **⚙️ 高度個人化播放**：可調整單句循環次數（1次、3次、5次...）、控制語速（0.8x - 1.2x），支援盲聽挑戰模式與快速衝刺模式。
*   **☁️ 雲端跨裝置同步**：對接 Firebase，即時備份學習進度、自訂收藏與偏好設定至雲端，完美無縫漫遊體驗。
*   **雙重容錯播放策略**：嘗試利用 `new Audio()` 存取實體 URL；若找不到音檔，則無縫退回原生 Web Speech API 進行 TTS 單機報讀，確保流程不斷鏈。
*   **防震與預載**：在切換上下句時執行發音終止 (`window.speechSynthesis.cancel()`) 防破音，並自動往後預載下 2 句的原音與翻譯音軌。

## 4. 特殊情境解法
*   **強制登入閘門 (Auth Gate)**：利用 Vue 載入週期，在 `index.html` 頂層掛載 Firebase `onAuthStateChanged`。若無憑證直接切換至全螢幕登入 UI，阻絕訪客繞過進度追蹤的可能性。
*   **Media Session 與 Wake Lock**：`player.html` 載入即鎖定螢幕亮度，避免使用者開車聽到一半黑屏。透過背景拋送標題 metadata 給系統，車內方向盤的實體媒體鍵皆可順利切換上下句。
*   **泰文與特殊語言排版**：針對東南亞語系的母音上下疊加特性，UI 在渲染時會動態注入安全的 `Padding` 與 `line-height`，確保文字絕不遭遇裁切。
