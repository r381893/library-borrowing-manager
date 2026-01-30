
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import os
import glob

# 1. 初始化 Firebase
key_path = 'key.json' 
if not os.path.exists(key_path):
    print("❌ 錯誤：找不到 key.json 鑰匙檔案！無法連線。")
    input("按 Enter 離開...")
    exit()

try:
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ 已連線到雲端資料庫")
except Exception as e:
    if 'The default Firebase app already exists' in str(e):
        db = firestore.client()
    else:
        print(f"❌ 連線失敗: {e}")
        input("按 Enter 離開...")
        exit()

# 2. 選擇 Excel 檔案
excel_files = glob.glob('*.xlsx')
if not excel_files:
    print("❌ 找不到任何 .xlsx Excel 檔案。")
    input("按 Enter 離開...")
    exit()

print("\n=== 請選擇要匯入的檔案 ===")
for i, f in enumerate(excel_files):
    print(f"{i+1}. {f}")

choice = input("\n請輸入編號 (例如 1): ")
try:
    idx = int(choice) - 1
    target_file = excel_files[idx]
except:
    print("❌ 輸入錯誤。")
    input("按 Enter 離開...")
    exit()

print(f"\n📂 正在讀取: {target_file} ...")
try:
    df = pd.read_excel(target_file)
except Exception as e:
    print(f"❌ 讀取 Excel 失敗: {e}")
    input("按 Enter 離開...")
    exit()

# 3. 確認匯入模式
print(f"Excel 中共有 {len(df)} 筆資料。")
print("\n⚠️  警告：匯入功能會將 Excel 資料上傳到雲端。")
print("1. 【安全模式】只新增 ID 不存在的書 (不會覆蓋舊書)")
print("2. 【覆蓋模式】依照 ID 強制更新所有內容 (若 ID 相同會被覆蓋)")

mode = input("請選擇模式 (1 或 2): ")

batch = db.batch()
batch_count = 0
total_processed = 0

print("\n🚀 開始匯入...")

# 為了加速檢查，先抓取現有 ID (如果數量很大，這種方式可能要優化，但 5000 筆還好)
existing_ids = set()
if mode == '1':
    print("🔍 正在掃描現有雲端資料...")
    docs = db.collection('books').stream()
    for doc in docs:
        data = doc.to_dict()
        if 'id' in data:
            existing_ids.add(str(data['id']))

books_ref = db.collection('books')

