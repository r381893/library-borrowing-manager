import json
import re

def get_author(title):
    mapping = [
        (r'科學發明王', '小熊工作室'),
        (r'小醫師復仇者聯盟', '高熙正'),
        (r'普通兄妹', '普通兄妹'),
        (r'尋寶記', '小熊工作室'),
        (r'梅子老師', '朴成恩'),
        (r'金英夏', '金英夏'),
        (r'心靈學校', '宋彥'),
        (r'水果奶奶', '趙自強'),
        (r'妙妙喵', '妙妙喵'),
        (r'科學實驗王', '小熊工作室'),
        (r'汪汪狗', '汪汪狗'),
        (r'便當實驗室', '上田太太'),
        (r'Why 博士', '胡妙芬'),
    ]
    
    for pattern, author in mapping:
        if re.search(pattern, title):
            return author
            
    return '未分類作者'

try:
    with open('library-app/src/data/books.json', 'r', encoding='utf-8') as f:
        books = json.load(f)
        
    for book in books:
        book['author'] = get_author(book['title'])
        # Also clean up status if needed, but it's already '在庫'
        
    with open('library-app/src/data/books.json', 'w', encoding='utf-8') as f:
        json.dump(books, f, ensure_ascii=False, indent=2)
        
    print(f"Updated authors for {len(books)} books.")
    
except Exception as e:
    print(f"Error: {e}")
