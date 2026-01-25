import requests
from bs4 import BeautifulSoup
import json
import re

def inspect_kpl():
    # Target URL - search for specific book
    url = "https://webpacx.ksml.edu.tw/search?q=科學發明王"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    print(f"--- Inspecting KPL Search: {url} ---")
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        print(f"Status Code: {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Strategy 1: Next.js __NEXT_DATA__ JSON
        next_data = soup.find('script', id='__NEXT_DATA__')
        if next_data:
            print("\n[Strategy 1] Found Next.js hydration data.")
            try:
                data = json.loads(next_data.string)
                
                # Helper to find book-like lists
                found_books = []
                
                def search_for_books(obj, depth=0):
                    if depth > 5: return # limit recursion
                    
                    if isinstance(obj, dict):
                        # Heuristic: object with 'title' and 'author' or specific fields
                        if 'title' in obj and ('author' in obj or 'publication' in obj):
                            found_books.append(obj)
                            return
                        
                        # Heuristic: 'list' or 'search' keys might contain results
                        for k, v in obj.items():
                            if isinstance(v, (dict, list)):
                                search_for_books(v, depth+1)
                                
                    elif isinstance(obj, list):
                        for item in obj:
                            search_for_books(item, depth+1)

                # Narrow down search scope if possible to avoid noise
                if 'props' in data:
                    search_for_books(data['props'])
                else:
                    search_for_books(data)
                
                if found_books:
                    print(f"Found {len(found_books)} potential book items in JSON.")
                    print("First item keys: ", found_books[0].keys())
                    print("First item sample: ", json.dumps(found_books[0], ensure_ascii=False, indent=2)[:500])
                else:
                    print("No obvious book items found in JSON structure. Data might be loaded partially or via secondary API.")
                    # Attempt to look for 'dehydratedState' which is common used with React Query
                    if 'dehydratedState' in str(data):
                        print("Note: 'dehydratedState' is present. This suggests React Query usage.")

            except Exception as e:
                print(f"Error parsing JSON: {e}")
        else:
            print("\n[Strategy 1] __NEXT_DATA__ not found.")

        # Strategy 2: Standard HTML parsing (fallback)
        print("\n[Strategy 2] Searching HTML elements...")
        # Common classes for search results
        candidates = soup.find_all(['div', 'li'], class_=re.compile(r'(book|item|result|search)'))
        print(f"Found {len(candidates)} elements with 'book', 'item', 'result', or 'search' in class name.")
        
        titles = soup.find_all('h3') # Titles are often h3
        if titles:
            print(f"Found {len(titles)} <h3> elements. First few text: {[t.get_text(strip=True) for t in titles[:3]]}")

    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    inspect_kpl()
