import pandas as pd
import os

EXCEL_FILE = '圖書館借書清單.xlsx'
SHEET_NAME = '已看-1'

print(f"Reading sheet: {SHEET_NAME}")

try:
    # 測試1: 不帶 header 讀取
    df = pd.read_excel(EXCEL_FILE, sheet_name=SHEET_NAME, header=None)
    print(f"\n--- Header=None (Shape: {df.shape}) ---")
    print(df.head(3))
    
    print("\n--- Row 0 Analysis ---")
    row0 = df.iloc[0]
    print(f"Col 0 (作者?): {row0[0]} (Type: {type(row0[0])})")
    print(f"Col 1 (書名?): {row0[1]} (Type: {type(row0[1])})")
    print(f"Col 2 (日期?): {row0[2]} (Type: {type(row0[2])})")
    print(f"Col 3 (備註?): {row0[3]} (Type: {type(row0[3])})")

    # 模擬 server.py 的邏輯
    print("\n--- Simulating Logic ---")
    date = ''
    if len(row0) > 2:
        val = row0[2]
        print(f"Date Raw Val: {val}, pd.notna: {pd.notna(val)}")
        date = str(val) if pd.notna(val) else ''
    
    note = ''
    if len(row0) > 3:
        val = row0[3]
        print(f"Note Raw Val: {val}, pd.notna: {pd.notna(val)}")
        note = str(val) if pd.notna(val) else ''

    if date and ' ' in date:
        date = date.split(' ')[0]
        
    print(f"Result Date: '{date}'")
    print(f"Result Note: '{note}'")

except Exception as e:
    print(f"Error: {e}")
