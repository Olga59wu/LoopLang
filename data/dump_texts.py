import json
import os

files = ['hk.json', 'jp.json', 'kr.json', 'th.json']

for f in files:
    path = os.path.join('/Users/olga/Desktop/LoopLang/data', f)
    with open(path, 'r', encoding='utf-8') as file:
        data = json.load(file)
        print(f"--- {f} ---")
        for i, item in enumerate(data):
            if i % 15 == 0:  # just print a few to sample or print all if not too long?
                pass
            print(f"{item['id']}: {item['text']} ({item['translation']})")
