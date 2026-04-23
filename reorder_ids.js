const fs = require('fs') // 引入檔案系統模組，用於讀取與寫入檔案
const path = require('path') // 引入路徑模組，用於處理檔案路徑

// 1. 定義語系配置：prefix 是 ID 前綴，file 是對應的 JSON 檔名
const configs = [
  { prefix: 'hk', file: 'hk.json' },
  { prefix: 'jp', file: 'jp.json' },
  { prefix: 'kr', file: 'kr.json' },
  { prefix: 'th', file: 'th.json' },
]

/**
 * 2. 設定抓取 JSON 檔案的位置
 * __dirname 代表目前這個 js 檔案所在的資料夾
 * 'data' 代表你專案目錄下的 data 資料夾
 * 腳本會去這個路徑：你的專案/data/xxx.json
 */
const dataDir = path.join(__dirname, 'data')

// 3. 開始遍歷處理每一個語系檔案
configs.forEach((config) => {
  const filePath = path.join(dataDir, config.file)

  // 檢查檔案是否存在，避免腳本報錯
  if (!fs.existsSync(filePath)) {
    console.log(
      `跳過：找不到檔案 ${config.file}，請確認檔案是否在 data 資料夾內`
    )
    return
  }

  // 讀取 JSON 內容並轉成 JavaScript 物件 (陣列)
  const rawData = fs.readFileSync(filePath, 'utf8')
  let items = JSON.parse(rawData)

  // 4. 使用 map 重新生成每一筆資料的編號與路徑
  const updatedItems = items.map((item, index) => {
    const newNum = index + 1 // 陣列索引從 0 開始，所以要 +1 作為序號
    const seqStr = newNum.toString().padStart(3, '0') // 將數字轉為 3 位數，例如 1 -> 001

    // 定義基礎編號樣式，例如 "jp_phrase_001"
    const newPhraseId = `${config.prefix}_phrase_${seqStr}`

    return {
      ...item, // 保留原本物件的所有其他屬性 (如 text, phonetic, translation 等)
      id: newPhraseId, // 更新 ID 欄位
      order: newNum, // 更新 Order 欄位為連續整數

      // 修正 audioUrl 裡面的編號 (例如 /audio/jp/jp_phrase_005.mp3)
      audioUrl: item.audioUrl
        ? item.audioUrl.replace(
            new RegExp(`${config.prefix}_phrase_\\d+`),
            `${config.prefix}_phrase_${seqStr}`
          )
        : item.audioUrl,

      // 修正 translationAudioUrl 裡面的編號 (需保留 _zh_ 的格式，例如 /audio/jp/jp_zh_phrase_005.mp3)
      translationAudioUrl: item.translationAudioUrl
        ? item.translationAudioUrl.replace(
            new RegExp(`${config.prefix}(_zh)?_phrase_\\d+`),
            (match) => {
              // 如果原本檔名包含 _zh_，則替換後也要保留 _zh_
              return match.includes('_zh')
                ? `${config.prefix}_zh_phrase_${seqStr}`
                : `${config.prefix}_phrase_${seqStr}`
            }
          )
        : item.translationAudioUrl,
    }
  })

  // 5. 將處理完後的資料寫回原檔案
  // JSON.stringify 的第三個參數 2 代表縮排兩格，確保產出的 JSON 漂亮好讀
  fs.writeFileSync(filePath, JSON.stringify(updatedItems, null, 2), 'utf8')
  console.log(
    `✅ ${config.file} 處理成功！ ID、Order 與音檔路徑已全部對齊為順號。`
  )
})

// 在終端機輸入 node reorder_ids.js
