import json
import os
import re

DATA_DIR = '/Users/olga/Desktop/LoopLang/data'

deletions = {
    'hk.json': ['hk_phrase_037', 'hk_phrase_050', 'hk_phrase_072'],
    'jp.json': ['jp_phrase_005', 'jp_phrase_044', 'jp_phrase_056'],
    'kr.json': ['kr_phrase_046', 'kr_phrase_060'],
    'th.json': ['th_phrase_008', 'th_phrase_040', 'th_phrase_052']
}

additions = {
    'hk.json': [
        {"text": "唔該，我想加單。", "phonetic": "m4 goi1, ngo5 soeng2 gaa1 daan1", "translation": "不好意思，我想加點餐。", "category": "dining"},
        {"text": "請問八達通喺邊度增值？", "phonetic": "cing2 man6 baat3 daat6 tung1 hai2 bin1 dou6 zang1 zik6", "translation": "請問八達通在哪裡加值？", "category": "transport"},
        {"text": "呢度可唔可以影相呀？", "phonetic": "ni1 dou6 ho2 m4 ho2 ji5 jing2 soeng2 aa3", "translation": "這裡可以拍照嗎？", "category": "travel"}
    ],
    'jp.json': [
        {"text": "[写真|しゃしん]を[撮|と]ってもらえませんか？", "ttsText": "写真を撮ってもらえませんか", "phonetic": "shashin o totte moraemasen ka", "translation": "可以幫我拍照嗎？", "category": "travel"},
        {"text": "Suicaにチャージしたいです。", "ttsText": "Suicaにチャージしたいです", "phonetic": "suika ni chaaji shitai desu", "translation": "我想儲值西瓜卡。", "category": "transport"},
        {"text": "これの[免税手続き|めんぜいてつづき]をお[願|ねが]いします。", "ttsText": "これの免税手続きをお願いします", "phonetic": "kore no menzei tetsuzuki o onegaishimasu", "translation": "麻煩幫我辦理這個的免稅手續。", "category": "shopping"}
    ],
    'kr.json': [
        {"text": "사진 좀 찍어주실 수 있나요?", "phonetic": "sajin jom jjigeojusil su innayo", "translation": "可以幫我拍照嗎？", "category": "travel"},
        {"text": "티머니 카드 충전해 주세요.", "phonetic": "timeoni kadeu chungjeonhae juseyo", "translation": "請幫我儲值 T-money 卡。", "category": "transport"},
        {"text": "텍스 리펀 되나요?", "phonetic": "tekseu ripeon doenayo", "translation": "可以退稅嗎？", "category": "shopping"}
    ],
    'th.json': [
        {"text": "เผ็ดน้อย", "phonetic": "phet noi", "translation": "微辣。", "category": "dining"},
        {"text": "ไม่ใส่น้ำแข็ง", "phonetic": "mai sai nam khaeng", "translation": "去冰。", "category": "dining"},
        {"text": "ถ่ายรูปให้หน่อยได้ไหม", "phonetic": "thai rup hai noi dai mai", "translation": "可以幫我拍照嗎？", "category": "travel"}
    ]
}

for filename, to_delete in deletions.items():
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Process deletions
    data = [item for item in data if item['id'] not in to_delete]
    
    # Find prefix and max numeric id
    prefix = filename.replace('.json', '')
    max_id_num = 0
    for item in data:
        m = re.search(r'_(\d+)$', item['id'])
        if m:
            num = int(m.group(1))
            if num > max_id_num:
                max_id_num = num
    
    # Process additions
    to_add = additions.get(filename, [])
    for add_item in to_add:
        max_id_num += 1
        new_id = f"{prefix}_phrase_{max_id_num:03d}"
        
        # Build complete entry
        new_entry = {
            "id": new_id,
            "text": add_item["text"],
            "phonetic": add_item["phonetic"],
            "translation": add_item["translation"],
            "audioUrl": f"/audio/{prefix}/{new_id}.mp3",
            "translationAudioUrl": f"/audio/{prefix}/{prefix}_zh_phrase_{max_id_num:03d}.mp3",
            "hasAudio": False, # Setting to false since audio file might not exist yet
            "order": len(data) + 1,
            "tags": ["travel", add_item["category"]],
            "note": "",
            "ttsText": add_item.get("ttsText", add_item["text"]),
            "status": "published",
            "category": add_item["category"]
        }
        data.append(new_entry)
    
    # Re-index order sequentially to be safe
    for i, item in enumerate(data):
        item['order'] = i + 1

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated {filename}: Removed {len(to_delete)}, Added {len(to_add)}, Total {len(data)}")

