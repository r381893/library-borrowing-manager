@echo off
chcp 65001 >nul
title 圖書館借書管理系統

echo ================================================
echo   📚 圖書館借書管理系統 - 啟動中...
echo ================================================
echo.

:: 檢查 Python 是否可用
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 找不到 Python，請先安裝 Python
    pause
    exit /b 1
)

:: 檢查 Node.js 是否可用
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 找不到 Node.js，請先安裝 Node.js
    pause
    exit /b 1
)

echo ✅ Python 和 Node.js 已就緒
echo.

:: 設定路徑
set PROJECT_DIR=%~dp0
set FRONTEND_DIR=%PROJECT_DIR%library-app

:: 啟動 Python 後端 (新視窗)
echo 🚀 啟動 Python 後端服務...
start "Python Backend" cmd /k "cd /d "%PROJECT_DIR%" && python server.py"

:: 等待後端啟動
timeout /t 3 /nobreak >nul

:: 啟動前端 (新視窗)
echo 🌐 啟動前端網頁服務...
start "Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

:: 等待前端啟動
timeout /t 5 /nobreak >nul

:: 開啟瀏覽器
echo 🌍 開啟瀏覽器...
start http://localhost:5173

echo.
echo ================================================
echo   ✅ 系統已啟動完成！
echo ================================================
echo.
echo   📌 前端網址: http://localhost:5173
echo   📌 後端 API: http://localhost:5000
echo.
echo   💡 提示：
echo   - 請勿關閉背景的命令視窗
echo   - 編輯書籍後會自動同步到 Excel
echo   - 右上角可切換深色/淺色主題
echo.
echo   按任意鍵關閉此視窗...
pause >nul
