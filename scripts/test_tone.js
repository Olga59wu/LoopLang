import fs from 'fs';
// We just need the pure logic to test
const toneRulesConfig = {
  consonants: { mid: "กจดตบปอฎฏ", high: "ขฃฉฐถผฝศษสห" },
  matrix: {
    mid: { live: "mid", dead: "low", mai_ek: "low", mai_tho: "falling", mai_tri: "high", mai_chattawa: "rising" },
    high: { live: "rising", dead: "low", mai_ek: "low", mai_tho: "falling", mai_tri: "high", mai_chattawa: "rising" },
    low: { live: "mid", dead_short: "high", dead_long: "falling", mai_ek: "falling", mai_tho: "high", mai_tri: "high", mai_chattawa: "rising" }
  }
};

function tokenizeThaiWord(text) {
  if (!text) return [];
  
  const midConsonants = "กจดตบปอฎฏ";
  const highConsonants = "ขฃฉฐถผฝศษสห";
  const trueClusters = ['กร', 'กล', 'กว', 'ขร', 'ขล', 'ขว', 'คร', 'คล', 'คว', 'ตร', 'ปร', 'ปล', 'พร', 'พล'];

  const prefixVowels = ['เ', 'แ', 'โ', 'ใ', 'ไ'];
  let firstChar = text[0];
  let hasPrefixVowel = prefixVowels.includes(firstChar);
  
  let c1Index = hasPrefixVowel ? 1 : 0;
  if (c1Index >= text.length) return [{ text, class: '', isImplicitA: false }];
  
  let c1 = text[c1Index];
  
  if (!(c1 >= '\u0E01' && c1 <= '\u0E2E')) {
     return [{ text, class: '', isImplicitA: false }];
  }

  let c2Index = c1Index + 1;
  if (c2Index < text.length) {
    let c2 = text[c2Index];
    const upperLowerVowels = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;
    if (upperLowerVowels.test(c2)) {
      return [{ text, class: '', isImplicitA: false }];
    }
    
    if (c2 >= '\u0E01' && c2 <= '\u0E2E') {
      const lowSonorants = ['ง', 'น', 'ม', 'ย', 'ร', 'ล', 'ว', 'ณ', 'ญ'];
      let isLeadingHorO = (c1 === 'ห' && lowSonorants.includes(c2)) || (c1 === 'อ' && c2 === 'ย');
      let isTrueCluster = trueClusters.includes(c1 + c2);
      let isImplicitOSingleSyllable = !hasPrefixVowel && text.length === 2;
      
      if (!isLeadingHorO && !isTrueCluster && !isImplicitOSingleSyllable) {
        let syl1Text = c1;
        let syl2Text = text.slice(c2Index);
        if (hasPrefixVowel) {
          syl2Text = firstChar + syl2Text;
        }

        let c1Class = midConsonants.includes(c1) ? 'mid' : (highConsonants.includes(c1) ? 'high' : 'low');
        let isC1MidOrHigh = c1Class === 'mid' || c1Class === 'high';
        let isC2Low = !midConsonants.includes(c2) && !highConsonants.includes(c2);
        let shouldInfect = isC1MidOrHigh && isC2Low;

        let tokens = [
          { text: syl1Text, class: c1Class, isImplicitA: true }
        ];
        
        let syl2Obj = { text: syl2Text, class: '', isImplicitA: false };
        if (shouldInfect) {
          syl2Obj.infectedBy = c1Class;
        }
        
        tokens.push(syl2Obj);
        return tokens;
      }
    }
  }
  
  return [{ text, class: '', isImplicitA: false }];
}

function detectThaiTone(token) {
  const text = typeof token === 'string' ? token : token.text;
  if (!text) return { tone: 'mid', reason: 'Empty' };
  
  const rules = toneRulesConfig;
  
  if (typeof token === 'object' && token.isImplicitA) {
    if (token.class === 'high') return { tone: 'low', reason: 'Implicit A (High Consonant)' };
    if (token.class === 'mid') return { tone: 'low', reason: 'Implicit A (Mid Consonant)' };
    return { tone: 'high', reason: 'Implicit A (Low Consonant)' };
  }
  
  const hasMaiEk = text.includes('\u0E48');
  const hasMaiTho = text.includes('\u0E49');
  const hasMaiTri = text.includes('\u0E4A');
  const hasMaiChattawa = text.includes('\u0E4B');
  
  let initialConsonantForTone = '';
  let clusterLength = 0;
  let firstConsonantIndex = -1;
  let reason = [];
  
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
          reason.push('Leading ห');
        } else if (c1 === 'อ' && c2 === 'ย') {
          initialConsonantForTone = 'อ';
          clusterLength = 2;
          reason.push('Leading อ');
        } else {
          const clusterSeconds = ['ร', 'ล', 'ว'];
          if (clusterSeconds.includes(c2)) {
            clusterLength = 2;
          }
        }
      }
    }
  }

  if (!initialConsonantForTone) return { tone: 'mid', reason: 'No consonant' };

  let cClass = 'low';
  if (rules.consonants.mid.includes(initialConsonantForTone)) cClass = 'mid';
  else if (rules.consonants.high.includes(initialConsonantForTone)) cClass = 'high';

  if (typeof token === 'object' && token.infectedBy) {
    cClass = token.infectedBy;
    reason.push(`Inherited from ${cClass}`);
  } else {
    reason.push(`${cClass}`);
  }

  if (hasMaiEk) return { tone: rules.matrix[cClass].mai_ek || 'mid', reason: reason.join('+') + '+MaiEk' };
  if (hasMaiTho) return { tone: rules.matrix[cClass].mai_tho || 'mid', reason: reason.join('+') + '+MaiTho' };
  if (hasMaiTri) return { tone: rules.matrix[cClass].mai_tri || 'high', reason: reason.join('+') + '+MaiTri' };
  if (hasMaiChattawa) return { tone: rules.matrix[cClass].mai_chattawa || 'rising', reason: reason.join('+') + '+MaiChattawa' };

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
  
  return { tone: finalTone, reason: reason.join('+') + '+Dead/Live' };
}

console.log("อย่า:", detectThaiTone({text: "อย่า"}));
console.log("ร้อง:", detectThaiTone({text: "ร้อง"}));
console.log("ไห้:", detectThaiTone({text: "ไห้"}));
console.log("ให้:", detectThaiTone({text: "ให้"}));

