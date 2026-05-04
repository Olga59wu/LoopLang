import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('/Users/olga/Desktop/LoopLang/scripts/serviceAccountKey.json', 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const rulesDoc = await db.collection('thai_config').doc('tone_rules').get();
  const rules = rulesDoc.data();

  // Basic detectThaiTone function adapted for node
  function detectThaiTone(textParam) {
    const text = typeof textParam === 'string' ? textParam : textParam.text;
    if (!text) return { tone: 'mid' };
    
    if (rules.exceptions && rules.exceptions[text]) {
      return { tone: rules.exceptions[text] };
    }
    
    let isImplicitA = false;
    let infectedBy = null;
    let baseText = text;
    if (typeof textParam === 'object') {
      isImplicitA = textParam.isImplicitA;
      infectedBy = textParam.infectedBy;
    }
    
    if (isImplicitA) {
      if (textParam.class === 'high') return { tone: 'low' };
      if (textParam.class === 'mid') return { tone: 'low' };
      return { tone: 'high' };
    }
    
    const hasMaiEk = text.includes('\u0E48');
    const hasMaiTho = text.includes('\u0E49');
    const hasMaiTri = text.includes('\u0E4A');
    const hasMaiChattawa = text.includes('\u0E4B');
    
    let initialConsonantForTone = '';
    let clusterLength = 0;
    let firstConsonantIndex = -1;
    
    for (let j = 0; j < text.length; j++) {
      const char = text[j];
      if (char >= '\u0E01' && char <= '\u0E2E') {
        firstConsonantIndex = j;
        break;
      }
    }

    if (firstConsonantIndex !== -1) {
      const c1 = text[firstConsonantIndex];
      initialConsonantForTone = c1;
      clusterLength = 1;
      
      if (firstConsonantIndex + 1 < text.length) {
        const c2 = text[firstConsonantIndex + 1];
        if (c2 >= '\u0E01' && c2 <= '\u0E2E') {
          const lowSonorants = ['ง', 'น', 'ม', 'ย', 'ร', 'ล', 'ว', 'ณ', 'ญ'];
          if (c1 === 'ห' && lowSonorants.includes(c2)) {
            initialConsonantForTone = 'ห';
            clusterLength = 2;
          } else if (c1 === 'อ' && c2 === 'ย') {
            initialConsonantForTone = 'อ';
            clusterLength = 2;
          } else {
            const clusterSeconds = ['ร', 'ล', 'ว'];
            if (clusterSeconds.includes(c2)) {
              clusterLength = 2;
            }
          }
        }
      }
    }

    if (!initialConsonantForTone) return { tone: 'mid' };

    let cClass = 'low';
    if (rules.consonants.mid.includes(initialConsonantForTone)) cClass = 'mid';
    else if (rules.consonants.high.includes(initialConsonantForTone)) cClass = 'high';

    if (infectedBy) {
      cClass = infectedBy;
    }

    if (hasMaiEk) return { tone: rules.matrix[cClass].mai_ek || 'mid' };
    if (hasMaiTho) return { tone: rules.matrix[cClass].mai_tho || 'mid' };
    if (hasMaiTri) return { tone: rules.matrix[cClass].mai_tri || 'high' };
    if (hasMaiChattawa) return { tone: rules.matrix[cClass].mai_chattawa || 'rising' };

    const allConsonantsRegex = /[\u0E01-\u0E2E]/g;
    let match;
    const consonantsList = [];
    while ((match = allConsonantsRegex.exec(text)) !== null) {
      consonantsList.push({ char: match[0], index: match.index });
    }

    let finalConsonant = null;
    if (consonantsList.length > clusterLength) {
      finalConsonant = consonantsList[consonantsList.length - 1].char;
    }

    const liveEndings = 'งญณนรมลฬวย';
    const deadEndings = 'กขคฆจชซฎฏฐฑฒดตถทธศษสบปพฟภ';

    const forceLiveVowels = ['ำ', 'ใ', 'ไ'];
    const hasForceLive = forceLiveVowels.some(v => text.includes(v)) || (text.includes('เ') && text.includes('า'));
    
    const explicitVowelsRegex = /[\u0E30-\u0E3A\u0E40-\u0E44\u0E47]/;
    const hasExplicitVowel = explicitVowelsRegex.test(text);

    let isShortVowel = false;
    const shortVowels = ['ะ', 'ิ', 'ึ', 'ุ']; 
    if (shortVowels.some(v => text.includes(v)) || text.includes('\u0E31') || text.includes('\u0E47')) {
      isShortVowel = true;
    }
    
    if (!hasExplicitVowel && finalConsonant) {
      isShortVowel = true;
    }

    let isDead = false;
    if (hasForceLive) {
      isDead = false;
    } else if (finalConsonant) {
      if (deadEndings.includes(finalConsonant)) {
        isDead = true;
      } else if (liveEndings.includes(finalConsonant)) {
        isDead = false;
      }
    } else {
      if (isShortVowel) {
        isDead = true;
      } else {
        isDead = false;
      }
    }

    let finalTone = '';
    if (!isDead) {
      finalTone = rules.matrix[cClass].live || 'mid';
    } else {
      if (cClass === 'low') {
        finalTone = isShortVowel ? (rules.matrix.low.dead_short || 'high') : (rules.matrix.low.dead_long || 'falling');
      } else {
        finalTone = rules.matrix[cClass].dead || 'low';
      }
    }
    
    return { tone: finalTone };
  }

  const snapshot = await db.collection('thai_phrases').get();
  let totalCards = 0;
  let mismatchedCards = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    totalCards++;
    if (data.text && Array.isArray(data.text)) {
      const dbTones = data.tone_classes || [];
      const computedTones = [];
      let isMismatch = false;

      for (let i = 0; i < data.text.length; i++) {
        const syllable = data.text[i];
        // Note: For full accuracy we'd need to re-run tokenizeThai to catch Implicit A and Infected By.
        // But since data.text is already segmented syllables, we might miss the infection context.
        // For a simple check, we just run detectThaiTone on the syllable.
        const res = detectThaiTone(syllable);
        computedTones.push(res.tone);
        if (dbTones[i] !== res.tone) {
          isMismatch = true;
        }
      }

      if (isMismatch) {
        mismatchedCards.push({
          id: doc.id,
          text: data.text.join(' '),
          dbTones: dbTones.join(', '),
          computedTones: computedTones.join(', ')
        });
      }
    }
  });

  console.log(`Total Cards: ${totalCards}`);
  console.log(`Mismatched Cards: ${mismatchedCards.length}`);
  if (mismatchedCards.length > 0) {
    mismatchedCards.slice(0, 10).forEach(card => {
      console.log(`- ${card.text}`);
      console.log(`  DB: ${card.dbTones}`);
      console.log(`  New: ${card.computedTones}`);
    });
  }
}

check();
