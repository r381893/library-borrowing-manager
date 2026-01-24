import os
import time

old_file = '圖書館借書清單.xlsx'
new_file_source = '圖書館借書清單_1.xlsx'
backup_file = '圖書館借書清單_Backup_Old.xlsx'

try:
    if os.path.exists(old_file):
        if os.path.exists(backup_file):
            os.remove(backup_file) # 如果已有舊備份，先刪除
        os.rename(old_file, backup_file)
        print(f"Backed up {old_file} to {backup_file}")
    
    if os.path.exists(new_file_source):
        os.rename(new_file_source, old_file)
        print(f"Renamed {new_file_source} to {old_file}")
    else:
        print(f"Error: {new_file_source} not found!")

except Exception as e:
    print(f"Error: {e}")
