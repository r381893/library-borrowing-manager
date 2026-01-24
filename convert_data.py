import pandas as pd
import json

try:
    # Read without header
    df = pd.read_excel('圖書館借書清單.xlsx', header=None)
    
    # Rename column to title
    df.columns = ['title']
    
    # Add placeholder columns
    df['author'] = '未分類作者' # Uncategorized Author
    df['status'] = '在庫' # In Stock
    
    # Convert to list of dicts
    books = df.to_dict(orient='records')
    
    # Save to json
    with open('books.json', 'w', encoding='utf-8') as f:
        json.dump(books, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully converted {len(books)} books to books.json")
    
except Exception as e:
    print("Error converting:", e)
