import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

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

const originalSentences = [
  // 50 句
  { "text": ["ขอ", "เช็ค", "แป๊บ", "นึง", "นะคะ"], "tone_classes": ["high", "low", "low", "mid", "high"], "translation": "請讓我確認一下喔" },
  { "text": ["เข้า", "ใจ", "แล้ว", "ค่ะ"], "tone_classes": ["low", "mid", "high", "low"], "translation": "我了解了" },
  { "text": ["สะดวก", "ไหม", "คะ"], "tone_classes": ["low", "high", "high"], "translation": "現在方便嗎？" },
  { "text": ["ไม่", "แน่", "ใจ", "เหมือน", "กัน", "ค่ะ"], "tone_classes": ["low", "low", "mid", "high", "mid", "low"], "translation": "我也不太確定耶" },
  { "text": ["ฝาก", "ด้วย", "นะ", "คะ"], "tone_classes": ["low", "low", "low", "high"], "translation": "那就拜託妳了喔" },
  { "text": ["เห็น", "ด้วย", "ค่ะ"], "tone_classes": ["high", "low", "low"], "translation": "我同意" },
  { "text": ["ไป", "ด้วย", "คน", "สิ", "คะ"], "tone_classes": ["mid", "low", "mid", "low", "high"], "translation": "讓我也一起去嘛" },
  { "text": ["นัด", "กี่", "โมง", "ดี", "คะ"], "tone_classes": ["low", "low", "mid", "mid", "high"], "translation": "約幾點好呢？" },
  { "text": ["เดี๋ยว", "มา", "นะ", "คะ"], "tone_classes": ["low", "low", "low", "high"], "translation": "等下就回來喔" },
  { "text": ["ทาน", "อะ", "ไร", "ดี", "คะ"], "tone_classes": ["mid", "low", "low", "mid", "high"], "translation": "吃什麼好呢？" },
  { "text": ["เหนื่อย", "หน่อย", "นะ", "คะ"], "tone_classes": ["low", "low", "low", "high"], "translation": "辛苦了喔" },
  { "text": ["ขอ", "โทษ", "ที่", "ให้", "รอ", "ค่ะ"], "tone_classes": ["high", "low", "low", "low", "low", "low"], "translation": "抱歉讓妳久等了" },
  { "text": ["คิด", "ว่า", "ยัง", "ไง", "คะ"], "tone_classes": ["low", "low", "mid", "mid", "high"], "translation": "妳覺得如何呢？" },
  { "text": ["เอา", "แบบ", "นี้", "แหละ", "ค่ะ"], "tone_classes": ["mid", "low", "high", "low", "low"], "translation": "就照這樣吧" },
  { "text": ["ใกล้", "ถึง", "หรือ", "ยัง", "คะ"], "tone_classes": ["low", "high", "high", "mid", "high"], "translation": "快到了嗎？" },
  { "text": ["รบ", "กวน", "หน่อย", "นะ", "คะ"], "tone_classes": ["low", "mid", "low", "low", "high"], "translation": "麻煩妳一下喔" },
  { "text": ["น่า", "สน", "ใจ", "ดี", "ค่ะ"], "tone_classes": ["low", "mid", "mid", "mid", "low"], "translation": "聽起來挺有趣的" },
  { "text": ["ไม่", "เป็น", "ไร", "จริง", "จริง", "ค่ะ"], "tone_classes": ["low", "mid", "low", "mid", "mid", "low"], "translation": "真的沒關係" },
  { "text": ["เดี๋ยว", "เจอกัน", "นะ", "คะ"], "tone_classes": ["low", "mid", "low", "high"], "translation": "待會見喔" },
  { "text": ["พูด", "อีก", "ที", "ได้", "ไหม", "คะ"], "tone_classes": ["low", "low", "mid", "low", "high", "high"], "translation": "可以請妳再說一次嗎？" },
  { "text": ["ใจ", "เย็น", "เย็น", "ก่อน", "นะคะ"], "tone_classes": ["mid", "low", "low", "low", "high"], "translation": "先冷靜一點喔" },
  { "text": ["มี", "อะ", "ไร", "ให้", "ช่วย", "ไหม", "คะ"], "tone_classes": ["low", "low", "low", "low", "high", "high", "high"], "translation": "有什麼需要幫忙的嗎？" },
  { "text": ["ขอ", "ถาม", "หน่อย", "ค่ะ"], "tone_classes": ["high", "high", "low", "low"], "translation": "想請問一下" },
  { "text": ["อัน", "นี้", "เท่า", "ไหร่", "คะ"], "tone_classes": ["mid", "low", "low", "low", "high"], "translation": "這個多少錢？" },
  { "text": ["ไม่", "ค่อ", "ย", "ว่าง", "ค่ะ"], "tone_classes": ["low", "low", "mid", "low", "low"], "translation": "不太有空耶" },
  { "text": ["ลอง", "ดู", "ก่อน", "นะ", "คะ"], "tone_classes": ["low", "mid", "low", "low", "high"], "translation": "先試試看喔" },
  { "text": ["ดี", "เลย", "ค่ะ"], "tone_classes": ["mid", "low", "low"], "translation": "那太好了" },
  { "text": ["ตก", "ลง", "ค่ะ"], "tone_classes": ["low", "low", "low"], "translation": "一言為定/同意" },
  { "text": ["เป็น", "ไป", "ได้", "ยัง", "ไง", "คะ"], "tone_classes": ["mid", "mid", "low", "mid", "mid", "high"], "translation": "怎麼可能呢？" },
  { "text": ["ไม่", "ยาก", "เลย", "ค่ะ"], "tone_classes": ["low", "low", "low", "low"], "translation": "一點都不難" },
  { "text": ["ขอ", "เวลา", "คิด", "หน่อย", "นะคะ"], "tone_classes": ["high", "low", "low", "low", "high"], "translation": "給我點時間考慮喔" },
  { "text": ["พูด", "ตาม", "ตรง", "นะ", "คะ"], "tone_classes": ["low", "mid", "mid", "low", "high"], "translation": "實話實說喔" },
  { "text": ["จำ", "ไม่", "ได้", "แล้ว", "ค่ะ"], "tone_classes": ["mid", "low", "low", "high", "low"], "translation": "不記得了耶" },
  { "text": ["ยิน", "ดี", "ที่", "ได้", "รู้จัก", "ค่ะ"], "tone_classes": ["mid", "mid", "low", "low", "low", "low"], "translation": "很高興認識妳" },
  { "text": ["ไม่", "ได้", "เจอกัน", "นาน", "เลย", "นะ"], "tone_classes": ["low", "low", "mid", "mid", "low", "low"], "translation": "好久沒見了呢" },
  { "text": ["ขอ", "โทษ", "ที่", "มา", "สาย", "ค่ะ"], "tone_classes": ["high", "low", "low", "low", "high", "low"], "translation": "抱歉我遲到了" },
  { "text": ["ช่วย", "บอก", "หน่อย", "ได้", "ไหม", "คะ"], "tone_classes": ["high", "low", "low", "low", "high", "high"], "translation": "可以請妳告訴我嗎？" },
  { "text": ["วัน", "นี้", "แต่ง", "ตัว", "สวย", "จัง"], "tone_classes": ["mid", "low", "low", "mid", "high", "mid"], "translation": "今天穿得很漂亮耶" },
  { "text": ["ไม่", "ต้อง", "รีบ", "ก็", "ได้", "ค่ะ"], "tone_classes": ["low", "low", "low", "low", "low", "low"], "translation": "不用趕也沒關係" },
  { "text": ["ทำ", "แบบ", "นั้น", "ไม่", "ดี", "นะ"], "tone_classes": ["low", "low", "high", "low", "mid", "low"], "translation": "那樣做不太好喔" },
  { "text": ["เดี๋ยว", "โทร", "หา", "นะ", "คะ"], "tone_classes": ["low", "low", "high", "low", "high"], "translation": "等一下打給妳喔" },
  { "text": ["มี", "ความ", "สุข", "มาก", "มาก", "นะ"], "tone_classes": ["low", "low", "low", "low", "low", "low"], "translation": "要過得很幸福喔" },
  { "text": ["ไม่", "อยาก", "ไป", "เลย", "ค่ะ"], "tone_classes": ["low", "low", "mid", "low", "low"], "translation": "真不想去耶" },
  { "text": ["คุย", "กัน", "หน่อย", "ได้", "ไหม"], "tone_classes": ["low", "mid", "low", "low", "high"], "translation": "可以聊一下嗎？" },
  { "text": ["ขยัน", "จัง", "เลย", "นะ", "คะ"], "tone_classes": ["low", "mid", "low", "low", "high"], "translation": "真勤勞呢" },
  { "text": ["เกรง", "ใจ", "จัง", "เลย", "ค่ะ"], "tone_classes": ["mid", "mid", "mid", "low", "low"], "translation": "真是不好意思（感到客氣）" },
  { "text": ["เชื่อ", "ที่", "พูด", "ไหม", "คะ"], "tone_classes": ["low", "low", "low", "high", "high"], "translation": "相信我說的話嗎？" },
  { "text": ["ไป", "เที่ยว", "กัน", "ไหม", "คะ"], "tone_classes": ["mid", "low", "mid", "high", "high"], "translation": "要一起去玩嗎？" },
  { "text": ["ทำ", "ได้", "อยู่", "แล้ว", "ค่ะ"], "tone_classes": ["low", "low", "low", "high", "low"], "translation": "一定做得到的" },
  { "text": ["แล้ว", "เจอ", "กัน", "ใหม่", "นะ", "คะ"], "tone_classes": ["high", "mid", "mid", "low", "low", "high"], "translation": "下次見喔" },
  
  // 20 句
  { "text": ["ตื่น", "เต้น", "จัง", "เลย", "ค่ะ"], "tone_classes": ["low", "low", "mid", "low", "low"], "translation": "好緊張喔 / 好興奮喔" },
  { "text": ["ไม่", "กล้า", "ค่ะ"], "tone_classes": ["low", "low", "low"], "translation": "我不敢啦（拒絕嘗試或感到害羞時用）" },
  { "text": ["แล้ว", "แต่", "พี่", "เลย", "ค่ะ"], "tone_classes": ["high", "low", "low", "low", "low"], "translation": "都聽姐姐的 / 看姐姐怎麼決定囉" },
  { "text": ["เกรง", "ใจ", "จะ", "แย่", "แล้ว", "ค่ะ"], "tone_classes": ["mid", "mid", "low", "low", "high", "low"], "translation": "真的非常不好意思（比單純的เกรงใจ語氣更重）" },
  { "text": ["ขอ", "ตัว", "ก่อน", "นะ", "คะ"], "tone_classes": ["high", "mid", "low", "low", "high"], "translation": "我先失陪了喔（要先行離開時的禮貌用語）" },
  { "text": ["น่า", "เสีย", "ดาย", "จัง", "ค่ะ"], "tone_classes": ["low", "high", "mid", "mid", "low"], "translation": "真可惜呢" },
  { "text": ["พูด", "จริง", "เหรอ", "คะ"], "tone_classes": ["low", "mid", "high", "high"], "translation": "妳說真的嗎？（對訊息感到驚訝）" },
  { "text": ["ไม่", "ยุ่ง", "หรอก", "ค่ะ"], "tone_classes": ["low", "low", "low", "low"], "translation": "不麻煩的 / 不會忙啦" },
  { "text": ["แปลก", "ดี", "นะ", "คะ"], "tone_classes": ["low", "mid", "low", "high"], "translation": "挺特別的呢（指事情很有趣或有點古怪）" },
  { "text": ["ก็", "ว่า", "อยู่", "ค่ะ"], "tone_classes": ["low", "low", "low", "low"], "translation": "我也在想說... / 我也覺得是那樣" },
  { "text": ["ล้อ", "เล่น", "หรือ", "เปล่า", "คะ"], "tone_classes": ["high", "low", "high", "low", "high"], "translation": "在開玩笑嗎？" },
  { "text": ["มี", "ความ", "ลับ", "หรือ", "เปล่า"], "tone_classes": ["low", "low", "high", "high", "low"], "translation": "是不是有秘密呀？" },
  { "text": ["ไม่", "ได้", "ตั้ง", "ใจ", "ค่ะ"], "tone_classes": ["low", "low", "low", "mid", "low"], "translation": "我不是故意的" },
  { "text": ["จำ", "ผิด", "หรือ", "เปล่า", "คะ"], "tone_classes": ["mid", "low", "high", "low", "high"], "translation": "是不是記錯了呀？" },
  { "text": ["ตาม", "นั้น", "เลย", "ค่ะ"], "tone_classes": ["mid", "high", "low", "low"], "translation": "就照那樣吧 / 同意妳說的" },
  { "text": ["ตก", "ใจ", "หมด", "เลย"], "tone_classes": ["low", "mid", "low", "low"], "translation": "嚇死我了 / 被嚇了一跳" },
  { "text": ["ขอ", "โทษ", "ที่", "รบ", "กวน", "นะคะ"], "tone_classes": ["high", "low", "low", "low", "mid", "high"], "translation": "抱歉打擾妳了喔" },
  { "text": ["น่า", "อิจ", "ฉา", "จัง", "เลย"], "tone_classes": ["low", "low", "high", "mid", "low"], "translation": "真令人羨慕呢" },
  { "text": ["ไม่", "ได้", "ยิน", "เลย", "ค่ะ"], "tone_classes": ["low", "low", "mid", "low", "low"], "translation": "完全沒聽到耶" },
  { "text": ["ทำ", "ไง", "ดี", "คะ"], "tone_classes": ["low", "mid", "mid", "high"], "translation": "該怎麼辦好呢？" }
];

