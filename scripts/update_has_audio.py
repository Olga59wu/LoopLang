import json
import os

def update_has_audio(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    updated_count = 0
    for item in data:
        # Check if the id is one of the new ones (add001 to add025)
        # Alternatively, we can just update all where category == 'new_phrases' and hasAudio == False
        if item.get("id", "").startswith("add") and item.get("hasAudio") == False:
            item["hasAudio"] = True
            updated_count += 1
            
    if updated_count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Updated {updated_count} items in {filepath}")
    else:
        print(f"No items needed updating in {filepath}")

update_has_audio('/Users/olga/Desktop/LoopLang/data/th.json')
update_has_audio('/Users/olga/Desktop/LoopLang/data/th_all.json')
