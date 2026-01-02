# DMM英会話 Daily News 自動要約・フレーズ生成システム

DMM英会話のDaily Newsを毎日自動で取得し、要約とAdvancedレベルの英語フレーズ・表現を生成してLINE Bot経由で送信するシステムです。

## 機能

- DMM英会話のDaily Newsから最新のニュース3件を取得
- 各ニュースを要約（Vercel経由でOpenAI API使用、APIキーはバックエンドで保護）
- 各ニュースに対して議論や意見出しに使えるAdvancedレベルの英語フレーズ・表現・単語を10個生成
- LINE Bot経由でメッセージ送信
- 毎日18時に自動実行（cron使用）

## セットアップ

### 1. 必要な環境

- Python 3.8以上
- Raspberry Pi OS（またはLinux環境）
- Node.js 18以上（Vercelデプロイ用）
- Vercelアカウント（無料）
- OpenAI APIキー（Vercelの環境変数に設定）
- LINE DevelopersアカウントとMessaging APIの設定

### 2. 仮想環境の作成と依存関係のインストール

```bash
# 仮想環境を作成
python3 -m venv venv

# 仮想環境を有効化
source venv/bin/activate

# 依存関係をインストール
pip install -r requirements.txt
```

**注意**: 毎回スクリプトを実行する前に仮想環境を有効化するか、cron設定で仮想環境のPythonを使用するように設定してください。

### 3. Vercelへのデプロイ（OpenAI APIキーを保護）

OpenAI APIキーをバックエンドで保護するため、VercelにAPIをデプロイします。

#### 3.1. Vercel CLIのインストール

```bash
npm install -g vercel
```

または、Node.jsがインストールされていない場合は：

```bash
# Homebrewを使用（macOS）
brew install vercel-cli
```

#### 3.2. Vercelにログイン

```bash
vercel login
```

#### 3.3. プロジェクトをデプロイ

```bash
# プロジェクトディレクトリで実行
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

#### 3.5. 本番環境に再デプロイ

環境変数を設定した後、本番環境に再デプロイ：

```bash
vercel --prod
```

デプロイが完了すると、URLが表示されます（例: `https://your-project.vercel.app`）。このURLをメモしておいてください。

### 4. Raspberry Pi側の環境変数設定

`.env`ファイルを作成し、以下の内容を設定してください：

```bash
# .envファイルを作成
nano .env
```

以下の内容を記入：

```env
# Vercel API URL（デプロイ後のURLを設定）
VERCEL_API_URL=https://your-project.vercel.app

# LINE Bot設定
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_USER_ID=your_line_user_id_here
```

各設定値の説明：

- `VERCEL_API_URL`: VercelにデプロイしたAPIのURL（例: `https://your-project.vercel.app`）
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Messaging APIのチャネルアクセストークン（長期）
- `LINE_USER_ID`: メッセージ送信先のLINEユーザーID

**注意**: `OPENAI_API_KEY`はRaspberry Pi側では不要です。Vercel側で管理されます。

### 5. LINE Botの設定

1. [LINE Developers](https://developers.line.biz/)にアクセス
2. 新しいプロバイダーとチャネルを作成
3. Messaging APIを有効化
4. チャネルアクセストークン（長期）を取得して`.env`に設定
5. ユーザーIDを取得（Webhookイベントから取得するか、LINE公式アカウントに友達追加してから取得）

### 6. cron設定（毎日18時に実行）

`setup_cron.sh`スクリプトを使用（推奨）：

```bash
chmod +x setup_cron.sh
./setup_cron.sh
```

このスクリプトは仮想環境のPythonを使用するように自動設定します。

または、手動で`crontab -e`を編集する場合：

```cron
0 18 * * * /path/to/eikaiwa_daily_summary/venv/bin/python3 /path/to/eikaiwa_daily_summary/main.py >> /path/to/eikaiwa_daily_summary/cron.log 2>&1
```

（パスは実際の環境に合わせて変更してください）

## 使用方法

### 手動実行

```bash
# 仮想環境を有効化
source venv/bin/activate

# スクリプトを実行
python3 main.py
```

または、仮想環境のPythonを直接指定：

```bash
venv/bin/python3 main.py
```

### ログ確認

```bash
# アプリケーションログ
tail -f daily_news.log

# cronログ（設定した場合）
tail -f cron.log
```

### Vercel APIのテスト

デプロイ後、以下のコマンドでAPIが正しく動作するかテストできます：

```bash
# 要約APIのテスト
curl -X POST https://your-project.vercel.app/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"title": "Test News", "content": "This is a test news article for testing the API endpoint."}'

# フレーズ生成APIのテスト
curl -X POST https://your-project.vercel.app/api/phrases \
  -H "Content-Type: application/json" \
  -d '{"title": "Test News", "summary": "This is a test summary.", "count": 5}'
```

## ファイル構成

```
eikaiwa_daily_summary/
├── api/                 # Vercel APIルート
│   ├── summarize.js    # ニュース要約API
│   └── phrases.js       # フレーズ生成API
├── main.py              # メインスクリプト
├── dmm_scraper.py       # DMM英会話ニュース取得
├── news_processor.py    # 要約・フレーズ生成（Vercel API呼び出し）
├── line_bot.py          # LINE Bot送信
├── config.py            # 設定管理
├── requirements.txt     # Python依存関係
├── package.json         # Node.js依存関係（Vercel用）
├── .env                 # 環境変数（作成必要）
├── setup_cron.sh        # cron設定スクリプト
└── README.md           # このファイル
```

## トラブルシューティング

### ニュースが取得できない

- DMM英会話のページ構造が変更されている可能性があります
- `dmm_scraper.py`のセレクタを確認・調整してください
- インターネット接続を確認してください

### LINEメッセージが送信されない

- `.env`ファイルの設定を確認してください
- LINEチャネルアクセストークンが有効か確認してください
- LINEユーザーIDが正しいか確認してください
- ログファイル（`daily_news.log`）を確認してください

### Vercel APIエラー

- `VERCEL_API_URL`が正しく設定されているか確認してください
- Vercelダッシュボードで環境変数`OPENAI_API_KEY`が設定されているか確認してください
- Vercelのデプロイが成功しているか確認してください
- インターネット接続を確認してください
- Vercelのログを確認してください（Vercelダッシュボード → Deployments → ログを確認）

## 注意事項

- DMM英会話の利用規約を遵守してください
- スクレイピングは適度な間隔を空けて実行してください
- OpenAI APIの使用量に注意してください
- LINE Bot APIのレート制限に注意してください

## ライセンス

このプロジェクトは個人利用を想定しています。

