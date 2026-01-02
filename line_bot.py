"""
LINE Bot APIを使用してメッセージを送信するモジュール
"""
import requests
import logging
from typing import List
from config import LINE_CHANNEL_ACCESS_TOKEN, LINE_USER_ID

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LINE_API_URL = "https://api.line.me/v2/bot/message/push"


class LineBotSender:
    """LINE Bot APIを使用してメッセージを送信するクラス"""
    
    def __init__(self):
        self.access_token = LINE_CHANNEL_ACCESS_TOKEN
        self.user_id = LINE_USER_ID
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.access_token}'
        }
    
    def send_message(self, message: str) -> bool:
        """
        テキストメッセージを送信
        
        Args:
            message: 送信するメッセージ
            
        Returns:
            送信成功時True
        """
        if not self.access_token or not self.user_id:
            logger.error("LINE_CHANNEL_ACCESS_TOKENまたはLINE_USER_IDが設定されていません")
            return False
        
        try:
            payload = {
                "to": self.user_id,
                "messages": [
                    {
                        "type": "text",
                        "text": message
                    }
                ]
            }
            
            response = requests.post(
                LINE_API_URL,
                headers=self.headers,
                json=payload,
                timeout=10
            )
            
            response.raise_for_status()
            logger.info("LINEメッセージの送信に成功しました")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"LINEメッセージ送信エラー: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"レスポンス: {e.response.text}")
            return False
    
    def send_news_summary(self, news_data: dict) -> bool:
        """
        ニュースの要約とフレーズをフォーマットして送信
        
        Args:
            news_data: ニュースデータ（title, summary, phrasesを含む）
            
        Returns:
            送信成功時True
        """
        # メッセージを構築（LINEの文字数制限を考慮）
        message_parts = []
        
        # タイトル
        message_parts.append(f"📰 {news_data['title']}\n")
        message_parts.append("─" * 30 + "\n")
        
        # 要約
        message_parts.append("📝 Summary:\n")
        message_parts.append(f"{news_data['summary']}\n\n")
        
        # フレーズ
        message_parts.append("💬 Advanced Phrases & Expressions:\n")
        for i, phrase in enumerate(news_data['phrases'], 1):
            message_parts.append(f"{i}. {phrase}\n")
        
        # URL
        if 'url' in news_data:
            message_parts.append(f"\n🔗 {news_data['url']}")
        
        message = ''.join(message_parts)
        
        # LINEの文字数制限（5000文字）をチェック
        if len(message) > 5000:
            # メッセージを分割して送信
            return self._send_long_message(message)
        else:
            return self.send_message(message)
    
    def _send_long_message(self, message: str) -> bool:
        """
        長いメッセージを分割して送信
        
        Args:
            message: 送信するメッセージ
            
        Returns:
            送信成功時True
        """
        max_length = 4000  # 安全マージンを考慮
        parts = []
        
        current_part = ""
        lines = message.split('\n')
        
        for line in lines:
            if len(current_part) + len(line) + 1 > max_length:
                if current_part:
                    parts.append(current_part)
                current_part = line + '\n'
            else:
                current_part += line + '\n'
        
        if current_part:
            parts.append(current_part)
        
        # 各部分を送信
        success = True
        for i, part in enumerate(parts):
            if i > 0:
                part = f"[続き {i+1}/{len(parts)}]\n\n{part}"
            if not self.send_message(part):
                success = False
        
        return success
    
    def send_multiple_news(self, news_list: List[dict]) -> bool:
        """
        複数のニュースを順番に送信
        
        Args:
            news_list: ニュースデータのリスト
            
        Returns:
            すべて送信成功時True
        """
        success = True
        for i, news_data in enumerate(news_list, 1):
            logger.info(f"ニュース {i}/{len(news_list)} を送信中...")
            
            # ニュース番号を追加
            news_with_number = news_data.copy()
            news_with_number['title'] = f"News {i}: {news_data['title']}"
            
            if not self.send_news_summary(news_with_number):
                success = False
                logger.error(f"ニュース {i} の送信に失敗しました")
            
            # メッセージ間隔を空ける（レート制限対策）
            import time
            if i < len(news_list):
                time.sleep(1)
        
        return success

