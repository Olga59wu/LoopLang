import json
import os

files = ['hk.json', 'jp.json', 'kr.json', 'th.json']

for f in files:
    path = os.path.join('/Users/olga/Desktop/LoopLang/data', f)
    with open(path, 'r', encoding='utf-8') as file:
        data = json.load(file)
        print(f"--- {f} ---")
        for item in data[:5]:
            print(f"[{item['category']}] {item['text']} -> {item['translation']}")
        print("...")
