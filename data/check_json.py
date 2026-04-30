import json
import os

files = ['hk.json', 'jp.json', 'kr.json', 'th.json']
required_keys = ['id', 'text', 'phonetic', 'translation', 'category']

for f in files:
    path = os.path.join('/Users/olga/Desktop/LoopLang/data', f)
    try:
        with open(path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            print(f"--- {f} ---")
            print(f"Total entries: {len(data)}")
            errors = []
            categories = set()
            for i, entry in enumerate(data):
                missing = [k for k in required_keys if k not in entry]
                if missing:
                    errors.append(f"Entry {i} missing {missing}")
                categories.add(entry.get('category'))
            
            if errors:
                print(f"Errors: {len(errors)} found.")
            else:
                print("No schema errors.")
            print(f"Categories: {categories}")
            
    except json.JSONDecodeError as e:
        print(f"Error parsing {f}: {e}")
    except Exception as e:
        print(f"Error reading {f}: {e}")