async function fixKa() {
  const collectionRef = db.collection('thai_phrases');
  const snapshot = await collectionRef.get();
  let updatedCount = 0;

  console.log(`⏳ 準備修復 ${snapshot.size} 筆資料...`);

  for (const doc of snapshot.docs) {
    const dbData = doc.data();
    
    // 找出對應的原始句子
    const original = originalSentences.find(s => s.translation === dbData.translation);
    
    if (original) {
      // 根據使用者的規則套用智慧淨化：
      // 1. 若原句結尾是 "ค่ะ" (禮貌陳述)，拿掉。
      // 2. 若原句結尾是 "นะคะ" (柔和陳述)，換成 "นะ"。
      // 3. 若原句結尾是 "คะ" (問句專用)，則保留不變。
      // 注意有些句子原始拆分是 ["นะ", "คะ"] 兩個元素，有些是 ["นะคะ"] 一個元素
      
      let newText = [...original.text];
      let newToneClasses = [...original.tone_classes];
      let needsUpdate = false;
      
      const lastWord = newText[newText.length - 1];
      
      if (lastWord === "ค่ะ") {
        newText.pop();
        newToneClasses.pop();
        needsUpdate = true;
      } else if (lastWord === "นะคะ") {
        newText[newText.length - 1] = "นะ";
        newToneClasses[newText.length - 1] = "high";
        needsUpdate = true;
      } else if (lastWord === "คะ" && newText.length > 1 && newText[newText.length - 2] === "นะ") {
        // 處理 ["นะ", "คะ"] 的情況 -> 原本被拔掉變成 ["นะ"]，但既然使用者說「問句的คะ要在，禮貌的不用」，
        // "นะคะ" 是禮貌用法，所以如果是 ["นะ", "คะ"] 我們應該拔掉 "คะ"，變成 ["นะ"]。
        // Wait, is "นะคะ" a question? No, "นะคะ" is statement. 
        // Example: ฝากด้วยนะคะ / เดี๋ยวมานะคะ
        // So yes, remove "คะ" leaving "นะ".
        newText.pop();
        newToneClasses.pop();
        needsUpdate = true;
      }
      
      // 如果經過以上邏輯後，文字與目前資料庫不同，就覆寫
      const dbTextJoined = dbData.text ? dbData.text.join("") : "";
      const newTextJoined = newText.join("");
      
      if (dbTextJoined !== newTextJoined) {
        await doc.ref.update({
          text: newText,
          tone_classes: newToneClasses
        });
        updatedCount++;
        console.log(`✅ 修復 [${doc.id}]: ${dbTextJoined} -> ${newTextJoined}`);
      }
    }
  }

  console.log(`\n🎉 處理完成！共修復了 ${updatedCount} 筆資料。`);
}

fixKa().catch(console.error);
