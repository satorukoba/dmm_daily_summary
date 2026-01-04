# DMM英会話 Daily News Summary Webサービス

DMM英会話のDaily Newsを毎日自動で取得し、要約とAdvancedレベルの英語フレーズ・表現を生成してWebサービスで表示するシステムです。

## 機能

- DMM英会話のDaily Newsから最新のニュース3件を自動取得
- 各ニュースを要約（OpenAI API使用、APIキーはVercel側で保護）
- 各ニュースに対して議論や意見出しに使えるAdvancedレベルの英語フレーズ・表現・単語を10個生成
- 美しいWebインターフェースでニュースを閲覧
- 毎日18時に自動でニュースを更新（Vercel Cron Jobs）

## セットアップ

### 1. 必要な環境

- Node.js 18以上
- Vercelアカウント（無料）
- OpenAI APIキー

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Vercelへのデプロイ

#### 3.1. Vercel CLIのインストール

```bash
npm install -g vercel
```

#### 3.2. Vercelにログイン

```bash
vercel login
```

#### 3.3. プロジェクトをデプロイ

```bash
vercel
```

初回デプロイ時は、いくつかの質問に答えます：
- Set up and deploy? → **Yes**
- Which scope? → あなたのアカウントを選択
- Link to existing project? → **No**
- What's your project's name? → プロジェクト名を入力（例: `eikaiwa-daily-summary`）
- In which directory is your code located? → **./**（そのままEnter）

#### 3.4. 環境変数の設定

Vercelダッシュボードで環境変数を設定：

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. デプロイしたプロジェクトを選択
3. **Settings** → **Environment Variables** に移動
4. 以下の環境変数を追加：

   - `OPENAI_API_KEY`: あなたのOpenAI APIキー
   - **Environment**: `Production`, `Preview`, `Development` すべてにチェック

#### 3.5. 本番環境に再デプロイ

環境変数を設定した後、本番環境に再デプロイ：

```bash
vercel --prod
```

デプロイが完了すると、URLが表示されます（例: `https://your-project.vercel.app`）。

### 4. Vercel Cron Jobsの設定

`vercel.json`にCron Jobsの設定が含まれています。Vercelダッシュボードで確認：

1. **Settings** → **Cron Jobs** に移動
2. 毎日18時に`/api/daily-news`が実行されることを確認

## 使用方法

### Webサービスにアクセス

デプロイされたURL（例: `https://your-project.vercel.app`）にアクセスすると、最新のニュース要約とフレーズが表示されます。

### 手動でニュースを更新

以下のAPIエンドポイントにGETリクエストを送信すると、手動でニュースを更新できます：

```bash
curl https://your-project.vercel.app/api/daily-news
```

## APIエンドポイント

### GET /api/news-list

保存されたニュース一覧を取得します。

**レスポンス例:**
```json
{
  "lastUpdated": "2024-01-01T18:00:00.000Z",
  "news": [
    {
      "title": "News Title",
      "url": "https://eikaiwa.dmm.com/app/daily-news/...",
      "summary": "News summary...",
      "phrases": ["phrase 1", "phrase 2", ...],
      "date": "2024-01-01"
    }
  ]
}
```

### GET /api/daily-news

手動でニュースを取得・処理・保存します。

### POST /api/daily-news

Vercel Cron Jobsから自動的に呼び出されます。

## ファイル構成

```
eikaiwa_daily_summary/
├── api/
│   ├── daily-news.js    # ニュース取得・処理・保存API
│   ├── news-list.js     # ニュース一覧取得API
│   ├── summarize.js     # ニュース要約API（個別）
│   └── phrases.js       # フレーズ生成API（個別）
├── public/
│   ├── index.html       # フロントエンドHTML
│   ├── style.css        # スタイルシート
│   └── app.js           # フロントエンドJavaScript
├── package.json         # Node.js依存関係
├── vercel.json          # Vercel設定（Cron Jobs含む）
├── .vercelignore        # Vercelデプロイ除外ファイル
└── README.md           # このファイル
```

## トラブルシューティング

### ニュースが表示されない

- VercelダッシュボードでCron Jobsが正しく設定されているか確認
- `/api/daily-news`に手動でGETリクエストを送信してテスト
- Vercelのログ（Deployments → ログ）を確認

### OpenAI APIエラー

- Vercelダッシュボードで環境変数`OPENAI_API_KEY`が正しく設定されているか確認
- APIの使用制限に達していないか確認
- Vercelのログを確認

### スクレイピングが失敗する

- DMM英会話のページ構造が変更されている可能性があります
- `api/daily-news.js`の`fetchDMMNews`関数のセレクタを確認・調整してください
- エラー時はサンプルデータが表示されます

## 注意事項

- DMM英会話の利用規約を遵守してください
- スクレイピングは適度な間隔を空けて実行してください
- OpenAI APIの使用量に注意してください
- Vercelの無料プランでは、Cron Jobsの実行回数に制限があります

## ライセンス

このプロジェクトは個人利用を想定しています。
