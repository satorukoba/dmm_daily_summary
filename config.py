"""
設定ファイル
環境変数から設定を読み込む
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Vercel API設定（OpenAI APIキーはVercel側で管理）
VERCEL_API_URL = os.getenv("VERCEL_API_URL", "")  # Vercelデプロイ後のURL（例: https://your-project.vercel.app）

# LINE Bot設定
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_USER_ID = os.getenv("LINE_USER_ID")  # 送信先のLINEユーザーID

# DMM英会話 Daily News URL
DMM_DAILY_NEWS_URL = "https://eikaiwa.dmm.com/app/daily-news/"

# その他の設定
MAX_NEWS_COUNT = 3  # 取得するニュース数
PHRASES_PER_NEWS = 10  # ニュース1件あたりのフレーズ数

