export function tokenizeThai(text) {
  if (!text) return [];
  if (text.includes(' ')) {
    return text.split(/\s+/).flatMap(s => tokenizeThaiWord(s));
  }
  return tokenizeThaiWord(text);
}

export function tokenizeThaiWord(text) {
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

export function detectThaiTone(token, toneRulesConfig) {
  const text = typeof token === 'string' ? token : token.text;
  if (!text) return { tone: 'mid', reason: 'Empty' };
  
  // 若成功載入雲端規則，先檢查特例白名單
  if (toneRulesConfig && toneRulesConfig.exceptions && toneRulesConfig.exceptions[text]) {
    return { tone: toneRulesConfig.exceptions[text], reason: 'Exception Rule' };
  }
  
  // 如果沒有雲端規則，則使用內建預設的備用規則物件
  const rules = toneRulesConfig || {
    consonants: { mid: "กจดตบปอฎฏ", high: "ขฃฉฐถผฝศษสห" },
    matrix: {
      mid: { live: "mid", dead: "low", mai_ek: "low", mai_tho: "falling", mai_tri: "high", mai_chattawa: "rising" },
      high: { live: "rising", dead: "low", mai_ek: "low", mai_tho: "falling", mai_tri: "high", mai_chattawa: "rising" },
      low: { live: "mid", dead_short: "high", dead_long: "falling", mai_ek: "falling", mai_tho: "high", mai_tri: "high", mai_chattawa: "rising" }
    }
  };
  
  if (typeof token === 'object' && token.isImplicitA) {
    if (token.class === 'high') return { tone: 'low', reason: 'Implicit A (High Consonant)' };
    if (token.class === 'mid') return { tone: 'low', reason: 'Implicit A (Mid Consonant)' };
    return { tone: 'high', reason: 'Implicit A (Low Consonant)' };
  }
  
  const hasMaiEk = text.includes('\u0E48');
  const hasMaiTho = text.includes('\u0E49');
  const hasMaiTri = text.includes('\u0E4A');
  const hasMaiChattawa = text.includes('\u0E4B');
  
  // --- 1. 前引字變調判定 (Leading Consonant Logic) ---
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
    
    // Check next char for clusters or leading rules
    if (firstConsonantIndex + 1 < text.length) {
      const c2 = text[firstConsonantIndex + 1];
      if (c2 >= '\u0E01' && c2 <= '\u0E2E') {
        const lowSonorants = ['ง', 'น', 'ม', 'ย', 'ร', 'ล', 'ว', 'ณ', 'ญ'];
        if (c1 === 'ห' && lowSonorants.includes(c2)) {
          initialConsonantForTone = 'ห'; // 強制切換為高子音 ห 的規則
          clusterLength = 2;
          reason.push('Leading ห');
        } else if (c1 === 'อ' && c2 === 'ย') {
          initialConsonantForTone = 'อ'; // 強制切換為中子音 อ 的規則
          clusterLength = 2;
          reason.push('Leading อ');
        } else {
          // 一般雙子音群 (True clusters)
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
    reason.push(`Inherited from ${cClass.charAt(0).toUpperCase() + cClass.slice(1)} Consonant`);
  } else {
    reason.push(`${cClass.charAt(0).toUpperCase() + cClass.slice(1)} Consonant`);
  }

  // 聲調符號優先判斷
  if (hasMaiEk) return { tone: rules.matrix[cClass].mai_ek || 'mid', reason: reason.join(' + ') + ' + Mai Ek' };
  if (hasMaiTho) return { tone: rules.matrix[cClass].mai_tho || 'mid', reason: reason.join(' + ') + ' + Mai Tho' };
  if (hasMaiTri) return { tone: rules.matrix[cClass].mai_tri || 'high', reason: reason.join(' + ') + ' + Mai Tri' };
  if (hasMaiChattawa) return { tone: rules.matrix[cClass].mai_chattawa || 'rising', reason: reason.join(' + ') + ' + Mai Chattawa' };

  // --- 3. 尾音屬性精確化 (Final Consonant Logic) ---
  const allConsonantsRegex = /[\u0E01-\u0E2E]/g;
  let match;
  const consonantsList = [];
  while ((match = allConsonantsRegex.exec(text)) !== null) {
    consonantsList.push({ char: match[0], index: match.index });
  }

  let finalConsonant = null;
  // 扣除字首子音群後，若還有子音，最後一個即為尾音
  if (consonantsList.length > clusterLength) {
    finalConsonant = consonantsList[consonantsList.length - 1].char;
  }

  const liveEndings = 'งญณนรมลฬวย'; // Live Finals
  const deadEndings = 'กขคฆจชซฎฏฐฑฒดตถทธศษสบปพฟภ'; // Dead Finals

  // --- 2. 特殊母音類型修正 (Special Vowel Classification) ---
  // 強制平音 (Force Live)
  const forceLiveVowels = ['ำ', 'ใ', 'ไ'];
  const hasForceLive = forceLiveVowels.some(v => text.includes(v)) || (text.includes('เ') && text.includes('า'));
  
  // 檢查是否有顯性母音符號 (包含上下與前後母音)
  const explicitVowelsRegex = /[\u0E30-\u0E3A\u0E40-\u0E44\u0E47]/;
  const hasExplicitVowel = explicitVowelsRegex.test(text);

  let isShortVowel = false;
  const shortVowels = ['ะ', 'ิ', 'ึ', 'ุ']; 
  if (shortVowels.some(v => text.includes(v)) || text.includes('\u0E31') || text.includes('\u0E47')) {
    isShortVowel = true;
  }
  
  // 隱含母音判定
  if (!hasExplicitVowel && finalConsonant) {
    // 若無顯性母音符號且有尾音（如 นก），自動識別為「短母音」
    isShortVowel = true;
    reason.push('Implicit Short Vowel');
  }

  // 綜合判斷 Live / Dead
  let isDead = false;
  if (hasForceLive) {
    isDead = false; // 強制平音結尾
    reason.push('Force Live Vowel');
  } else if (finalConsonant) {
    if (deadEndings.includes(finalConsonant)) {
      isDead = true;
      reason.push('Dead Final');
    } else if (liveEndings.includes(finalConsonant)) {
      isDead = false;
      reason.push('Live Final');
    }
  } else {
    // 無尾音時，短母音為促音結尾，長母音為平音結尾
    if (isShortVowel) {
      isDead = true;
      reason.push('Short Vowel (Dead)');
    } else {
      isDead = false;
      reason.push('Long Vowel (Live)');
    }
  }

  // 套用規則矩陣
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
  
  return { tone: finalTone, reason: reason.join(' + ') };
}

export function evaluateTonesForArray(textArray, rulesConfig) {
  const tones = [];
  let currentInfection = null;

  for (let i = 0; i < textArray.length; i++) {
    const text = typeof textArray[i] === 'string' ? textArray[i] : textArray[i].text;
    if (!text) {
      tones.push('mid');
      continue;
    }
    
    let tokenObj = { text: text, isImplicitA: false, infectedBy: null };
    
    if (currentInfection) {
      const c1 = text[0];
      const midConsonants = rulesConfig.consonants.mid || "กจดตบปอฎฏ";
      const highConsonants = rulesConfig.consonants.high || "ขฃฉฐถผฝศษสห";
      const isC1Low = !midConsonants.includes(c1) && !highConsonants.includes(c1);
      
      if (isC1Low) {
        tokenObj.infectedBy = currentInfection;
      }
    }
    
    // Check if this syllable is exactly 1 consonant (implicit A)
    if (text.length === 1 && text[0] >= '\u0E01' && text[0] <= '\u0E2E') {
      tokenObj.isImplicitA = true;
      const midConsonants = rulesConfig.consonants.mid || "กจดตบปอฎฏ";
      const highConsonants = rulesConfig.consonants.high || "ขฃฉฐถผฝศษสห";
      const cClass = midConsonants.includes(text) ? 'mid' : (highConsonants.includes(text) ? 'high' : 'low');
      
      if (cClass === 'mid' || cClass === 'high') {
        currentInfection = cClass;
      } else {
        currentInfection = null;
      }
    } else {
      currentInfection = null;
    }
    
    const result = detectThaiTone(tokenObj, rulesConfig);
    tones.push(result.tone);
  }
  
  return tones;
}
