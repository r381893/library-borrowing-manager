import pandas as pd

file_path = '圖書館借書清單.xlsx'

try:
    xls = pd.ExcelFile(file_path)
    print("Found sheets:", xls.sheet_names)
    
    total_rows = 0
    all_books = []
    
    for sheet in xls.sheet_names:
        # Read header=None to capture everything
        df = pd.read_excel(file_path, sheet_name=sheet, header=None)
        # Drop completely empty rows
        df = df.dropna(how='all')
        count = len(df)
        total_rows += count
        print(f"Sheet '{sheet}' has {count} non-empty rows.")
        
        # simple heuristic to find title column (usually the string column)
        # Print first few rows to debug structure
        print(df.head(3).to_string())

except Exception as e:
    print("Error:", e)
