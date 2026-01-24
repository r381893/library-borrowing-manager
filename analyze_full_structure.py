import pandas as pd
import json

file_path = '圖書館借書清單.xlsx'
output_file = 'sheet_analysis_full.txt'

with open(output_file, 'w', encoding='utf-8') as f:
    try:
        xls = pd.ExcelFile(file_path)
        f.write(f"Sheets: {xls.sheet_names}\n\n")
        
        all_books = []
        
        for sheet in xls.sheet_names:
            f.write(f"--- Processing Sheet: {sheet} ---\n")
            # Read header=0 to see if there are headers
            df = pd.read_excel(file_path, sheet_name=sheet)
            f.write(f"Columns: {df.columns.tolist()}\n")
            f.write(f"First 5 rows:\n{df.head().to_string()}\n\n")
            
    except Exception as e:
        f.write(f"Error: {e}\n")

print("Analysis done. Read sheet_analysis_full.txt")
