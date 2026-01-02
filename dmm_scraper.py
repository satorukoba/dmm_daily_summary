"""
DMM英会話のDaily Newsを取得するモジュール
"""
import requests
from bs4 import BeautifulSoup
import logging
from typing import List, Dict
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DMMNewsScraper:
    """DMM英会話のDaily Newsをスクレイピングするクラス"""
    
    def __init__(self, base_url: str = "https://eikaiwa.dmm.com/app/daily-news/"):
        self.base_url = base_url
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    def get_latest_news(self, count: int = 3) -> List[Dict[str, str]]:
        """
        最新のニュースを取得
        
        Args:
            count: 取得するニュース数
            
        Returns:
            ニュースのリスト（タイトル、URL、本文を含む）
        """
        try:
            response = requests.get(self.base_url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            news_list = []
            
            # DMM英会話のDaily Newsページの構造に応じてセレクタを調整
            # 一般的な構造を想定
            news_items = soup.select('article, .news-item, .daily-news-item, a[href*="/daily-news/"]')
            
            if not news_items:
                # 別のセレクタを試す
                news_items = soup.find_all('a', href=lambda x: x and '/daily-news/' in x)
            
            seen_urls = set()
            
            for item in news_items[:count * 2]:  # 余分に取得して重複を避ける
                try:
                    # URLを取得
                    if item.name == 'a':
                        url = item.get('href', '')
                    else:
                        link = item.find('a')
                        url = link.get('href', '') if link else ''
                    
                    if not url or url in seen_urls:
                        continue
                    
                    # 相対URLを絶対URLに変換
                    if url.startswith('/'):
                        url = f"https://eikaiwa.dmm.com{url}"
                    elif not url.startswith('http'):
                        continue
                    
                    # タイトルを取得
                    title_elem = item.find(['h1', 'h2', 'h3', 'h4', '.title', '.news-title'])
                    if not title_elem:
                        title_elem = item
                    title = title_elem.get_text(strip=True)
                    
                    if not title or len(title) < 10:  # 短すぎるタイトルはスキップ
                        continue
                    
                    # 本文を取得（詳細ページから）
                    content = self._get_news_content(url)
                    
                    if content:
                        news_list.append({
                            'title': title,
                            'url': url,
                            'content': content,
                            'date': datetime.now().strftime('%Y-%m-%d')
                        })
                        seen_urls.add(url)
                        
                        if len(news_list) >= count:
                            break
                            
                except Exception as e:
                    logger.warning(f"ニュース項目の処理中にエラー: {e}")
                    continue
            
            if not news_list:
                logger.warning("ニュースが見つかりませんでした。ページ構造が変更されている可能性があります。")
                # フォールバック: サンプルデータを返す（テスト用）
                return self._get_fallback_news(count)
            
            return news_list[:count]
            
        except Exception as e:
            logger.error(f"ニュース取得中にエラーが発生: {e}")
            return self._get_fallback_news(count)
    
    def _get_news_content(self, url: str) -> str:
        """
        ニュース詳細ページから本文を取得
        
        Args:
            url: ニュース記事のURL
            
        Returns:
            ニュース本文
        """
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 本文を取得（一般的なセレクタを試す）
            content_selectors = [
                '.article-content',
                '.news-content',
                '.content',
                'article p',
                '.text-content',
                'main p'
            ]
            
            content = ""
            for selector in content_selectors:
                elements = soup.select(selector)
                if elements:
                    content = ' '.join([elem.get_text(strip=True) for elem in elements])
                    if len(content) > 100:  # 十分な長さがある場合
                        break
            
            if not content or len(content) < 100:
                # フォールバック: すべてのpタグから取得
                paragraphs = soup.find_all('p')
                content = ' '.join([p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20])
            
            return content[:5000]  # 長すぎる場合は切り詰め
            
        except Exception as e:
            logger.warning(f"ニュース本文の取得中にエラー: {url}, {e}")
            return ""
    
    def _get_fallback_news(self, count: int) -> List[Dict[str, str]]:
        """
        フォールバック用のサンプルニュース（テスト用）
        実際のスクレイピングが失敗した場合に使用
        """
        logger.info("フォールバックニュースを使用します")
        return [
            {
                'title': 'Sample News Article 1',
                'url': 'https://eikaiwa.dmm.com/app/daily-news/sample1',
                'content': 'This is a sample news article for testing purposes. It contains information about current events and can be used to practice English conversation skills.',
                'date': datetime.now().strftime('%Y-%m-%d')
            }
        ] * count

