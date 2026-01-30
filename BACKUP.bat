
@echo off
chcp 65001
echo ==========================================
echo      正在從雲端下載最新備份...
echo ==========================================
call env\Scripts\activate
python backup_from_firebase.py
pause
