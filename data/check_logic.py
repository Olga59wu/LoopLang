import json
import os

files = ['hk.json', 'jp.json', 'kr.json', 'th.json']

for f in files:
    path = os.path.join('/Users/olga/Desktop/LoopLang/data', f)
    with open(path, 'r', encoding='utf-8') as file:
        data = json.load(file)
        ids = [item['id'] for item in data]
        if len(ids) != len(set(ids)):
            print(f"{f} has duplicate IDs")
        else:
            print(f"{f} IDs are unique")
