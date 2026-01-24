"""
📚 圖書館借書管理系統 - Streamlit 版本
"""

import streamlit as st
import pandas as pd
import json
from pathlib import Path
from datetime import datetime

# 頁面設定
st.set_page_config(
    page_title="圖書館借書管理系統",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 自訂 CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
        margin-bottom: 1rem;
    }
    .stat-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 12px;
        color: white;
        text-align: center;
    }
    .stat-number {
        font-size: 2rem;
        font-weight: 700;
    }
    .stat-label {
        font-size: 0.9rem;
        opacity: 0.9;
    }
    .category-tag {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 500;
        margin-right: 0.5rem;
    }
</style>
""", unsafe_allow_html=True)

# 分類設定
CATEGORIES = [
    '全部', '新書-待借', '待借', '未到館', '不能借', 
    '食譜', '頁數太多', '已看-3447本', '已看-1'
]

CATEGORY_COLORS = {
    '新書-待借': '#3b82f6',
    '待借': '#06b6d4',
    '未到館': '#f59e0b',
    '不能借': '#ef4444',
    '食譜': '#10b981',
    '頁數太多': '#6366f1',
    '已看-3447本': '#22c55e',
    '已看-1': '#84cc16',
}

# 資料檔案路徑
DATA_FILE = Path(__file__).parent / "data" / "books.json"

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

# 初始化 session state
if 'books' not in st.session_state:
    st.session_state.books = load_books()

if 'editing_index' not in st.session_state:
    st.session_state.editing_index = None

# ========== 側邊欄 ==========
with st.sidebar:
    st.markdown("## 📚 分類篩選")
    
    # 分類統計
    category_counts = {}
    for cat in CATEGORIES:
        if cat == '全部':
            category_counts[cat] = len(st.session_state.books)
        else:
            category_counts[cat] = len([b for b in st.session_state.books if b.get('category') == cat])
    
    selected_category = st.radio(
        "選擇分類",
        CATEGORIES,
        format_func=lambda x: f"{x} ({category_counts.get(x, 0)})"
    )
    
    st.divider()
    
    # 搜尋
    search_term = st.text_input("🔍 搜尋書名/作者", "")
    
    # 排序
    sort_by = st.selectbox(
        "排序方式",
        ["作者筆畫", "書名筆畫"]
    )
    
    st.divider()
    
    # 新增書籍
    st.markdown("## ➕ 新增書籍")
    with st.form("add_book_form"):
        new_title = st.text_input("書名")
        new_author = st.text_input("作者", "未分類作者")
        new_category = st.selectbox("分類", CATEGORIES[1:])  # 排除 '全部'
        
        if st.form_submit_button("新增", use_container_width=True, type="primary"):
            if new_title:
                new_book = {
                    'id': len(st.session_state.books),
                    'title': new_title,
                    'author': new_author or '未分類作者',
                    'category': new_category
                }
                st.session_state.books.insert(0, new_book)
                save_books(st.session_state.books)
                st.success(f"✅ 已新增：{new_title}")
                st.rerun()
            else:
                st.error("請輸入書名")

# ========== 主頁面 ==========
st.markdown('<h1 class="main-header">📚 圖書館借書管理系統</h1>', unsafe_allow_html=True)

# 統計卡片
col1, col2, col3, col4 = st.columns(4)

total_books = len(st.session_state.books)
total_authors = len(set(b.get('author') for b in st.session_state.books if b.get('author') and b.get('author') != '未分類作者'))

with col1:
    st.metric("📖 總藏書量", f"{total_books:,}")
with col2:
    st.metric("✍️ 作者數量", f"{total_authors:,}")
with col3:
    new_books = len([b for b in st.session_state.books if b.get('category') == '新書-待借'])
    st.metric("📚 新書待借", f"{new_books:,}")
with col4:
    read_books = len([b for b in st.session_state.books if '已看' in b.get('category', '')])
    st.metric("✅ 已看書籍", f"{read_books:,}")

st.divider()

# 篩選資料
filtered_books = st.session_state.books.copy()

# 分類篩選
if selected_category != '全部':
    filtered_books = [b for b in filtered_books if b.get('category') == selected_category]

# 搜尋篩選
if search_term:
    search_lower = search_term.lower()
    filtered_books = [
        b for b in filtered_books 
        if search_lower in b.get('title', '').lower() or search_lower in b.get('author', '').lower()
    ]

# 排序
if sort_by == "作者筆畫":
    filtered_books.sort(key=lambda x: (
        x.get('author') == '未分類作者',  # 未分類排最後
        x.get('author', '')
    ))
else:
    filtered_books.sort(key=lambda x: x.get('title', ''))

# 顯示結果數量
st.markdown(f"### 顯示 **{len(filtered_books):,}** 本書籍")

# 分頁設定
ITEMS_PER_PAGE = 50
total_pages = max(1, (len(filtered_books) + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)

if 'current_page' not in st.session_state:
    st.session_state.current_page = 1

# 分頁導航
col_prev, col_info, col_next = st.columns([1, 2, 1])
with col_prev:
    if st.button("⬅️ 上一頁", disabled=st.session_state.current_page <= 1):
        st.session_state.current_page -= 1
        st.rerun()
with col_info:
    st.markdown(f"<center>第 {st.session_state.current_page} / {total_pages} 頁</center>", unsafe_allow_html=True)
with col_next:
    if st.button("下一頁 ➡️", disabled=st.session_state.current_page >= total_pages):
        st.session_state.current_page += 1
        st.rerun()

# 取得當前頁面的書籍
start_idx = (st.session_state.current_page - 1) * ITEMS_PER_PAGE
end_idx = start_idx + ITEMS_PER_PAGE
page_books = filtered_books[start_idx:end_idx]

# 建立 DataFrame
if page_books:
    df_data = []
    for i, book in enumerate(page_books):
        df_data.append({
            '序號': start_idx + i + 1,
            '分類': book.get('category', ''),
            '書名': book.get('title', ''),
            '作者': book.get('author', '未分類作者'),
            '_id': book.get('id', i)
        })
    
    df = pd.DataFrame(df_data)
    
    # 使用 data_editor 進行編輯
    edited_df = st.data_editor(
        df[['序號', '分類', '書名', '作者']],
        column_config={
            "序號": st.column_config.NumberColumn("序號", width="small", disabled=True),
            "分類": st.column_config.SelectboxColumn(
                "分類",
                options=CATEGORIES[1:],
                width="medium"
            ),
            "書名": st.column_config.TextColumn("書名", width="large"),
            "作者": st.column_config.TextColumn("作者", width="medium"),
        },
        hide_index=True,
        use_container_width=True,
        num_rows="fixed"
    )
    
    # 檢查是否有變更
    if not df[['序號', '分類', '書名', '作者']].equals(edited_df):
        # 更新資料
        for i, row in edited_df.iterrows():
            original_id = df_data[i]['_id']
            for book in st.session_state.books:
                if book.get('id') == original_id:
                    book['category'] = row['分類']
                    book['title'] = row['書名']
                    book['author'] = row['作者']
                    break
        save_books(st.session_state.books)
        st.success("✅ 已儲存變更")

else:
    st.info("沒有找到符合條件的書籍")

# 頁尾
st.divider()
st.markdown(
    f"<center style='color: gray;'>圖書館借書管理系統 • 最後更新：{datetime.now().strftime('%Y-%m-%d %H:%M')}</center>",
    unsafe_allow_html=True
)
