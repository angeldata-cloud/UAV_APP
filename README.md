# 無人機考照衝刺

給臺灣無人機考照準備者使用的單人離線 PWA。App 會把題庫與學習進度保存在 iPhone 的 IndexedDB，支援記憶卡、測驗、錯題本、搜尋、考前衝刺、備份與離線使用。

## 最重要的資料原則

- `source-excel/` 內的 4 份 Excel 是題庫唯一正式來源。
- 題庫更新不得清除 IndexedDB，也不得重建既有學習紀錄。
- `data/question-id-map.json` 保存「章節＋官方題號」與 stableQuestionId 的對照，必須納入 Git 管理。
- 題目插列、排序、文字或題解修正不會改變 stableQuestionId。
- 答案改變時會保留答題歷史、收藏與錯題紀錄，但把該題排成立即重新複習。

## 更新題庫

只需要使用自己的 GitHub 帳號，接受 Repository Collaborator 邀請後進行以下操作：

1. 先在 App 的「資料管理」匯出學習紀錄備份。
2. 修改本機的 4 份 Excel；不要更改正式檔名、`dB題庫` 工作表名稱或必要欄位。
3. 登入 GitHub，進入這個 Repository 的 `source-excel/`。
4. 點 **Add file → Upload files**，上傳新版 4 份 Excel 並覆蓋同名檔案。
5. 點 **Commit changes**（確認並儲存這次修改）。
6. 到 **Actions**（查看系統有沒有成功更新 App）等待執行完成。
7. 綠色勾勾代表驗證、測試、建立與 GitHub Pages 發布都成功；紅色叉叉代表未部署，請打開失敗步驟查看繁體中文錯誤。
8. 在 iPhone 主畫面重新開啟 App；若看到「有新版本可使用」，點「更新 App」。
9. App 顯示「題庫已更新」後，核對更新統計；有答案變更時可直接點「開始複習更新題目」。

不需要修改 `questions.json`、版本號、程式碼或 GitHub Actions，也不需要執行 Python、npm 或 Terminal。

## Excel 修改規則

正式檔案與章節：

- `01-讀給你聽-UAV普科題庫_第一章：民用航空法及相關法規.xlsx`
- `02-讀給你聽-UAV普科題庫_第二章：基礎飛行原理.xlsx`
- `03-讀給你聽-UAV普科題庫_第三章：氣象.xlsx`
- `04-讀給你聽-UAV普科題庫_第四章：緊急處置與飛行決策.xlsx`

轉換器只讀取每個檔案的 `dB題庫` 工作表。必要欄位為：`題號`、`題目`、`A`、`B`、`C`、`D`、`答案`、`題解`。第二章目前的 `A.`～`D.` 欄名與答案尾端句點會安全正規化；答案內容本身仍只能有一個 A、B、C 或 D。題解可以空白，其餘必要欄位不可空白。

如果 Excel 有錯，Actions 會在「驗證 Excel 並建立 questions.json」停止，不會部署。例如：

> 題庫2.xlsx，第 35 列：答案為「A/C」，每題只能有一個答案 A、B、C 或 D。

## 自動產生與部署流程

`.github/workflows/deploy.yml` 在 `main` 收到 commit 後依序：

1. 安裝 Python 與 `openpyxl`。
2. 執行 `scripts/build_question_bank.py`，驗證 4 份 Excel。
3. 依 `data/question-id-map.json` 配置 stableQuestionId。
4. 產生 `public/data/questions.json` 與 `data/question-bank-report.json`。
5. 執行 Python 轉換規則測試與 App tests。
6. 建立 production App。
7. 全部成功後，由 GitHub Actions bot 保存 generated JSON／mapping 的變更。
8. 部署 GitHub Pages。

任何 Excel 驗證、測試或 build 失敗都會停止流程，不會發布不完整版本。

## 題庫版本與 IndexedDB migration

`questionBankVersion` 是由實際題庫內容計算出的 SHA-256。單純重新執行 Actions 或重新 build 不會改版；只有題庫內容改變才會產生新版本。

App 每次啟動會檢查網站題庫版本。版本不同時會在同一個 IndexedDB transaction 中：

- stableQuestionId 相同：更新題目內容並保留 progress。
- 答案相同的文字／選項／題解修正：保留原本 memoryLevel 與複習排程。
- 答案改變：保留 correctCount、wrongCount、reviewCount、收藏、曾答錯與 session；將 memoryLevel 設為 1、nextReviewAt 設為現在、consecutiveCorrect 設為 0、lastResult 設為 null，並標記 needsReview。
- 新增題目：建立 memoryLevel 0 的全新 progress。
- 移除題目：從活動題庫刪除，不再出現在記憶卡、測驗、搜尋或衝刺；progress 改為封存，session 保留原 questionId。

資料庫名稱維持 `drone-exam-db`，IndexedDB schema version 維持 1；題庫內容版本與資料庫結構版本彼此獨立。

## PWA 更新與離線策略

App shell 由 Service Worker 預先快取。`data/questions.json` 不放入永久 precache，而使用 NetworkFirst：有網路時先取得 GitHub Pages 最新題庫，離線時再使用最後一次成功下載的版本。使用者不需要刪除 App、清除 Safari 資料或重新加入主畫面。

## 本機開發

```bash
npm install
python3 -m pip install -r requirements-question-bank.txt
python3 scripts/build_question_bank.py --check
python3 -m unittest scripts/build_question_bank_test.py
npm run test
npm run build
```

`--check` 只驗證與計算，不會覆寫 generated JSON。正式產生題庫時移除 `--check`。

技術架構為 React、TypeScript、Vite、vite-plugin-pwa、IndexedDB（idb）與原生 CSS。路由採 HashRouter，避免 GitHub Pages 重新整理頁面時發生 404。

## iPhone 安裝與離線測試

1. 使用 Safari 打開 GitHub Pages 網址，等待題庫準備完成。
2. 點分享按鈕，選「加入主畫面」。
3. 回到主畫面開啟 App。
4. 關閉 App、開啟飛航模式，再從主畫面重新開啟測試離線功能。

## 備份

「資料管理」可以匯出 JSON。請在題庫更新、清除 Safari 資料或換手機前先備份。學習紀錄只存在該裝置與瀏覽器；清除網站資料會刪除紀錄。

之後製作操作簡報所需的實際截圖清單，請見 `docs/sop/SCREENSHOT_CHECKLIST.md`。
