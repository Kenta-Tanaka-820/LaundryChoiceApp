# LaundryChoiceApp

## OCR テストスクリプト (`scripts/ocr-test.js`)

OpenAI API を使って画像の洗濯表示を読み取り、素材カテゴリを 1 行で出力します。

### 事前準備

1. 依存関係をインストール

```bash
npm install
```

2. プロジェクトルートに `.env` を作成

```env
OPENAI_API_KEY=sk-xxxx
# 任意（未指定時は gpt-4.1-mini）
OPENAI_MODEL=gpt-4.1-mini
```

3. 判定したい画像を `scripts/` フォルダに置く

対応形式: `png`, `jpg`, `jpeg`, `webp`, `gif`, `bmp`, `tiff`

### 実行方法

画像を指定して実行:

```bash
npm run ocr:test -- scripts/your-image.jpg
```

画像を指定しない場合:

- `scripts/` 内の対応画像を名前順で 1 つ選んで実行します。

```bash
npm run ocr:test
```

### 出力

最後に素材カテゴリだけを出力します（1行）。

- `delicate`
- `synthetic`
- `cotton`
- `unknown`
