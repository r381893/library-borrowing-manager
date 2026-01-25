import requests
import json
import re

def clean_title(title):
    # Remove parens and special chars
    s = re.sub(r'[\(（].*?[\)）]', '', title)
    s = s.split(':')[0].split('：')[0]
    s = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', ' ', s)
    return s.strip()

def search_isbn(title):
    cleaned_title = clean_title(title)
    print(f"Searching for: {cleaned_title}")
    
    # Try Google Books API
    url = f"https://www.googleapis.com/books/v1/volumes?q={cleaned_title}&maxResults=1"
    try:
        response = requests.get(url, timeout=5)
        data = response.json()
        
        if 'items' in data and len(data['items']) > 0:
            volume_info = data['items'][0]['volumeInfo']
            industry_identifiers = volume_info.get('industryIdentifiers', [])
            
            isbn = None
            for identifier in industry_identifiers:
                if identifier['type'] == 'ISBN_13':
                    isbn = identifier['identifier']
                    break
                elif identifier['type'] == 'ISBN_10' and not isbn:
                    isbn = identifier['identifier']
            
            if isbn:
                print(f"  Found ISBN: {isbn} (Title: {volume_info.get('title')})")
                return isbn
            
    except Exception as e:
        print(f"  Error searching Google Books: {e}")
        
    return None

def main():
    try:
        with open('library-app/src/data/books.json', 'r', encoding='utf-8') as f:
            books = json.load(f)
            
        new_books = [b for b in books if b['category'] == '新書-待借']
        print(f"Found {len(new_books)} books in '新書-待借'. Starting search...")
        
        updated_count = 0
        for book in new_books:
            # Skip if already has ISBN (naive check)
            if book.get('note') and re.match(r'^\d{9,13}[\dxX]?$', book['note']):
                print(f"Skipping {book['title']}, already has ISBN: {book['note']}")
                continue
                
            isbn = search_isbn(book['title'])
            if isbn:
                book['note'] = isbn
                updated_count += 1
                
        if updated_count > 0:
            print(f"\nUpdated {updated_count} books with ISBNs.")
            with open('library-app/src/data/books.json', 'w', encoding='utf-8') as f:
                json.dump(books, f, ensure_ascii=False, indent=2)
            print("Saved to library-app/src/data/books.json")
        else:
            print("\nNo new ISBNs found.")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
