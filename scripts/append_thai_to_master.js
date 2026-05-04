import fs from 'fs';
import path from 'path';

const thPath = path.resolve('../data/th.json');
const thAllPath = path.resolve('../data/th_all.json');

const thData = JSON.parse(fs.readFileSync(thPath, 'utf8'));
const thAllData = JSON.parse(fs.readFileSync(thAllPath, 'utf8'));

// 更新 category 為 new_phrases 以符合 catalog.json
const newPhrases = thAllData.map(item => ({
  ...item,
  category: 'new_phrases'
}));

// 過濾掉可能已經存在的 ID
const existingIds = new Set(thData.map(item => item.id));
const toAppend = newPhrases.filter(item => !existingIds.has(item.id));

if (toAppend.length > 0) {
  const mergedData = [...thData, ...toAppend];
  fs.writeFileSync(thPath, JSON.stringify(mergedData, null, 2), 'utf8');
  console.log(`✅ 成功將 ${toAppend.length} 筆新句子追加到 data/th.json 中！`);
} else {
  console.log('✅ 所有句子已經存在於 data/th.json 中。');
}

// 同時更新 th_all.json 的 category，這樣它本身也是最新的
fs.writeFileSync(thAllPath, JSON.stringify(newPhrases, null, 2), 'utf8');
console.log('✅ 成功更新 data/th_all.json 的 category');
