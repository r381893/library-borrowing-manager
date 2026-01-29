import pandas as pd
import time
import os

EXCEL_FILE = '圖書館借書清單.xlsx'
CATEGORIES = [
    '新書-待借', '待借', '不能借', '食譜', '頁數太多', 
    '已看-3447本', '已看-1', '未到館'
]

def test_read():
    if not os.path.exists(EXCEL_FILE):
        print("File not found")
        return

    print(f"File size: {os.path.getsize(EXCEL_FILE)} bytes")
    
    start = time.time()
    try:
        print("Opening ExcelFile...")
        xls = pd.ExcelFile(EXCEL_FILE)
        print(f"Opened. Sheets: {xls.sheet_names}")
        
        for sheet in CATEGORIES:
            if sheet in xls.sheet_names:
                s_start = time.time()
                print(f"Reading sheet: {sheet}...", end='', flush=True)
                df = pd.read_excel(xls, sheet_name=sheet)
                print(f" Done in {time.time() - s_start:.2f}s. Rows: {len(df)}")
                
        print(f"Total time: {time.time() - start:.2f}s")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    test_read()
