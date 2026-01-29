import requests
import sys

try:
    print("Testing connection to http://127.0.0.1:5000/api/books...")
    response = requests.get('http://127.0.0.1:5000/api/books', timeout=5)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Got {len(data)} books.")
    else:
        print(f"Failed: {response.text}")
except Exception as e:
    print(f"Connection Error: {e}")
