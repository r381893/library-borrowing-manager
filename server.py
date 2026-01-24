"""
圖書館借書管理系統 - Python 後端 API
直接讀寫 Excel 檔案，提供 RESTful API 給前端使用
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # 允許跨域請求

# Excel 檔案路徑
EXCEL_FILE = os.path.join(os.path.dirname(__file__), '圖書館借書清單.xlsx')

# 分類對應的工作表名稱
CATEGORIES = [
    '新書-待借',
    '待借',
    '不能借',
    '食譜',
    '頁數太多',
    '已看-3447本',
    '已看-1',
    '未到館'
]

def read_all_books():
    """從 Excel 讀取所有書籍"""
    books = []
    try:
        xls = pd.ExcelFile(EXCEL_FILE)
        book_id = 0
        
        for sheet_name in xls.sheet_names:
            if sheet_name not in CATEGORIES:
                continue
                
            df = pd.read_excel(xls, sheet_name=sheet_name)
            
            # 嘗試找出作者和書名欄位
            has_author = '作者' in df.columns
            has_title = '書名' in df.columns
            
            if has_author and has_title:
                for _, row in df.iterrows():
                    title = str(row['書名']) if pd.notna(row['書名']) else ''
                    author = str(row['作者']) if pd.notna(row['作者']) else '未分類作者'
                    
                    # 嘗試讀取額外欄位
                    date = ''
                    if '到期日' in row:
                        date = str(row['到期日']) if pd.notna(row['到期日']) else ''
                    elif len(df.columns) > 2: # 嘗試依位置讀取
                        val = row.iloc[2]
                        date = str(val) if pd.notna(val) else ''

                    note = ''
                    if 'ISBN' in row: # 在待借工作表中，借閱人似乎被標記為 ISBN
                        note = str(row['ISBN']) if pd.notna(row['ISBN']) else ''
                    elif len(df.columns) > 3: # 嘗試依位置讀取
                        val = row.iloc[3]
                        note = str(val) if pd.notna(val) else ''

                    # 格式化日期 (移除時間部分)
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
            else:
                # 沒有標準欄位，假設第一欄是作者，第二欄是書名
                header = None
                # 檢查第一列是否為標題
                first_row = pd.read_excel(xls, sheet_name=sheet_name, nrows=1, header=None).iloc[0]
                if str(first_row[0]) in ['作者'] and str(first_row[1]) in ['書名']:
                    df_raw = pd.read_excel(xls, sheet_name=sheet_name) # 有標題
                    # 遞迴或重新處理... 這裡簡單處理，因為上面已經cover了有標題的情況
                    # 實際上如果代碼走到這，表示 has_author/has_title 為 False，但第一列如果是標題，pandas 應該會抓到
                    # 所以這裡通常是處理真的沒有標題的情況
                    df_raw = pd.read_excel(xls, sheet_name=sheet_name, header=None)
                else:
                    df_raw = pd.read_excel(xls, sheet_name=sheet_name, header=None)

                for _, row in df_raw.iterrows():
                    if len(row) >= 2:
                        author = str(row[0]) if pd.notna(row[0]) else '未分類作者'
                        title = str(row[1]) if pd.notna(row[1]) else ''
                    else:
                        author = '未分類作者'
                        title = str(row[0]) if pd.notna(row[0]) else ''
                    
                    # 嘗試讀取日期 (col 2) 和 備註 (col 3)
                    date = ''
                    if len(row) > 2:
                        val = row[2]
                        date = str(val) if pd.notna(val) else ''
                    
                    note = ''
                    if len(row) > 3:
                        val = row[3]
                        note = str(val) if pd.notna(val) else ''

                    # 格式化日期
                    if date and ' ' in date:
                        date = date.split(' ')[0]
                    
                    if title and title not in ['作者', '書名']:
                        books.append({
                            'id': book_id,
                            'title': title.strip(),
                            'author': author.strip() if author else '未分類作者',
                            'category': sheet_name,
                            'date': date,
                            'note': note
                        })
                        book_id += 1
                        
    except Exception as e:
        print(f"讀取 Excel 錯誤: {e}")
        
    return books

def save_all_books(books):
    """將所有書籍寫回 Excel"""
    try:
        # 按分類分組
        categorized = {}
        for cat in CATEGORIES:
            categorized[cat] = []
            
        for book in books:
            cat = book.get('category', '新書-待借')
            if cat in categorized:
                categorized[cat].append(book)
            else:
                categorized['新書-待借'].append(book)
        
        # 寫入 Excel
        with pd.ExcelWriter(EXCEL_FILE, engine='openpyxl') as writer:
            for cat, cat_books in categorized.items():
                if cat_books:
                    df = pd.DataFrame([{
                        '作者': b.get('author', ''),
                        '書名': b.get('title', '')
                    } for b in cat_books])
                    df.to_excel(writer, sheet_name=cat, index=False)
                else:
                    # 寫入空的工作表以保留結構
                    pd.DataFrame(columns=['作者', '書名']).to_excel(writer, sheet_name=cat, index=False)
                    
        return True
    except Exception as e:
        print(f"寫入 Excel 錯誤: {e}")
        return False

# API 路由

@app.route('/api/books', methods=['GET'])
def get_books():
    """取得所有書籍"""
    books = read_all_books()
    return jsonify(books)

@app.route('/api/books', methods=['POST'])
def add_book():
    """新增書籍"""
    data = request.json
    books = read_all_books()
    
    new_id = max([b['id'] for b in books], default=-1) + 1
    new_book = {
        'id': new_id,
        'title': data.get('title', ''),
        'author': data.get('author', '未分類作者'),
        'category': data.get('category', '新書-待借')
    }
    books.insert(0, new_book)
    
    if save_all_books(books):
        return jsonify(new_book), 201
    else:
        return jsonify({'error': '儲存失敗'}), 500

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """更新書籍"""
    data = request.json
    books = read_all_books()
    
    for i, book in enumerate(books):
        if book['id'] == book_id:
            books[i] = {
                'id': book_id,
                'title': data.get('title', book['title']),
                'author': data.get('author', book['author']),
                'category': data.get('category', book['category'])
            }
            break
    
    if save_all_books(books):
        return jsonify(books[i])
    else:
        return jsonify({'error': '儲存失敗'}), 500

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """刪除書籍"""
    books = read_all_books()
    books = [b for b in books if b['id'] != book_id]
    
    if save_all_books(books):
        return jsonify({'success': True})
    else:
        return jsonify({'error': '儲存失敗'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """取得統計資料"""
    books = read_all_books()
    
    # 作者統計
    authors = {}
    for book in books:
        author = book.get('author', '未分類作者')
        if author and author != '未分類作者':
            if author not in authors:
                authors[author] = []
            authors[author].append(book['title'])
    
    # 分類統計
    category_stats = {}
    for cat in CATEGORIES:
        category_stats[cat] = len([b for b in books if b.get('category') == cat])
    
    return jsonify({
        'total_books': len(books),
        'total_authors': len(authors),
        'category_stats': category_stats,
        'authors': authors
    })

if __name__ == '__main__':
    print("=" * 50)
    print("📚 圖書館借書管理系統 - API 服務")
    print("=" * 50)
    print(f"Excel 檔案: {EXCEL_FILE}")
    print(f"API 網址: http://localhost:5000")
    print("=" * 50)
    app.run(debug=True, port=5000)
