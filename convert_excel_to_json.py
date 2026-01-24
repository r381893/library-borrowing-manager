import pandas as pd
import json
import os

EXCEL_FILE = '圖書館借書清單.xlsx'
JSON_FILE = 'data/books.json'
CATEGORIES = [
    '新書-待借', '待借', '不能借', '食譜', 
    '頁數太多', '已看-3447本', '已看-1', '未到館'
]

def convert():
    if not os.path.exists(EXCEL_FILE):
        print(f"Error: {EXCEL_FILE} not found!")
        return

    print(f"Reading {EXCEL_FILE}...")
    xls = pd.ExcelFile(EXCEL_FILE)
    books = []
    book_id = 0
    
    for sheet_name in xls.sheet_names:
        if sheet_name not in CATEGORIES:
            continue
            
        print(f"Processing sheet: {sheet_name}")
        
        # 嘗試讀取（包含處理無標題列的情況）
        # 先試著讀 header
        df_check = pd.read_excel(xls, sheet_name=sheet_name, nrows=1)
        
        has_header = False
        if '作者' in df_check.columns and '書名' in df_check.columns:
            has_header = True
            
        if has_header:
            df = pd.read_excel(xls, sheet_name=sheet_name)
            for _, row in df.iterrows():
                title = str(row['書名']) if pd.notna(row['書名']) else ''
                author = str(row['作者']) if pd.notna(row['作者']) else '未分類作者'
                
                # 讀取額外欄位
                date = ''
                if '到期日' in row:
                    date = str(row['到期日']) if pd.notna(row['到期日']) else ''
                elif len(df.columns) > 2:
                    val = row.iloc[2]
                    date = str(val) if pd.notna(val) else ''

                note = ''
                if 'ISBN' in row:
                    note = str(row['ISBN']) if pd.notna(row['ISBN']) else ''
                elif len(df.columns) > 3:
                    val = row.iloc[3]
                    note = str(val) if pd.notna(val) else ''

                if date and ' ' in date: date = date.split(' ')[0]
                
                if title and title != '書名':
                    books.append({
                        'id': book_id,
                        'title': title.strip(),
                        'author': author.strip() if author else '未分類作者',
                        'category': sheet_name,
                        'date': date,
                        'note': note
                    })
                    book_id += 1
        else:
            # 無標題模式
            df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
            for _, row in df.iterrows():
                if len(row) == 0: continue
                
                if len(row) >= 2:
                    author = str(row[0]) if pd.notna(row[0]) else '未分類作者'
                    title = str(row[1]) if pd.notna(row[1]) else ''
                else:
                    # 只有一欄的情況 (例如：新書-待借)
                    author = '未分類作者'
                    title = str(row[0]) if pd.notna(row[0]) else ''
                
                if title in ['書名', '作者']: continue
                
                date = ''
                if len(row) > 2:
                    val = row[2]
                    date = str(val) if pd.notna(val) else ''
                
                note = ''
                if len(row) > 3:
                    val = row[3]
                    note = str(val) if pd.notna(val) else ''
                
                if date and ' ' in date: date = date.split(' ')[0]

                books.append({
                    'id': book_id,
                    'title': title.strip(),
                    'author': author.strip() if author else '未分類作者',
                    'category': sheet_name,
                    'date': date,
                    'note': note
                })
                book_id += 1

    # 存為 JSON
    os.makedirs('data', exist_ok=True)
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(books, f, ensure_ascii=False, indent=2)
        
    print(f"Success! Converted {len(books)} books into {JSON_FILE}")

if __name__ == '__main__':
    convert()
