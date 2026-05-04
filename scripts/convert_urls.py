import json
import os
import urllib.parse

def convert_urls(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    changed = False
    for item in data:
        # Check audioUrl
        if 'audioUrl' in item and item['audioUrl'].startswith('https://firebasestorage'):
            # Extract the path from Firebase URL
            # e.g., https://.../o/audio%2Fth%2F0kbcmnszqLtJZQZfvmCW.mp3?alt=media
            try:
                parts = item['audioUrl'].split('/o/')
                if len(parts) > 1:
                    path_part = parts[1].split('?')[0]
                    decoded_path = '/' + urllib.parse.unquote(path_part)
                    item['audioUrl'] = decoded_path
                    changed = True
            except Exception as e:
                print(f"Error parsing audioUrl: {item['audioUrl']}")
                
        # Check translationAudioUrl
        if 'translationAudioUrl' in item and item['translationAudioUrl'].startswith('https://firebasestorage'):
            try:
                parts = item['translationAudioUrl'].split('/o/')
                if len(parts) > 1:
                    path_part = parts[1].split('?')[0]
                    decoded_path = '/' + urllib.parse.unquote(path_part)
                    item['translationAudioUrl'] = decoded_path
                    changed = True
            except Exception as e:
                print(f"Error parsing translationAudioUrl: {item['translationAudioUrl']}")
                
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Updated {filepath}")
    else:
        print(f"No changes needed in {filepath}")

# Process files
convert_urls('/Users/olga/Desktop/LoopLang/data/th.json')
convert_urls('/Users/olga/Desktop/LoopLang/data/th_all.json')

