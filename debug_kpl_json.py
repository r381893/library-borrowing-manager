import requests
from bs4 import BeautifulSoup
import json

def debug_structure():
    url = "https://webpacx.ksml.edu.tw/search?q=科學發明王"
    headers = {
        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        script = soup.find('script', id='__NEXT_DATA__')
        
        if script:
            data = json.loads(script.string)
            queries = data.get('props', {}).get('pageProps', {}).get('dehydratedState', {}).get('queries', [])
            
            print(f"Total Queries: {len(queries)}")
            for i, q in enumerate(queries):
                q_key = q.get('queryKey')
                data_obj = q.get('state', {}).get('data')
                
                print(f"\nQuery {i} Key: {q_key}")
                if isinstance(data_obj, dict):
                    print("Data keys:", list(data_obj.keys()))
                    # Check first few keys values type
                    for k in list(data_obj.keys())[:3]:
                        val = data_obj[k]
                        print(f"  {k}: {type(val)} - {str(val)[:50]}")
                elif isinstance(data_obj, list):
                    print(f"Data is list of length {len(data_obj)}")
                else:
                    print(f"Data type: {type(data_obj)}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_structure()
