# 📚 圖書館借書管理系統

一個現代化的圖書館借書清單管理網頁應用程式。

## ✨ 功能特色

- 📖 管理超過 5,000+ 本書籍
- 🏷️ 8 個分類標籤（新書-待借、待借、已看 等）
- 🔍 即時搜尋書名/作者
- 📝 依作者/書名筆畫排序
- 📊 卡片/表格兩種檢視模式
- 🌙 深色/淺色/純黑 三種主題
- 💾 即時同步至 Excel 檔案

## 🚀 快速開始

### 1. 安裝相依套件

```bash
# 安裝 Python 套件
pip install flask flask-cors pandas openpyxl

# 安裝前端套件
cd library-app
npm install
```

### 2. 啟動系統

**方法一：使用啟動檔（推薦）**
```
雙擊 啟動系統.bat
```

**方法二：手動啟動**
```bash
# 終端機 1 - 啟動後端
python server.py

# 終端機 2 - 啟動前端
cd library-app
npm run dev
```

### 3. 開啟瀏覽器
前往 http://localhost:5173

## 📁 專案結構

```
Library - Borrowing/
├── 圖書館借書清單.xlsx    # Excel 資料來源
├── server.py              # Python 後端 API
├── 啟動系統.bat           # Windows 一鍵啟動
├── library-app/           # React 前端
│   ├── src/
│   │   ├── App.jsx        # 主應用程式
│   │   ├── App.css        # 樣式
│   │   └── index.css      # 全域樣式 + 主題
│   └── package.json
└── README.md
```

## 🛠️ 技術棧

- **前端**: React + Vite
- **後端**: Python Flask
- **資料**: Excel (openpyxl)
- **樣式**: Vanilla CSS (Glassmorphism)

## 📝 注意事項

- 編輯書籍時請先關閉 Excel 檔案
- 資料會即時同步到 Excel
- 主題設定會記錄在瀏覽器中

## 📄 授權

私人專案
