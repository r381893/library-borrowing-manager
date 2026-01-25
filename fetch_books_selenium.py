from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json

def fetch_books(keyword="科學發明王"):
    print(f"正在搜尋: {keyword} ...")
    
    options = Options()
    # options.add_argument("--headless") # Comment out to see the browser
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

    driver = webdriver.Chrome(options=options)
    
    try:
        url = f"https://webpacx.ksml.edu.tw/search?q={keyword}"
        driver.get(url)
        
        # Wait for book list to load (adjust selector based on inspection)
        # Looking for common Next.js/React patterns or semantic tags
        # We try to wait for *any* meaningful content div
        wait = WebDriverWait(driver, 20)
        
        # Try to find elements that look like book items
        print("等待頁面加載...")
        # Generic wait
        time.sleep(5) 
        
        books = []
        
        # Method 1: Look for specific class names (need to be verified, using generic approach first)
        # Often books are in <h3> or have specific class
        elems = driver.find_elements(By.CSS_SELECTOR, "div[class*='book'], div[class*='item'], h3")
        
        print(f"找到 {len(elems)} 個潛在元素")
        
        for el in elems[:10]:
            try:
                text = el.text.strip()
                if len(text) > 0:
                    # Simple heuristic
                    books.append(text)
            except:
                pass
                
        # Method 2: Execute JS to extract potentially hydrated state if accessible
        # (Advanced)
        
        print("\n--- 搜尋結果預覽 ---")
        for i, b in enumerate(books):
            print(f"{i+1}. {b[:50]}...")
            
    except Exception as e:
        print(f"發生錯誤: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    fetch_books()
