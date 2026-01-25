import json

# Mapping of partial/full titles to ISBNs
# Based on search results
isbn_map = {
    "科學發明王42": "9786263587861",
    "小醫師復仇者聯盟. 16": "9786267772188",
    "普通兄妹的搞笑對決11": "9786263587403",
    "普通兄妹的密室逃脫任務 2": "9786263581470",
    "梅子老師這一班7": "9786264174527",
    "金英夏的世界文學遠征隊5": "9786267546963",
    "普通兄妹的搞笑對決4": "9786263581241",
    "心靈學校6": "9789863427162",
    "妙妙喵圖解生活科學4": "9786264063234",
    "科學實驗王理科關鍵字": "9786263588233", # Partial match
    "普通兄妹的搞笑對決12": "9786263588141",
    "汪汪狗圖解生活數學3": "9786264063524",
    "問問 Why 博士2": "9789579502726",
    "問問 Why 博士3": "9789579502733",
    "問問 Why 博士4": "9786263267961"
}

def update_manual():
    file_path = 'library-app/src/data/books.json'
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            books = json.load(f)
            
        updated_count = 0
        for book in books:
            if book['category'] != '新書-待借':
                continue
                
            title = book['title']
            
            # Simple fuzzy match
            matched_isbn = None
            for key, isbn in isbn_map.items():
                # Check formatting differences (parens, spaces)
                clean_key = key.replace(' ', '').replace('：', '').replace(':', '')
                clean_title = title.replace(' ', '').replace('：', '').replace(':', '')
                
                if clean_key in clean_title:
                    matched_isbn = isbn
                    break
            
            if matched_isbn:
                # Only update if no ISBN or different
                if not book.get('note') or book['note'] != matched_isbn:
                    print(f"Updating '{title}' -> ISBN: {matched_isbn}")
                    book['note'] = matched_isbn
                    updated_count += 1
        
        if updated_count > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(books, f, ensure_ascii=False, indent=2)
            print(f"\nSuccessfully updated {updated_count} books.")
        else:
            print("No books needed updating.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_manual()
