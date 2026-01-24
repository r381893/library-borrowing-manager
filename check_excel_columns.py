import pandas as pd

# 讀取 _1 版本
xls1 = pd.ExcelFile('圖書館借書清單_1.xlsx')

with open('excel_analysis_result.txt', 'w', encoding='utf-8') as f:
    f.write("=== 圖書館借書清單_1.xlsx ===\n")
    f.write(f"工作表: {xls1.sheet_names}\n\n")

    for sheet in xls1.sheet_names:
        df_raw = pd.read_excel(xls1, sheet_name=sheet, header=None)
        f.write(f"\n--- {sheet} ---\n")
        f.write(f"欄數: {len(df_raw.columns)}\n")
        f.write("前3行資料:\n")
        for i in range(min(3, len(df_raw))):
            row_data = [f"[{j}]{df_raw.iloc[i, j]}" for j in range(min(6, len(df_raw.columns)))]
            f.write(f"  Row {i}: {' | '.join(row_data)}\n")

print("Done! Check excel_analysis_result.txt")
