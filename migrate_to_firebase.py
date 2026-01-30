
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import os
import json
import datetime

# 1. 初始化 Firebase
# 會尋找 key.json，請確保檔名已經改對了
key_path = 'key.json' 
if not os.path.exists(key_path):
    # 嘗試找任何 .json 檔案
    json_files = [f for f in os.listdir('.') if f.endswith('.json') and 'library' in f]
    if json_files:
        key_path = json_files[0]
        print(f"找不到 key.json，改用 {key_path}")
    else:
        print("錯誤：找不到 key.json 鑰匙檔案！請確認檔案在資料夾內。")
        exit()

try:
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase 連線成功！")
except Exception as e:
    print(f"❌ Firebase 連線失敗: {e}")
    exit()

# 2. 讀取 Excel 資料
EXCEL_FILE = '圖書館借書清單.xlsx'
CATEGORIES = [
    '新書-待借', '待借', '不能借', '食譜', '頁數太多',
    '已看-3447本', '已看-1', '未到館'
]

print(f"📚 正在讀取 {EXCEL_FILE}...")
books = []
xls = pd.ExcelFile(EXCEL_FILE)
book_id = 0

def is_valid_date(date_str):
    import re
    date_patterns = [
        r'^\d{4}-\d{1,2}-\d{1,2}$',
        r'^\d{4}/\d{1,2}/\d{1,2}$',
        r'^\d{1,2}/\d{1,2}/\d{4}$',
        r'^\d{1,2}/\d{1,2}$',
        r'^\d{1,2}-\d{1,2}$',
    ]
    for pattern in date_patterns:
        if re.match(pattern, date_str):
            return True
    return False

# Excel 讀取邏輯 (與 server.py 相同)
for sheet_name in xls.sheet_names:
    if sheet_name not in CATEGORIES:
        continue
        
    df = pd.read_excel(xls, sheet_name=sheet_name)
    
    cols = df.columns.tolist()
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

    if not col_map['title']: continue

    records = df.to_dict('records')
    for row in records:
        r_title = row.get(col_map['title'])
        r_author = row.get(col_map['author'])
        r_date = row.get(col_map['date'])
        r_note = row.get(col_map['note'])
        
        title = str(r_title).strip() if pd.notna(r_title) else ''
        if not title or title == '書名': continue
        
        author = str(r_author).strip() if pd.notna(r_author) else '未分類作者'
        if author == '作者': author = '未分類作者'
        
        date = str(r_date).strip() if pd.notna(r_date) else ''
        if ' ' in date: date = date.split(' ')[0]
        if date == '到期日': date = ''
        
        note = str(r_note).strip() if pd.notna(r_note) else ''
        if note == 'ISBN': note = ''
        
        if date and not is_valid_date(date):
            if not note: note = date
            date = ''

        books.append({
            'id': book_id,
            'title': title,
            'author': author if author else '未分類作者',
            'category': sheet_name,
            'date': date,
            'note': note,
            'created_at': firestore.SERVER_TIMESTAMP
        })
        book_id += 1

print(f"共讀取到 {len(books)} 本書。")

# 3. 批次寫入 Firestore
# Firestore 限制每次 batch 最多 500 筆，所以我們要分批
batch_size = 400
total_batches = (len(books) // batch_size) + 1

print(f"🚀 開始上傳到 Firebase (共 {total_batches} 批次)...")

# 清空現有集合 (如果有舊資料) - 選擇性，這裡先假設是全新的
# collection_ref = db.collection('books')
# docs = collection_ref.list_documents(page_size=batch_size)
# for doc in docs:
#     doc.delete()

for i in range(0, len(books), batch_size):
    batch = db.batch()
    chunk = books[i:i + batch_size]
    
    for book in chunk:
        # 使用書名+ID作為文件ID，避免重複，或直接用 auto-id
        # 為了簡單查詢，我們讓 Firestore 自動生成 ID，但在文件內保留 id 欄位
        # 或者指定 document ID 為 string(id)
        doc_ref = db.collection('books').document(str(book['id']))
        batch.set(doc_ref, book)
    
    batch.commit()
    print(f"✅ 第 {(i // batch_size) + 1}/{total_batches} 批次上傳完成 ({len(chunk)} 本)")

print("🎉 全部上傳完成！現在您的資料庫已經在雲端了！")
