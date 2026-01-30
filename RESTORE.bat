
@echo off
chcp 65001
echo ==========================================
echo      Excel 匯入/還原工具 (Cloud Restore)
echo ==========================================
call env\Scripts\activate
python restore_from_backup.py
pause
