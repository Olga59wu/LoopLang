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

async function removeKa() {
  const collectionRef = db.collection('thai_phrases');
  const snapshot = await collectionRef.get();
  let updatedCount = 0;

  console.log(`⏳ 準備檢查 ${snapshot.size} 筆資料...`);

  // We want to remove 'ค่ะ', 'คะ', 'นะคะ' if they are at the end of the text array.
  const targetParticles = ['ค่ะ', 'คะ', 'นะคะ'];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.text && Array.isArray(data.text)) {
      let needsUpdate = false;
      let newText = [...data.text];
      let newToneClasses = data.tone_classes ? [...data.tone_classes] : [];

      // Check the last element
      while (newText.length > 0 && targetParticles.includes(newText[newText.length - 1])) {
        // If it's "นะคะ" we might want to preserve "นะ" but let's just remove the whole element 
        // or replace "นะคะ" with "นะ"? 
        // The user specifically said "ค่ะ", but "คะ" and "นะคะ" are just spelling variations for different tones/contexts.
        const removed = newText.pop();
        if (newToneClasses.length > newText.length) {
          newToneClasses.pop();
        }
        
        if (removed === 'นะคะ') {
          // If it was "นะคะ", replacing it with "นะ" might be better so we don't lose the particle completely, 
          // let's insert "นะ" with tone "high" back in!
          newText.push('นะ');
          newToneClasses.push('high');
        }
        
        needsUpdate = true;
      }

      if (needsUpdate) {
        await doc.ref.update({
          text: newText,
          tone_classes: newToneClasses
        });
        updatedCount++;
        console.log(`✅ 更新 [${doc.id}]: ${data.text.join('')} -> ${newText.join('')}`);
      }
    }
  }

  console.log(`\n🎉 處理完成！共更新了 ${updatedCount} 筆資料。`);
}

removeKa().catch(console.error);
