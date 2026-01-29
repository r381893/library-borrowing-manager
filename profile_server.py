import pandas as pd
import time
import os
import logging

# Mock logger
logger = logging.getLogger(__name__)

EXCEL_FILE = '圖書館借書清單.xlsx'
CATEGORIES = [
    '新書-待借', '待借', '不能借', '食譜', '頁數太多', 
    '已看-3447本', '已看-1', '未到館'
]

def read_all_books_original():
    print("Testing Original Logic...")
    start_total = time.time()
    books = []
    
    start_load = time.time()
    xls = pd.ExcelFile(EXCEL_FILE)
    print(f"ExcelFile init: {time.time() - start_load:.4f}s")
    
    book_id = 0
    
    for sheet_name in xls.sheet_names:
        if sheet_name not in CATEGORIES:
            continue
            
        t0 = time.time()
        df = pd.read_excel(xls, sheet_name=sheet_name)
        read_time = time.time() - t0
        
        t1 = time.time()
        # Original Logic Simulation
        has_author = '作者' in df.columns
        has_title = '書名' in df.columns
        
        count = 0
        if has_author and has_title:
            for _, row in df.iterrows():
                title = str(row['書名']) if pd.notna(row['書名']) else ''
                author = str(row['作者']) if pd.notna(row['作者']) else '未分類作者'
                
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

                if date and ' ' in date:
                    date = date.split(' ')[0]

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
                count += 1
        else:
             # Fallback logic simplified for benchmark
             pass
             
        process_time = time.time() - t1
        print(f"Sheet {sheet_name}: Read={read_time:.4f}s, Process={process_time:.4f}s, Rows={count}")

    print(f"Total Time (Original): {time.time() - start_total:.4f}s")
    return books

def read_all_books_optimized():
    print("\nTesting Optimized Logic...")
    start_total = time.time()
    books = []
    
    start_load = time.time()
    xls = pd.ExcelFile(EXCEL_FILE)
    print(f"ExcelFile init: {time.time() - start_load:.4f}s")
    
    book_id = 0
    
    for sheet_name in xls.sheet_names:
        if sheet_name not in CATEGORIES:
            continue
            
        t0 = time.time()
        # Read all as string initially to avoid type checks later? Or just handle na
        df = pd.read_excel(xls, sheet_name=sheet_name)
        read_time = time.time() - t0
        
        t1 = time.time()
        
        # Optimized Logic: usage of to_dict('records') or vectorized
        # Ideally, standardize columns first
        
        # Identify columns
        cols = df.columns.tolist()
        title_col = '書名' if '書名' in cols else (cols[1] if len(cols)>1 else None)
        author_col = '作者' if '作者' in cols else (cols[0] if len(cols)>0 else None)
        
        # Best guess for date/note
        date_col = '到期日' if '到期日' in cols else (cols[2] if len(cols)>2 else None)
        note_col = 'ISBN' if 'ISBN' in cols else (cols[3] if len(cols)>3 else None)
        
        if not title_col: continue

        # Vectorized fillna
        # df[cols] = df[cols].fillna('') # Can be slow if mixed types
        
        # Iterate over records - much faster than iterrows
        records = df.to_dict('records')
        
        sheet_books = []
        for row in records:
            # Direct dict access
            title = str(row.get(title_col, ''))
            if title == 'nan': title = ''
            
            # Simple skip header check
            if not title or title == '書名': continue
            
            author = str(row.get(author_col, '未分類作者'))
            if author == 'nan': author = '未分類作者'
            
            date = str(row.get(date_col, ''))
            if date == 'nan': date = ''
            elif ' ' in date: date = date.split(' ')[0]
            
            note = str(row.get(note_col, ''))
            if note == 'nan': note = ''

            sheet_books.append({
                'id': book_id,
                'title': title.strip(),
                'author': author.strip() if author else '未分類作者',
                'category': sheet_name,
                'date': date,
                'note': note
            })
            book_id += 1
        
        # Fix IDs if bulk add? No, simple append is fine.
        books.extend(sheet_books)

        process_time = time.time() - t1
        print(f"Sheet {sheet_name}: Read={read_time:.4f}s, Process={process_time:.4f}s, Rows={len(sheet_books)}")

    print(f"Total Time (Optimized): {time.time() - start_total:.4f}s")
    return books

if __name__ == "__main__":
    b1 = read_all_books_original()
    b2 = read_all_books_optimized()
    print(f"\nCount Check: Original={len(b1)}, Optimized={len(b2)}")