for index, row in df.iterrows():
    # 處理欄位對應
    # Excel 欄位可能叫做: '系統ID', '分類', '書名', '作者', '借閱人_備註', '日期'
    # 或是舊版的: 'id', 'category', 'title', ...
    
    # 嘗試抓取 ID
    sys_id = row.get('系統ID') or row.get('id')
    
    # 如果沒有 ID，就根據時間產生一個新的 (如果是新書)
    if pd.isna(sys_id) or sys_id == '':
         sys_id = int(pd.Timestamp.now().timestamp() * 1000) + index # 避免重複
    
    sys_id_str = str(sys_id)
    
    # 【安全模式】跳過已存在
    if mode == '1' and sys_id_str in existing_ids:
        continue

    # 準備資料
    book_data = {
        'id': sys_id,
        'title': str(row.get('書名') or row.get('title') or ''),
        'author': str(row.get('作者') or row.get('author') or '未分類作者'),
        'category': str(row.get('分類') or row.get('category') or '新書-待借'),
        'note': str(row.get('借閱人_備註') or row.get('note') or ''),
        'date': str(row.get('日期') or row.get('date') or '')
    }
    
    # 處理日期格式 (如果是 Timestamp)
    if 'Timestamp' in str(type(row.get('日期', ''))):
         book_data['date'] = row['日期'].strftime('%Y-%m-%d')
    if pd.isna(book_data['date']) or book_data['date'] == 'NaT':
        book_data['date'] = ''
        
    if pd.isna(book_data['note']) or book_data['note'] == 'nan':
        book_data['note'] = ''

    # 判斷 Document ID
    # 為了讓網頁能順利操作，我們可以用 Query 找 Doc，或是如果這是遷移來的，我們可能不知道 Doc ID。
    # 策略：
    # 如果是覆蓋模式，我們需要先找到該 ID 對應的 Doc ID (如果有的話)。
    # 這會比較慢。
    # 簡化策略：我們用 'id' 欄位當作識別。
    # 但 Firestore 的 Document ID 是隨機的 (或是我們之前設的)。
    
    # 為了效能，如果是大量匯入，我們直接 Add 新文件? 不行，會重複。
    # 我們用 Query 找有無此 ID
    
    # 由於 Batch Limit 500，我們每 400 筆送一次。
    # 這裡如果不先 Query，很難做「更新」。
    # 為了簡單與效能，假設是【還原】：我們先清空？太危險。
    
    # 實作：Query by 'id'
    # 這在 Loop 裡做會很慢。
    
    # 改進：
    # 這裡的 restore 主要是給「備份還原」用。
    # 當初 migrate 是用 batch add。
    
    # 我們採用「透過 id 查詢並寫入」的方式 (雖然慢一點但準確)
    # 或是如果使用者確定是想「新增」，就直接 Add。
    
    # 這裡實作「Smart Update」太複雜，我們做一個簡單版：
    # 針對每一列，發送一個 set (merge=True) 到一個以 ID 命名的 Document?
    # 之前我們 migrate 是讓 Firestore 自動產生 ID。這樣就無法用 ID 覆寫了！
    # 這是個問題。
    
    # 解決方案：
    # 我們當初 migrate 的時候，Doc ID 是自動產生的。
    # 所以要覆蓋，必須先知道 Doc ID。
    # 備份檔裡面沒有 Doc ID (除非我剛改的 export 有加？)
    # 我剛剛改的 handleExport 裡面沒有加 docId (`books.map(book => ({ '系統ID': book.id ... }))`)。
    # 所以我們只知道 internal ID。
    
    # 這樣的話，要「更新」舊資料很難 (因為不知道 Doc ID)。
    # 除非我們先下載所有現有書的 ID -> DocID Mapping。
    
    pass 

# 重新規劃：
# 1. 下載現有 books (id -> doc_id map)
print("🔍 正在下載 ID 對照表...")
id_map = {} # id (str) -> doc_id
docs = books_ref.stream()
for d in docs:
    dd = d.to_dict()
    if 'id' in dd:
        id_map[str(dd['id'])]] = d.id

# 2. 處理 Excel
for index, row in df.iterrows():
    sys_id = row.get('系統ID') or row.get('id')
    if pd.isna(sys_id) or sys_id == '':
         sys_id = int(pd.Timestamp.now().timestamp() * 1000) + index
    
    sys_id_str = str(sys_id)
    
    # 準備內容
    book_data = {
        'id': sys_id,
        'title': str(row.get('書名') or row.get('title') or ''),
        'author': str(row.get('作者') or row.get('author') or '未分類作者'),
        'category': str(row.get('分類') or row.get('category') or '新書-待借'),
        'note': str(row.get('借閱人_備註') or row.get('note') or ''),
        'date': str(row.get('日期') or row.get('date') or '')
    }
    # Date clean
    if 'Timestamp' in str(type(row.get('日期', ''))):
         book_data['date'] = row['日期'].strftime('%Y-%m-%d')
    if pd.isna(book_data['date']) or book_data['date'] == 'NaT': book_data['date'] = ''
    if pd.isna(book_data['note']) or book_data['note'] == 'nan': book_data['note'] = ''

    # 決定 Ref
    doc_ref = None
    if sys_id_str in id_map:
        if mode == '1': continue # Skip existing
        doc_ref = books_ref.document(id_map[sys_id_str]) # Update existing
    else:
        doc_ref = books_ref.document() # Create new ID
        
    batch.set(doc_ref, book_data, merge=True)
    batch_count += 1
    total_processed += 1
    
    if batch_count >= 400:
        batch.commit()
        print(f"✅ 已處理 {total_processed} 筆...")
        batch = db.batch()
        batch_count = 0

if batch_count > 0:
    batch.commit()

print(f"\n🎉 匯入完成！共處理 {total_processed} 筆資料。")
input("按 Enter 結束...")
