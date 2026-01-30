
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import os
import datetime

# 1. 初始化 Firebase
key_path = 'key.json' 
if not os.path.exists(key_path):
    # 嘗試找任何 .json 檔案
    json_files = [f for f in os.listdir('.') if f.endswith('.json') and 'library' in f]
    if json_files:
        key_path = json_files[0]
    else:
        print("錯誤：找不到 key.json 鑰匙檔案！無法連線備份。")
        input("按 Enter 離開...")
        exit()

try:
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ 已連線到雲端資料庫")
except Exception as e:
    # 避免重複初始化
    if 'The default Firebase app already exists' in str(e):
        db = firestore.client()
    else:
        print(f"❌ 連線失敗: {e}")
        input("按 Enter 離開...")
        exit()

# 2. 下載資料
print("📥 正在下載所有書籍資料...")
books_ref = db.collection('books')
docs = books_ref.stream()

data = []
for doc in docs:
    book = doc.to_dict()
    # 確保欄位齊全
    data.append({
        '系統ID': book.get('id', ''),
        '分類': book.get('category', '未分類'),
        '書名': book.get('title', ''),
        '作者': book.get('author', ''),
        '借閱人_備註': book.get('note', ''),
        '日期': book.get('date', ''),
        '建立時間': book.get('created_at', '')
    })

print(f"✅ 共下載 {len(data)} 筆資料")

# 3. 轉存 Excel
timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
output_file = f'雲端備份_{timestamp}.xlsx'

if data:
    df = pd.read_json(json.dumps(data, default=str)) # 處理時間格式
    
    # 稍微排序一下 (依分類)
    # df = df.sort_values(by=['分類', '系統ID']) 
    
    # 存檔
    df.to_excel(output_file, index=False)
    print(f"💾 備份成功！檔案已儲存為：{output_file}")
else:
    print("⚠️ 資料庫是空的，沒有產生備份檔。")

# input("備份完成，按 Enter 結束...")
