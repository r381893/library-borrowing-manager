@echo off
chcp 65001 > nul
echo ==========================================
echo 🚀 正在準備同步資料到雲端...
echo ==========================================

cd /d "%~dp0"

echo.
echo [1/3] 正在將 Excel 資料轉換為雲端格式...
python convert_excel_to_json.py
if %errorlevel% neq 0 (
    echo ❌ 轉換失敗！請檢查 Excel 檔案是否被開啟。
    pause
    exit /b
)

echo.
echo [2/3] 正在更新版本紀錄...
git add data/books.json
git commit -m "Auto Update: 更新書籍資料 %date:~0,10% %time:~0,8%"

echo.
echo [3/3] 正在上傳至 GitHub (這會觸發雲端部署)...
git push

if %errorlevel% neq 0 (
    echo ❌ 上傳失敗！請檢查網路連線。
    pause
    exit /b
)

echo.
echo ==========================================
echo ✅ 同步完成！
echo ☁️  Railway 雲端網站將在 1~2 分鐘內自動更新。
echo ==========================================
pause
