import os
import shutil
import time

source_file = '圖書館借書清單_1.xlsx'
target_file = '圖書館借書清單.xlsx'

try:
    if os.path.exists(source_file):
        # 取得檔案大小確認
        src_size = os.path.getsize(source_file)
        print(f"Source file size: {src_size} bytes")
        
        if src_size > 200000: # 確保是大檔案
            if os.path.exists(target_file):
                os.remove(target_file)
                print(f"Removed old target file.")
            
            shutil.copy2(source_file, target_file)
            print(f"Success! Copied {source_file} to {target_file}")
        else:
            print("Source file is too small! Something is wrong.")
    else:
        print(f"Source file {source_file} not found!")

except Exception as e:
    print(f"Error: {e}")
