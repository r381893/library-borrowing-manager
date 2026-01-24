"""
圖書館借書管理系統 - Railway 版本
Python Flask 後端 + 靜態前端
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import json
import os
from pathlib import Path

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# 資料檔案路徑
DATA_FILE = Path(__file__).parent / "data" / "books.json"

# 分類
CATEGORIES = [
    '新書-待借', '待借', '不能借', '食譜', 
    '頁數太多', '已看-3447本', '已看-1', '未到館'
]

def load_books():
    """載入書籍資料"""
    if DATA_FILE.exists():
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_books(books):
    """儲存書籍資料"""
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(books, f, ensure_ascii=False, indent=2)

# ========== API 路由 ==========

@app.route('/api/books', methods=['GET'])
def get_books():
    """取得所有書籍"""
    books = load_books()
    return jsonify(books)

@app.route('/api/books', methods=['POST'])
def add_book():
    """新增書籍"""
    data = request.json
    books = load_books()
    
    new_id = max([b.get('id', 0) for b in books], default=-1) + 1
    new_book = {
        'id': new_id,
        'title': data.get('title', ''),
        'author': data.get('author', '未分類作者'),
        'category': data.get('category', '新書-待借'),
        'date': data.get('date', ''),
        'note': data.get('note', '')
    }
    books.insert(0, new_book)
    save_books(books)
    
    return jsonify(new_book), 201

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """更新書籍"""
    data = request.json
    books = load_books()
    
    updated_book = None
    for i, book in enumerate(books):
        if book.get('id') == book_id:
            books[i] = {
                'id': book_id,
                'title': data.get('title', book.get('title')),
                'author': data.get('author', book.get('author')),
                'category': data.get('category', book.get('category')),
                'date': data.get('date', book.get('date', '')),
                'note': data.get('note', book.get('note', ''))
            }
            updated_book = books[i]
            break
    
    if updated_book:
        save_books(books)
        return jsonify(updated_book)
    else:
        return jsonify({'error': '找不到書籍'}), 404

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """刪除書籍"""
    books = load_books()
    books = [b for b in books if b.get('id') != book_id]
    save_books(books)
    return jsonify({'success': True})

# ========== 靜態檔案路由 ==========

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('static', path)):
        return send_from_directory('static', path)
    return send_from_directory('static', 'index.html')

# ========== 啟動 ==========

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 伺服器啟動於 http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
