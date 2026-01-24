# 使用 Node.js 和 Python 的基礎映像
FROM nikolaik/python-nodejs:python3.11-nodejs18

WORKDIR /app

# 複製 package.json 並安裝前端相依套件
COPY library-app/package*.json ./library-app/
RUN cd library-app && npm install

# 複製前端程式碼並建置
COPY library-app ./library-app
RUN cd library-app && npm run build

# 建立靜態資料夾並複製建置結果
RUN mkdir -p static && cp -r library-app/dist/* static/

# 安裝 Python 相依套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製後端程式碼和資料
COPY railway_server.py .
COPY data ./data

# 設定環境變數
ENV PORT=8080

# 啟動伺服器
CMD ["python", "railway_server.py"]
