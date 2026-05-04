import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('/Users/olga/Desktop/LoopLang/scripts/serviceAccountKey.json', 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const snapshot = await db.collection('thai_phrases').get();
  const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
  
  const longWords = new Set();
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.text) {
      const fullText = Array.isArray(data.text) ? data.text.join('') : data.text;
      const segments = Array.from(segmenter.segment(fullText)).filter(s => s.isWordLike).map(s => s.segment);
      segments.forEach(seg => {
        if (seg.length >= 5) {
          longWords.add(seg);
        }
      });
    }
  });
  
  console.log(Array.from(longWords));
}

check();
