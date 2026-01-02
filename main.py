#!/usr/bin/env python3
"""
DMM英会話Daily News要約とフレーズ生成のメインスクリプト
毎日18時に実行されることを想定
"""
import logging
import sys
from datetime import datetime
from dmm_scraper import DMMNewsScraper
from news_processor import NewsProcessor
from line_bot import LineBotSender
from config import MAX_NEWS_COUNT, PHRASES_PER_NEWS

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('daily_news.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def main():
    """メイン処理"""
    logger.info("=" * 50)
    logger.info("DMM英会話Daily News処理を開始します")
    logger.info(f"実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 50)
    
    try:
        # 1. ニュースを取得
        logger.info("ステップ1: ニュースを取得中...")
        scraper = DMMNewsScraper()
        news_list = scraper.get_latest_news(MAX_NEWS_COUNT)
        
        if not news_list:
            logger.error("ニュースの取得に失敗しました")
            return False
        
        logger.info(f"{len(news_list)}件のニュースを取得しました")
        
        # 2. 各ニュースを処理
        logger.info("ステップ2: ニュースを処理中...")
        processor = NewsProcessor()
        processed_news = []
        
        for i, news in enumerate(news_list, 1):
            logger.info(f"ニュース {i}/{len(news_list)} を処理中: {news['title']}")
            
            # 要約を生成
            summary = processor.summarize_news(news)
            logger.info(f"要約を生成しました（{len(summary)}文字）")
            
            # フレーズを生成
            phrases = processor.generate_advanced_phrases(news, summary, PHRASES_PER_NEWS)
            logger.info(f"{len(phrases)}個のフレーズを生成しました")
            
            processed_news.append({
                'title': news['title'],
                'url': news.get('url', ''),
                'summary': summary,
                'phrases': phrases
            })
        
        # 3. LINE Bot経由で送信
        logger.info("ステップ3: LINE Bot経由で送信中...")
        line_bot = LineBotSender()
        
        # 最初に全体の通知を送信
        intro_message = f"""📚 Daily News Summary - {datetime.now().strftime('%Y年%m月%d日')}

本日は{len(processed_news)}件のニュースをお届けします。
各ニュースの要約とAdvancedレベルの英語フレーズ・表現をご確認ください。

"""
        line_bot.send_message(intro_message)
        
        # 各ニュースを送信
        success = line_bot.send_multiple_news(processed_news)
        
        if success:
            logger.info("すべての処理が正常に完了しました")
            return True
        else:
            logger.warning("一部の処理でエラーが発生しました")
            return False
            
    except Exception as e:
        logger.error(f"予期しないエラーが発生しました: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

