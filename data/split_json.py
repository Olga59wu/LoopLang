import json
import os

DATA_DIR = '/Users/olga/Desktop/LoopLang/data'
CATALOG_PATH = os.path.join(DATA_DIR, 'catalog.json')

with open(CATALOG_PATH, 'r', encoding='utf-8') as f:
    catalog = json.load(f)

difficulty_map = {}
for lang_item in catalog:
    lang = lang_item['lang']
    for topic in lang_item.get('topics', []):
        difficulty_map[(lang, topic['slug'])] = topic.get('difficulty', 'beginner')

langs = ['hk', 'jp', 'kr', 'th']

for lang in langs:
    lang_path = os.path.join(DATA_DIR, f"{lang}.json")
    if not os.path.exists(lang_path):
        continue
    
    with open(lang_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    grouped = {}
    
    for item in data:
        cat = item.get('category', '')
        # Set level
        level = difficulty_map.get((lang, cat), 'beginner')
        item['level'] = level
        
        # Set hashtags
        tags = item.get('tags', [])
        hashtags = [f"#{t}" for t in tags if not t.startswith('#')]
        
        # Add category as hashtag if not there
        cat_hash = f"#{cat}"
        if cat_hash not in hashtags and cat:
            hashtags.append(cat_hash)
            
        item['hashtags'] = hashtags
        
        # Grouping
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(item)
    
    # Save back monolithic file
    with open(lang_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    # Save split files
    for cat, items in grouped.items():
        split_path = os.path.join(DATA_DIR, f"{lang}_{cat}.json")
        with open(split_path, 'w', encoding='utf-8') as f:
            json.dump(items, f, ensure_ascii=False, indent=2)

# Update catalog.json
for lang_item in catalog:
    lang = lang_item['lang']
    for topic in lang_item.get('topics', []):
        topic['dataFile'] = f"/data/{lang}_{topic['slug']}.json"

with open(CATALOG_PATH, 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

print("JSON processing complete.")
