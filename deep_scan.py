import requests
from bs4 import BeautifulSoup
import json

def deep_scan():
    url = "https://webpacx.ksml.edu.tw/search?q=科學發明王"
    headers = {
        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        script = soup.find('script', id='__NEXT_DATA__')
        
        if script:
            data = json.loads(script.string)
            
            found_lists = []
            
            def recurse(obj, path=""):
                if isinstance(obj, dict):
                    for k, v in obj.items():
                        recurse(v, f"{path}.{k}")
                elif isinstance(obj, list):
                    if len(obj) > 0 and isinstance(obj[0], dict):
                        # Potential candidate list
                        # Check if it has 'title' or 'book' fields
                        keys = obj[0].keys()
                        score = 0
                        if 'title' in keys: score += 1
                        if 'author' in keys: score += 1
                        if 'id' in keys: score += 1
                        
                        if score >= 1:
                            found_lists.append(f"{path} (len={len(obj)}, keys={list(keys)[:5]})")
                    
                    for i, item in enumerate(obj):
                        if i < 3: # Only recurse first few items to save time
                            recurse(item, f"{path}[{i}]")

            print("Scanning JSON for list structures...")
            recurse(data)
            
            if found_lists:
                print("\nPotential book lists found:")
                for l in found_lists:
                    print(l)
            else:
                print("\nNo obvious book lists found in JSON.")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    deep_scan()
