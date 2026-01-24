import pandas as pd
import json

file_path = '圖書館借書清單.xlsx'

def clean_value(val):
    if pd.isna(val):
        return ""
    return str(val).strip()

def process_sheet(xls, sheet_name):
    print(f"Processing {sheet_name}...")
    try:
        # First try to read with header
        df = pd.read_excel(xls, sheet_name=sheet_name)
        
        # Check if '作者' and '書名' exist
        has_author = '作者' in df.columns
        has_title = '書名' in df.columns
        
        if not (has_author and has_title):
            # If standard headers missing, try reading without header
            # and assume Col 0 = Author, Col 1 = Title (unless only 1 column)
            df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
            
            if len(df.columns) >= 2:
                df = df.rename(columns={0: '作者', 1: '書名'})
            elif len(df.columns) == 1:
                df = df.rename(columns={0: '書名'})
                df['作者'] = '未分類作者'
        
        # Ensure needed columns exist
        if '作者' not in df.columns:
            df['作者'] = '未分類作者'
        if '書名' not in df.columns:
            return [] # Skip if no title
            
        books = []
        for _, row in df.iterrows():
            title = clean_value(row['書名'])
            author = clean_value(row['作者'])
            
            # Skip if title is empty or looks like a header (contains "書名")
            if not title or title == '書名':
                continue
                
            books.append({
                "title": title,
                "author": author if author else "未分類作者",
                "status": f"在庫 ({sheet_name})", # Use sheet name as status context
                "category": sheet_name
            })
            
        return books
        
    except Exception as e:
        print(f"Error processing {sheet_name}: {e}")
        return []

try:
    xls = pd.ExcelFile(file_path)
    all_books = []
    
    for sheet in xls.sheet_names:
        sheet_books = process_sheet(xls, sheet)
        all_books.extend(sheet_books)
        print(f"  -> Added {len(sheet_books)} books from {sheet}")
        
    print(f"Total books extracted: {len(all_books)}")
    
    # Save to json
    with open('library-app/src/data/books.json', 'w', encoding='utf-8') as f:
        json.dump(all_books, f, ensure_ascii=False, indent=2)
        
except Exception as e:
    print("Fatal error:", e)
