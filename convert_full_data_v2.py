"""
重新轉換 Excel 資料，保留完整欄位（到期日、借閱者類型等）
"""
import pandas as pd
import json
from datetime import datetime

file_path = '圖書館借書清單_1.xlsx'
output_path = 'data/books.json'

def clean_value(val):
    if pd.isna(val):
        return ""
    return str(val).strip()

def format_date(val):
    """格式化日期欄位"""
    if pd.isna(val):
        return ""
    if isinstance(val, str):
        return val.strip()
    try:
        # 如果是 datetime 物件，格式化為易讀格式
        return val.strftime('%Y-%m-%d')
    except:
        return str(val).strip()

def process_sheet(xls, sheet_name):
    print(f"處理工作表: {sheet_name}...")
    try:
        # 先讀取原始資料
        df_raw = pd.read_excel(xls, sheet_name=sheet_name, header=None)
        num_cols = len(df_raw.columns)
        
        print(f"  欄數: {num_cols}")
        
        books = []
        
        # 根據欄數判斷結構
        if num_cols == 1:
            # 只有書名（如 新書-待借）
            for i, row in df_raw.iterrows():
                title = clean_value(row[0])
                if title and title not in ['書名', '作者']:
                    books.append({
                        "title": title,
                        "author": "未分類作者",
                        "due_date": "",
                        "borrower": "",
                        "category": sheet_name
                    })
                    
        elif num_cols == 2:
            # 作者、書名
            for i, row in df_raw.iterrows():
                author = clean_value(row[0])
                title = clean_value(row[1])
                if title and title not in ['書名', '作者'] and author not in ['作者']:
                    books.append({
                        "title": title,
                        "author": author if author else "未分類作者",
                        "due_date": "",
                        "borrower": "",
                        "category": sheet_name
                    })
                    
        elif num_cols == 4:
            # 作者、書名、到期日、借閱者 (如 已看-1, 未到館)
            for i, row in df_raw.iterrows():
                author = clean_value(row[0])
                title = clean_value(row[1])
                due_date = format_date(row[2])
                borrower = clean_value(row[3])
                
                if title and title not in ['書名', '作者'] and author not in ['作者']:
                    books.append({
                        "title": title,
                        "author": author if author else "未分類作者",
                        "due_date": due_date,
                        "borrower": borrower,
                        "category": sheet_name
                    })
                    
        elif num_cols >= 5:
            # 作者、書名、到期日、ISBN（實際為借閱者）、先借
            # 或者標準5欄格式
            for i, row in df_raw.iterrows():
                author = clean_value(row[0])
                title = clean_value(row[1])
                due_date = format_date(row[2])
                # 第4欄可能是ISBN，但根據實際資料，很多時候是借閱者
                col3 = clean_value(row[3])
                col4 = clean_value(row[4]) if num_cols > 4 else ""
                
                # 判斷col3是否為借閱者類型（包含「州個人」「州家庭」「妹」等）
                borrower_keywords = ['州個人', '州家庭', '妹', 'ELMO']
                if any(kw in col3 for kw in borrower_keywords):
                    borrower = col3
                else:
                    borrower = col4  # 可能在第5欄
                
                if title and title not in ['書名', '作者'] and author not in ['作者']:
                    books.append({
                        "title": title,
                        "author": author if author else "未分類作者",
                        "due_date": due_date,
                        "borrower": borrower,
                        "category": sheet_name
                    })
        
        return books
        
    except Exception as e:
        print(f"  處理 {sheet_name} 時發生錯誤: {e}")
        import traceback
        traceback.print_exc()
        return []

try:
    xls = pd.ExcelFile(file_path)
    all_books = []
    
    for sheet in xls.sheet_names:
        sheet_books = process_sheet(xls, sheet)
        all_books.extend(sheet_books)
        print(f"  -> 加入 {len(sheet_books)} 本書籍")
    
    # 為每本書籍添加唯一ID
    for i, book in enumerate(all_books):
        book['id'] = i
    
    print(f"\n總共提取: {len(all_books)} 本書籍")
    
    # 儲存到 JSON
    import os
    os.makedirs('data', exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_books, f, ensure_ascii=False, indent=2)
    
    print(f"已儲存到 {output_path}")
    
    # 顯示一些範例
    print("\n範例資料:")
    for book in all_books[:5]:
        print(f"  {book}")
        
except Exception as e:
    print("發生致命錯誤:", e)
    import traceback
    traceback.print_exc()
