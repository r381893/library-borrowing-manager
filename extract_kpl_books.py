import requests
from bs4 import BeautifulSoup
import json

def extract_books():
    url = "https://webpacx.ksml.edu.tw/search?q=科學發明王"
    headers = {
        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    print(f"前往搜尋: {url}")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        script = soup.find('script', id='__NEXT_DATA__')
        if not script:
            print("找不到 __NEXT_DATA__")
            return

        data = json.loads(script.string)
        
        # Traverse to finding the queries
        queries = data.get('props', {}).get('pageProps', {}).get('dehydratedState', {}).get('queries', [])
        
        books_found = []
        
        for query in queries:
            # The search results are typically in a query where the key involves 'search'
            # or the data structure looks like a list
            state_data = query.get('state', {}).get('data', {})
            
            if isinstance(state_data, dict):
                # Common patterns: 'list', 'docs', 'result'
                candidate_list = state_data.get('list') or state_data.get('result') or state_data.get('docs')
                
                if candidate_list and isinstance(candidate_list, list):
                    for item in candidate_list:
                        # minimal check if it looks like a book
                        if 'title' in item:
                            books_found.append(item)
                            
        print(f"找到 {len(books_found)} 本書:")
        for book in books_found[:5]:
            title = book.get('title', 'No Title')
            author = book.get('author', 'No Author')
            # Handle list of authors if necessary
            if isinstance(author, list):
                author = ", ".join(author)
                
            print(f"- {title} / {author}")
            
    except Exception as e:
        print(f"發生錯誤: {e}")

if __name__ == "__main__":
    extract_books()
