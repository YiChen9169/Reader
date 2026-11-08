# 慢慢讀 Reader

[繁體中文](#繁體中文) | [English](#english)

## 繁體中文

一個支援中文與英文的文字朗讀工具。貼上文字即可播放，搭配語速調整、跟讀高亮與進度保存，依自己的步調聆聽內容。

## 開發動機

希望讓吸收知識多一種方式：除了閱讀，也能透過聆聽學習文章、筆記與其他文字內容。以減少長時間盯著螢幕、讓眼睛適時休息為出發點，製作這個操作簡單的朗讀工具，讓學習更方便，也兼顧護眼的日常習慣。

## 現有功能

- **中英文朗讀**：依語言切換聲音，或使用同一聲音讀完整句；整句混讀建議搭配多語言聲音。
- **播放控制**：播放、暫停、繼續、從頭開始，以及 0.5–3 倍語速調整。
- **自由定位**：點選文字間隙後從該處起讀，支援上一句、下一句與段落跳轉。
- **句子分段**：依句號、問號、驚嘆號與換行分段，保留逗號、小數與常見英文縮寫；過長句子另行分段。
- **特殊文字讀法**：支援日期、NT$／US$ 金額、百分比與小數的中文讀法，可選擇跳過網址。
- **自訂發音**：使用「原文=讀法」設定品牌、縮寫或特定字詞的讀法，不修改原文。
- **跟讀視窗**：目前句子高亮、自動跟隨，點選句子即可定位；長文僅顯示附近句子。
- **進度保存**：可自動儲存內容與進度，重新開啟後接續，亦可手動儲存或清除。
- **語音選擇與試聽**：標示本機／線上語音，支援只顯示本機語音。
- **可選 Azure 神經語音**：使用自己的 Speech 金鑰連線合成音訊，支援播放中調速而不重新合成目前音訊。
- **長文支援**：未設定輸入字數上限，顯示目前字元數並分段朗讀；實際容量依瀏覽器及記憶體而定。

## 快速開始

1. 下載此專案並解壓縮，將檔案保留在同一資料夾。
2. 使用 Microsoft Edge 或 Google Chrome 開啟 `index.html`。
3. 貼上文字、選擇語音，按「播放」。
4. 若要從指定位置開始，點選文字間隙或跟讀視窗中的句子，再按「播放」。

一般使用不需要安裝套件、Node.js 或執行建置程序。本機語音能否離線使用，取決於裝置是否已安裝對應聲音；線上語音需要網路。

### Azure 語音設定（選用）

1. 準備自己的 Azure Speech 資源，取得服務區域代碼與金鑰。
2. 將朗讀模式切換為「Azure 神經語音」，填入區域與金鑰。
3. 按「載入可用語音」，選擇聲音後試聽或播放。

此模式會將待朗讀文字傳送至 Microsoft Azure，並可能依帳號用量計費。金鑰不隨專案提供，也不會儲存在瀏覽器 localStorage。

若瀏覽器阻擋本機檔案的雲端請求，可在專案資料夾使用 Python 啟動本機伺服器：

```sh
python -m http.server 8765 --bind 127.0.0.1
```

再開啟 [本機朗讀器](http://127.0.0.1:8765)。若仍無法連線，請檢查服務設定及瀏覽器主控台訊息。

參考：[Azure 文字轉語音官方文件](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/rest-text-to-speech)。

## 資料與隱私

- 勾選自動儲存後，文字與進度會保存在目前瀏覽器的 localStorage；可使用「清除已儲存內容」移除。
- 本機檔案與不同網址的儲存空間各自獨立。儲存空間不足或禁止存取時，畫面會提示；請另行備份重要原文。
- Azure 金鑰只用於本次頁面，重新開啟後需重新填入；音訊不會自動存成檔案。
- 線上語音與 Azure 模式需要連線；若只想使用本機語音，可勾選「只顯示本機語音」。
- 請勿將服務金鑰、個人朗讀內容或含敏感資料的截圖提交到此儲存庫。

## 技術與檔案結構

使用 HTML、CSS 與原生 JavaScript，透過 Web Speech API 及可選的 Azure Speech REST API 提供朗讀功能，無第三方前端套件依賴。

```text
Reader/
├── index.html    # 介面與入口
├── style.css     # 樣式與行動裝置排版
├── core.js       # 分句、讀法處理與 SSML 產生
├── reader.js     # 播放控制、語音服務與進度儲存
├── test.cjs      # 自動化測試
├── README.md     # 專案說明
├── COPYRIGHT     # 著作權聲明
└── .gitignore    # 不提交的本機檔案規則
```

## 測試

開發測試需要支援 Unicode 正規表示式與 AbortSignal API 的近期 Node.js 版本；目前已在 Node.js 24 執行通過。

```sh
node test.cjs
```

測試涵蓋百萬字元分段、文字讀法、XML 跳脫、播放控制、游標定位、過期事件處理、進度儲存，以及模擬 Azure 回應下的音訊調速與暫停續讀。

## 已知限制

- 聲音自然度、中文多音字及混語發音取決於所選語音；自訂讀法可修正特定內容，無法保證所有語境正確。
- 本機模式調速可能重讀目前片段；儲存的本機進度以句子起點為準。
- 雲端句內位置依音訊時間估算，重新定位或還原時可能略有重複或跳過字詞；句子之間需要等候合成。
- 特殊數字的中文讀法主要套用於含中文的句子，分句與縮寫判斷採用規則，仍可能遇到例外。
- 百萬字元分段測試不等於完整長文實際朗讀測試。真實 Azure 合成、音質與長時間播放仍需在目標瀏覽器驗證。

## 問題回報

歡迎透過本儲存庫的 GitHub Issues 回報問題或提出功能建議。請附上瀏覽器與作業系統版本、使用的朗讀模式、重現步驟，以及不含敏感資料的範例文字；請勿提供金鑰。

## 作者與著作權

Copyright © 2026 YI-CHEN, YOU. All rights reserved.

著作權聲明請見 [COPYRIGHT](COPYRIGHT)。本專案目前未附開源授權條款。

---

## English

Reader is a text-to-speech tool for Chinese and English. Paste text and listen at your own pace, with adjustable speed, sentence highlighting, and saved reading progress. The application interface is currently in Traditional Chinese.

### Motivation

This project offers another way to absorb knowledge: listening to articles, notes, and other text alongside reading. It aims to make learning more convenient while reducing time spent staring at a screen and giving your eyes a chance to rest.

### Features

- **Chinese and English speech**: Switch voices by language or use one voice for an entire sentence. A multilingual voice is recommended for mixed-language sentences.
- **Playback controls**: Play, pause, resume, restart, and adjust speed from 0.5× to 3×.
- **Flexible navigation**: Place the cursor between characters to choose a starting point, move to the previous or next sentence, or jump to a paragraph.
- **Sentence segmentation**: Split text at sentence endings and line breaks while preserving commas, decimal numbers, and common English abbreviations. Very long sentences are split into shorter sections.
- **Special text handling**: Chinese reading rules for dates, NT$/US$ amounts, percentages, and decimals, with an option to skip URLs.
- **Custom pronunciation**: Define replacements using `original=pronunciation` for brands, abbreviations, or specific words without changing the source text.
- **Reading view**: Highlight the current sentence, follow it automatically, and click sentences to choose a starting point. Only nearby sentences are rendered for long documents.
- **Saved progress**: Automatically or manually save text and progress, resume after reopening, or clear saved content.
- **Voice selection and previews**: Label local and online voices, filter for local voices, and preview speech.
- **Optional Azure neural voices**: Use your own Speech key to synthesize audio. Adjust playback speed without resynthesizing the current audio.
- **Long text support**: No application-defined input length limit, with a character count and segmented playback. Actual capacity depends on the browser and available memory.

### Getting started

1. Download and extract this project, keeping all files in the same folder.
2. Open `index.html` in Microsoft Edge or Google Chrome.
3. Paste your text, choose a voice, and click **播放 (Play)**.
4. To start elsewhere, place the cursor in the text or click a sentence in the reading view, then click Play.

Normal use requires no package installation, Node.js, or build step. Offline speech requires a suitable voice installed on your device. Online voices require an internet connection.

#### Azure setup (optional)

1. Create or use your own Azure Speech resource and obtain its region code and key.
2. Select **Azure 神經語音 (Azure neural voices)** and enter the region and key.
3. Click **載入可用語音 (Load available voices)**, choose a voice, and preview or play it.

This mode sends text to Microsoft Azure and may incur usage charges. A key is not included with this project and is not saved in browser localStorage.

If the browser blocks cloud requests from a local file, you can use Python to serve the project folder locally:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Then open the [local reader](http://127.0.0.1:8765). If requests still fail, check your service configuration and browser console messages.

Reference: [Azure text-to-speech documentation](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/rest-text-to-speech).

### Data and privacy

- When automatic saving is enabled, text and progress are stored in the current browser's localStorage. Use **清除已儲存內容 (Clear saved content)** to remove them.
- Local files and different web addresses use separate storage. The app reports storage failures; keep a separate backup of important text.
- The Azure key is used only for the current page session and must be entered again after reopening. Audio is not automatically saved to a file.
- Online voices and Azure mode require a connection. Enable **只顯示本機語音 (Show local voices only)** to select local voices.
- Do not commit service keys, personal reading content, or screenshots containing sensitive information to this repository.

### Technology and project structure

Built with HTML, CSS, and vanilla JavaScript, using the Web Speech API and optionally the Azure Speech REST API. No third-party frontend packages are required.

```text
Reader/
├── index.html    # Interface and entry point
├── style.css     # Styles and responsive layout
├── core.js       # Sentence segmentation, text normalization, and SSML
├── reader.js     # Playback, voice services, and progress storage
├── test.cjs      # Automated tests
├── README.md     # Project documentation
├── COPYRIGHT     # Copyright notice
└── .gitignore    # Local files excluded from version control
```

### Testing

Development tests require a recent Node.js version supporting Unicode regular expressions and the AbortSignal APIs used by the tests. Tests have passed on Node.js 24.

```sh
node test.cjs
```

Tests cover million-character document segmentation, text normalization, XML escaping, playback controls, cursor positioning, stale event handling, saved progress, and audio speed changes and pause/resume with mocked Azure responses.

### Known limitations

- Voice quality, context-dependent Chinese pronunciation, and mixed-language speech depend on the chosen voice. Custom replacements can address specific cases but do not guarantee correct pronunciation in every context.
- Changing speed in browser voice mode may repeat the current fragment. Saved progress in this mode starts at the beginning of the current sentence.
- Cloud playback estimates positions within a sentence from audio timing. Seeking or restoring progress may repeat or skip some words. Each sentence requires time to synthesize.
- Chinese number normalization mainly applies to sentences containing Chinese. Sentence and abbreviation detection use rules and may encounter exceptions.
- Million-character segmentation tests do not verify complete long-document playback. Real Azure synthesis, audio quality, and extended playback still need verification in the target browser.

### Reporting issues

Use this repository's GitHub Issues to report bugs or suggest features. Include your browser and operating system versions, speech mode, steps to reproduce, and a non-sensitive sample text. Never include service keys.

### Author and copyright

Copyright © 2026 YI-CHEN, YOU. All rights reserved.

See [COPYRIGHT](COPYRIGHT) for the copyright notice. This project currently does not include an open-source license.

[Back to top](#慢慢讀-reader)
