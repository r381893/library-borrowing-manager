import pandas as pd

try:
    # Read without header to see all data
    df = pd.read_excel('圖書館借書清單.xlsx', header=None)
    print("Shape:", df.shape)
    print("First 5 rows:")
    print(df.head().to_string())
except Exception as e:
    print("Error reading excel:", e)
