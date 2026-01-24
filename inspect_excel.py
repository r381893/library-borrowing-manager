import pandas as pd

file_path = '圖書館借書清單.xlsx'

try:
    # Check all sheet names
    xls = pd.ExcelFile(file_path)
    print("Sheet names:", xls.sheet_names)
    
    for sheet in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet, header=None)
        print(f"\nSheet '{sheet}':")
        print(f"  - Shape: {df.shape}")
        print(f"  - First 5 rows:\n{df.head().to_string()}")
        print(f"  - Last 5 rows:\n{df.tail().to_string()}")

except Exception as e:
    print("Error analyzing excel:", e)
