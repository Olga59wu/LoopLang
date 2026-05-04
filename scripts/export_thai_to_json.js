import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = './serviceAccountKey.json';
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ 找不到 serviceAccountKey.json');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Firebase Storage URL format
const bucketName = 'looplang-6ef14.firebasestorage.app';
const getStorageUrl = (filename) => {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/audio%2Fth%2F${filename}?alt=media`;
};

async function exportThaiPhrases() {
  const collectionRef = db.collection('thai_phrases');
  const snapshot = await collectionRef.get();
  
  console.log(`⏳ 準備匯出 ${snapshot.size} 筆資料...`);
  
  const exportedData = [];
  let index = 1;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    // 將陣列文字結合成字串
    const joinedText = Array.isArray(data.text) ? data.text.join('') : data.text;
    
    // 建立 player.html 支援的格式
    const playerItem = {
      id: doc.id,
      text: joinedText,
      phonetic: "", // 泰文目前無羅馬拼音，先留空
      translation: data.translation || "",
      audioUrl: getStorageUrl(`${doc.id}.mp3`),
      translationAudioUrl: getStorageUrl(`${doc.id}_tw.mp3`),
      hasAudio: true,
      order: index++,
      tags: ["practical", "thai"],
      note: "",
      ttsText: joinedText, // 提供給 audioDownloader.html 產生音檔
      status: "published",
      category: "all",
      level: "beginner",
      hashtags: ["#thai", "#practical"]
    };
    
    exportedData.push(playerItem);
  });
  
  // 按照建立順序或其他邏輯排序，這裡先簡單依照 index (從 Firestore fetch 順序)
  // 如果原始有時間戳記更好，但目前無。
  
  const outputPath = path.resolve('../data/th_all.json');
  fs.writeFileSync(outputPath, JSON.stringify(exportedData, null, 2), 'utf8');
  
  console.log(`🎉 成功匯出 ${exportedData.length} 筆資料至 /data/th_all.json`);
}

exportThaiPhrases().catch(console.error);
