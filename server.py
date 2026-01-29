"""
圖書館借書管理系統 - Python 後端 API
直接讀寫 Excel 檔案，提供 RESTful API 給前端使用
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import pandas as pd
import os
from datetime import datetime
import logging
import traceback

# 設定 Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("server.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允許跨域請求

# Excel 檔案路徑
EXCEL_FILE = os.path.join(os.path.dirname(__file__), '圖書館借書清單.xlsx')
LAST_MTIME = 0
CACHED_BOOKS = None

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
    """從 Excel 讀取所有書籍 (含快取機制) - Optimized"""
    global LAST_MTIME, CACHED_BOOKS
    
    try:
        # 檢查檔案是否存在
        if not os.path.exists(EXCEL_FILE):
             logger.error(f"Error: 找不到檔案 {EXCEL_FILE}")
             return []

        # Check file modification time
        current_mtime = os.path.getmtime(EXCEL_FILE)
        
        # 如果有快取且檔案沒變，直接回傳快取
        if CACHED_BOOKS is not None and current_mtime == LAST_MTIME:
            return CACHED_BOOKS

        print(f"Reading Excel file: {EXCEL_FILE}...")
        books = []
        xls = pd.ExcelFile(EXCEL_FILE)
        book_id = 0
        
        for sheet_name in xls.sheet_names:
            if sheet_name not in CATEGORIES:
                continue
                
            df = pd.read_excel(xls, sheet_name=sheet_name)
            
            # 嘗試找出作者和書名欄位
            cols = df.columns.tolist()
            has_author = '作者' in cols
            has_title = '書名' in cols
            
            # 如果沒有標準欄位，嘗試處理無標題或錯位的情況
            if not (has_author and has_title):
                 # 嘗試重新讀取 header=None (為了相容舊邏輯，雖然有點沒效率，但只針對格式錯誤的 sheet)
                 # 簡單檢查：如果第一列看起來像標題
                 is_header_row = False
                 if len(df) > 0:
                     # 檢查 DataFrame 的第一列是否包含 '作者' 或 '書名'
                     # 這裡簡化處理：如果找不到標準欄位，就假設它是 raw data，重新整理
                     # 為了保持高效，我們直接操作 df.values 或重讀
                     # 考慮到這種情況很少，我們可以用舊的 fallback 邏輯，或者直接假設欄位位置
                     
                     # 這裡為了效能，我們直接依欄位位置判斷
                     pass

            # 統一欄位名稱以便處理
            target_df = df.copy()
            
            # 定義欄位映射 (優先使用名稱，否則使用位置)
            col_map = {}
            
            if '書名' in cols: col_map['title'] = '書名'
            elif len(cols) > 1: col_map['title'] = cols[1]
            else: col_map['title'] = None
            
            if '作者' in cols: col_map['author'] = '作者'
            elif len(cols) > 0: col_map['author'] = cols[0]
            else: col_map['author'] = None
            
            if '到期日' in cols: col_map['date'] = '到期日'
            elif len(cols) > 2: col_map['date'] = cols[2]
            else: col_map['date'] = None
            
            if 'ISBN' in cols: col_map['note'] = 'ISBN'
            elif len(cols) > 3: col_map['note'] = cols[3]
            else: col_map['note'] = None

            if not col_map['title']: continue # 無法識別書名，跳過

            # 轉為字典列表，速度遠快於 iterrows
            records = target_df.to_dict('records')
            
            for row in records:
                # 取得原始值
                r_title = row.get(col_map['title'])
                r_author = row.get(col_map['author'])
                r_date = row.get(col_map['date'])
                r_note = row.get(col_map['note'])
                
                # 處理標題 (過濾掉標題行或空行)
                title = str(r_title).strip() if pd.notna(r_title) else ''
                if not title or title == '書名': continue
                
                author = str(r_author).strip() if pd.notna(r_author) else '未分類作者'
                if author == '作者': author = '未分類作者' # 防止標題行被誤讀
                
                # 處理日期
                date = str(r_date).strip() if pd.notna(r_date) else ''
                if ' ' in date: date = date.split(' ')[0]
                if date == '到期日': date = ''
                
                # 處理備註
                note = str(r_note).strip() if pd.notna(r_note) else ''
                if note == 'ISBN': note = ''

                books.append({
                    'id': book_id,
                    'title': title,
                    'author': author if author else '未分類作者',
                    'category': sheet_name,
                    'date': date,
                    'note': note
                })
                book_id += 1
                        
        # 更新快取
        CACHED_BOOKS = books
        LAST_MTIME = current_mtime
        logger.info(f"Read {len(books)} books. Updated cache.")
        return books
        
    except Exception as e:
        logger.error(f"讀取 Excel 錯誤: {e}")
        logger.error(traceback.format_exc())
        return CACHED_BOOKS if CACHED_BOOKS is not None else []

def save_all_books(books):
    """將所有書籍寫回 Excel (Smart Update)"""
    global CACHED_BOOKS, LAST_MTIME
    try:
        # 按分類分組 (New State)
        categorized = {cat: [] for cat in CATEGORIES}
        for book in books:
            cat = book.get('category', '新書-待借')
            if cat in categorized:
                categorized[cat].append(book)
            else:
                categorized['新書-待借'].append(book)
        
        # 判斷哪些工作表有變更
        changed_sheets = []
        
        # Group Old State (from Cache)
        if CACHED_BOOKS:
            old_categorized = {cat: [] for cat in CATEGORIES}
            for book in CACHED_BOOKS:
                cat = book.get('category', '新書-待借')
                if cat in old_categorized:
                    old_categorized[cat].append(book)
                else:
                    old_categorized['新書-待借'].append(book)
            
            # Compare
            for cat in CATEGORIES:
                if categorized[cat] != old_categorized[cat]:
                    changed_sheets.append(cat)
        else:
            # No cache, assume all changed (or first run)
            changed_sheets = list(CATEGORIES)

        if not changed_sheets and os.path.exists(EXCEL_FILE):
             logger.info("No changes detected. Skip saving.")
             return True

        # 設定寫入模式
        mode = 'a'
        if_sheet_exists = 'replace'
        
        # 如果檔案不存在，必須用 'w' 模式寫入所有工作表
        if not os.path.exists(EXCEL_FILE):
            mode = 'w'
            if_sheet_exists = None
            changed_sheets = list(CATEGORIES) # Write all
            logger.info("File not found, creating new file (write all sheets).")
        else:
            logger.info(f"Updating sheets: {changed_sheets}")

        # 準備寫入參數
        kwargs = {'engine': 'openpyxl', 'mode': mode}
        if mode == 'a':
            kwargs['if_sheet_exists'] = if_sheet_exists
            
        with pd.ExcelWriter(EXCEL_FILE, **kwargs) as writer:
            for cat in changed_sheets:
                cat_books = categorized[cat]
                if cat_books:
                    df = pd.DataFrame([{
                        '作者': b.get('author', '未分類作者'),
                        '書名': b.get('title', ''),
                        '到期日': b.get('date', ''),
                        'ISBN': b.get('note', '')
                    } for b in cat_books])
                    df.to_excel(writer, sheet_name=cat, index=False)
                else:
                    # 寫入空的工作表以保留結構
                    pd.DataFrame(columns=['作者', '書名', '到期日', 'ISBN']).to_excel(writer, sheet_name=cat, index=False)
                    
        # 更新快取
        CACHED_BOOKS = books
        # Update mtime to prevent immediate re-read
        if os.path.exists(EXCEL_FILE):
             LAST_MTIME = os.path.getmtime(EXCEL_FILE)
        
        logger.info("Successfully saved books to Excel.")
        return True
    except Exception as e:
        logger.error(f"寫入 Excel 錯誤: {e}")
        logger.error(traceback.format_exc())
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
    try:
        data = request.json
        logger.info(f"Adding new book: {data.get('title', 'Unknown')}")
        
        current_books = read_all_books()
        # Create a copy to avoid modifying cache before save success
        books = list(current_books)
        
        new_id = max([b['id'] for b in books], default=-1) + 1
        new_book = {
            'id': new_id,
            'title': data.get('title', ''),
            'author': data.get('author', '未分類作者'),
            'category': data.get('category', '新書-待借'),
            'date': data.get('date', ''),
            'note': data.get('note', '')
        }
        
        # Insert at the beginning
        books.insert(0, new_book)
        
        if save_all_books(books):
            logger.info(f"Book added successfully: ID {new_id}")
            return jsonify(new_book), 201
        else:
            logger.error("Failed to save book to Excel")
            return jsonify({'error': '儲存失敗'}), 500
            
    except Exception as e:
        logger.error(f"Error in add_book: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

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
                'category': data.get('category', book['category']),
                'date': data.get('date', book.get('date', '')),
                'note': data.get('note', book.get('note', ''))
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

@app.route('/api/export', methods=['GET'])
def export_books():
    """匯出 Excel 檔案"""
    try:
        if not os.path.exists(EXCEL_FILE):
             return jsonify({'error': '找不到原始檔案'}), 404
             
        # 確保 Excel 檔案存在且最新 (若是記憶體有更新但 save 失敗的情況... 但通常 save 會成功)
        # 這裡直接傳送檔案即可，因為所有修改都會立即寫入檔案
            
        return send_file(
            EXCEL_FILE,
            as_attachment=True,
            download_name=f'library_books_{datetime.now().strftime("%Y%m%d")}.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        logger.error(f"Export error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/debug/reload', methods=['POST'])
def force_reload():
    """強制重讀 Excel (清除快取)"""
    global CACHED_BOOKS, LAST_MTIME
    CACHED_BOOKS = None
    LAST_MTIME = 0
    books = read_all_books()
    return jsonify({'message': 'Cache cleared', 'count': len(books)})

if __name__ == '__main__':
    print("=" * 50)
    print("📚 圖書館借書管理系統 - API 服務")
    print("=" * 50)
    print(f"Excel 檔案: {EXCEL_FILE}")
    print(f"API 網址: http://localhost:5000")
    print("=" * 50)
    app.run(host='0.0.0.0', debug=True, port=5000, use_reloader=False) # Disable reloader to prevent double loops in some envs
