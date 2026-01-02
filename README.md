# 台灣真實地址隨機產生器

Vue 3 + Leaflet 工具，利用 OpenStreetMap/Overpass API 在指定半徑內隨機產生台灣真實門牌地址，並於地圖上標註。

已部屬在：https://taiwan-real-address-randomizer.vercel.app/

## 功能總覽
- 地圖互動：Leaflet 底圖，點擊地圖可設定中心點並顯示藍色標記與半徑圓圈。
- 真實地址：呼叫 Overpass API 取得含 `addr:street`、`addr:housenumber` 的 OSM 節點/路段。
- 隨機化：對結果洗牌後取前 N 筆（1~50，預設 10），以紅色標記呈現，點擊可看地址。
- 控制面板：調整半徑（1~10 km，預設 2km）、數量、查看狀態；支援載入中與「無資料」提示。
- 地址清單：列出本次產生的地址並提供「複製全部」按鈕。

## 快速開始
1. 安裝套件
```sh
npm install
```

2. 啟動開發伺服器
```sh
npm run dev
```
打開終端輸出的本機網址（預設 http://localhost:5173）。

3. 產生地址
- 在地圖上點擊設定中心點，藍色標記與半徑圈會移動。
- 用滑桿選擇半徑（km），輸入要產生的筆數 N（1~50）。
- 按「立即產生」後等待載入，成功時紅色標記與地址清單會更新；若該區域無資料會顯示提示。
- 按「複製全部地址」可將列表文字複製到剪貼簿。

## 技術棧
- Vue 3 + TypeScript
- Tailwind CSS
- Leaflet（OSM Tiles）
- Overpass API（台灣門牌資料）

## 可調參數與行為
- 半徑：1–10 km（UI 滑桿，預設 2km）。
- 數量：1–50 筆（預設 10，超出範圍自動裁剪）。
- 標記：中心點為藍色，隨機地址為紅色；彈窗顯示地址與座標。

## 常見問題
- 無資料：該區域 OSM 若無 `addr:housenumber` 標籤會顯示「無資料」，可放大半徑或換位置。
- 複製失敗：瀏覽器未授權剪貼簿，請允許或改用桌面瀏覽器。

## 建置
```sh
npm run build
```
產出檔位於 `dist/`，可用 `npm run preview` 驗證。
