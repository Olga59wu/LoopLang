import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// ----------------------------------------------------------------------
// 💡 使用說明 (Usage):
// 1. 請確認已安裝 firebase-admin: `npm install firebase-admin`
// 2. 請至 Firebase Console -> 專案設定 -> 服務帳戶 -> 產生新的私密金鑰
// 3. 將下載的 JSON 金鑰檔案重新命名為 `serviceAccountKey.json`，並放在此腳本同目錄下
// 4. 執行腳本: `node import_thai_phrases.js`
// ----------------------------------------------------------------------

// 載入服務帳戶金鑰
const serviceAccountPath = './serviceAccountKey.json';
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ 找不到 serviceAccountKey.json。請從 Firebase 控制台下載並放置於此目錄。');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// 初始化 Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 20 句泰劇常用例句
const thaiPhrases = [
  {
    "text": ["ไม่", "ได้", "ตั้ง", "ใจ", "จะ", "กวน", "นะ"],
    "tone_classes": ["low", "low", "low", "mid", "low", "mid", "low"],
    "translation": "不是故意要打擾妳的喔"
  },
  {
    "text": ["อย่า", "คิด", "มาก", "เลย", "นะ"],
    "tone_classes": ["low", "low", "low", "low", "low"],
    "translation": "不要想太多（鑽牛角尖）喔"
  },
  {
    "text": ["พี่", "ว่า", "ยัง", "ไง", "คะ"],
    "tone_classes": ["low", "low", "mid", "mid", "high"],
    "translation": "姐姐覺得（意見）如何呢？"
  },
  {
    "text": ["ช่วย", "เลือก", "หน่อย", "ได้", "ไหม", "คะ"],
    "tone_classes": ["high", "low", "low", "low", "high", "high"],
    "translation": "可以請妳幫我選一下嗎？"
  },
  {
    "text": ["ไม่", "ต้อง", "เป็น", "ห่วง"],
    "tone_classes": ["low", "low", "mid", "low"],
    "translation": "不用擔心喔"
  },
  {
    "text": ["เกือบ", "ลืม", "ไป", "แล้ว"],
    "tone_classes": ["low", "mid", "mid", "high"],
    "translation": "差點就忘記了耶"
  },
  {
    "text": ["รอ", "ตรง", "นี้", "นะ"],
    "tone_classes": ["low", "mid", "high", "low"],
    "translation": "在這邊等我喔"
  },
  {
    "text": ["นึก", "ออก", "หรือ", "ยัง", "คะ"],
    "tone_classes": ["high", "low", "high", "mid", "high"],
    "translation": "想起來了嗎？"
  },
  {
    "text": ["เดี๋ยว", "จัดการ", "เอง"],
    "tone_classes": ["low", "low", "mid", "low"],
    "translation": "等一下我會自己處理的"
  },
  {
    "text": ["ดี", "ขึ้น", "หรือ", "ยัง", "คะ"],
    "tone_classes": ["mid", "high", "high", "mid", "high"],
    "translation": "（心情或身體）好一點了嗎？"
  }
];

async function importData() {
  const collectionRef = db.collection('thai_phrases');
  let importedCount = 0;

  console.log(`⏳ 準備匯入 ${thaiPhrases.length} 筆資料到 /thai_phrases...`);

  try {
    for (const phrase of thaiPhrases) {
      // 確保沒有不必要的 interval 與 next_review 欄位
      const docData = {
        text: phrase.text,
        translation: phrase.translation,
        tone_classes: phrase.tone_classes,
        audio_url: ""
      };
      
      await collectionRef.add(docData);
      importedCount++;
      process.stdout.write(`\r✅ 已匯入: ${importedCount} / ${thaiPhrases.length}`);
    }
    console.log('\n🎉 所有資料匯入成功！');
  } catch (error) {
    console.error('\n❌ 匯入失敗:', error);
  }
}

importData();
