# 無人機考照衝刺

給臺灣無人機考照準備者使用的單人離線 PWA。它將 388 題題庫保存在裝置的 IndexedDB，以加速版間隔複習優先安排容易忘記、答錯與到期題目。

## 技術架構

React、TypeScript、Vite、vite-plugin-pwa、IndexedDB（idb）與原生 CSS。沒有帳號、後端、雲端資料庫、API Key 或付費服務。路由採 HashRouter，所以 GitHub Pages 重新整理頁面不會 404。

## 安裝與啟動

```bash
npm install
npm run dev
npm run build
npm run test
```

題庫位於 `public/data/questions.json`。第一次連線開啟時會匯入 IndexedDB；完成後可完全離線使用。若要更新題庫，替換此檔案並提高 `src/constants/reviewIntervals.ts` 中的 `APP_DB_VERSION`，使用者重新載入題庫即可。

複習間隔集中於 `src/constants/reviewIntervals.ts` 的 `REVIEW_INTERVALS`，可直接調整。

## 功能

- 首頁：當日固定激勵文字、待複習、今日完成與完成率。
- 記憶卡：完全不會／普通／已會，立即更新下次複習。
- 測驗與考前衝刺：即時判題、題解、錯題重做，衝刺題目不重複。
- 錯題本、離線全文搜尋、分段學習進度。
- JSON 匯出、驗證後匯入及雙擊確認的學習紀錄重置。

## GitHub Pages 部署

1. 建立 GitHub repository（例如 `drone-exam-app`）並推送到 `main`。
2. 在 GitHub repository 的 **Settings → Pages → Build and deployment**，Source 選 **GitHub Actions**。
3. 推送後 `.github/workflows/deploy.yml` 會自動建置並部署。
4. 網址通常是 `https://<帳號>.github.io/drone-exam-app/`。工作流程會自動依 repository 名稱設定資源 base path，因此不必將名稱寫進程式。

## iPhone 安裝與離線測試

1. 使用 Safari 打開網站，且先等待題庫準備完成。
2. 點擊分享按鈕。
3. 選擇「加入主畫面」。
4. 開啟「以網頁 App 開啟」。
5. 點擊「加入」。
6. 回到主畫面開啟 App。
7. 開啟飛航模式，再由主畫面開啟 App 測試離線功能。

## 備份與常見問題

資料管理頁可匯出 JSON，請在清除 Safari 資料或換手機前先備份。匯入會覆蓋目前的學習紀錄，但不會覆蓋固定題庫。首次離線開啟無法下載題庫；請先連線開啟一次，待「正在準備題庫」完成後才可離線。

IndexedDB 名稱是 `drone-exam-db`，所有紀錄只存在該裝置與瀏覽器。清除網站資料會刪除紀錄，故建議定期匯出備份。
