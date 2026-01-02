"""
ニュースの要約とAdvancedレベルの英語フレーズ生成を行うモジュール
Vercel API経由でOpenAI APIを呼び出す
"""
import requests
import logging
from typing import List, Dict
from config import VERCEL_API_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NewsProcessor:
    """ニュースを処理して要約とフレーズを生成するクラス"""
    
    def __init__(self):
        self.vercel_api_url = VERCEL_API_URL.rstrip('/') if VERCEL_API_URL else None
        if not self.vercel_api_url:
            logger.warning("VERCEL_API_URLが設定されていません。Vercel APIを使用できません。")
    
    def summarize_news(self, news: Dict[str, str]) -> str:
        """
        ニュースを要約（Vercel API経由）
        
        Args:
            news: ニュース辞書（title, contentを含む）
            
        Returns:
            要約されたテキスト
        """
        if not self.vercel_api_url:
            logger.warning("Vercel API URLが設定されていないため、簡易要約を返します")
            return self._simple_summary(news['content'])
        
        try:
            url = f"{self.vercel_api_url}/api/summarize"
            payload = {
                "title": news['title'],
                "content": news['content'][:3000]
            }
            
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            summary = result.get('summary', '')
            
            if summary:
                logger.info(f"要約を生成しました（{len(summary)}文字）")
                return summary
            else:
                logger.warning("要約が空でした。簡易要約を返します")
                return self._simple_summary(news['content'])
            
        except requests.exceptions.RequestException as e:
            logger.error(f"要約生成API呼び出し中にエラー: {e}")
            return self._simple_summary(news['content'])
        except Exception as e:
            logger.error(f"要約生成中にエラー: {e}")
            return self._simple_summary(news['content'])
    
    def generate_advanced_phrases(self, news: Dict[str, str], summary: str, count: int = 10) -> List[str]:
        """
        Advancedレベルの英語フレーズ、表現、単語を生成（Vercel API経由）
        
        Args:
            news: ニュース辞書
            summary: ニュースの要約
            count: 生成するフレーズ数
            
        Returns:
            フレーズのリスト
        """
        if not self.vercel_api_url:
            logger.warning("Vercel API URLが設定されていないため、サンプルフレーズを返します")
            return self._get_sample_phrases(count)
        
        try:
            url = f"{self.vercel_api_url}/api/phrases"
            payload = {
                "title": news['title'],
                "summary": summary,
                "count": count
            }
            
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            phrases = result.get('phrases', [])
            
            if phrases:
                logger.info(f"{len(phrases)}個のフレーズを生成しました")
                return phrases[:count]
            else:
                logger.warning("フレーズが空でした。サンプルフレーズを返します")
                return self._get_sample_phrases(count)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"フレーズ生成API呼び出し中にエラー: {e}")
            return self._get_sample_phrases(count)
        except Exception as e:
            logger.error(f"フレーズ生成中にエラー: {e}")
            return self._get_sample_phrases(count)
    
    def _parse_phrases(self, text: str) -> List[str]:
        """生成されたテキストからフレーズを抽出"""
        phrases = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 番号付きリストや箇条書きを処理
            if line[0].isdigit() or line.startswith('-') or line.startswith('•'):
                # 番号や記号を除去
                line = line.lstrip('0123456789.-•) ').strip()
            
            if len(line) > 10:  # 短すぎる行はスキップ
                phrases.append(line)
        
        return phrases if phrases else [text]  # パースに失敗した場合は全体を返す
    
    def _generate_additional_phrases(self, news: Dict[str, str], summary: str, count: int) -> List[str]:
        """追加のフレーズを生成（Vercel API経由）"""
        if not self.vercel_api_url:
            return []
        
        try:
            url = f"{self.vercel_api_url}/api/phrases"
            payload = {
                "title": news['title'],
                "summary": summary,
                "count": count
            }
            
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            phrases = result.get('phrases', [])
            return phrases[:count]
            
        except Exception as e:
            logger.warning(f"追加フレーズ生成中にエラー: {e}")
            return []
    
    def _simple_summary(self, content: str) -> str:
        """簡易要約（OpenAI APIが使えない場合）"""
        # 最初の200文字を要約として使用
        words = content.split()
        summary = ' '.join(words[:50])
        if len(words) > 50:
            summary += "..."
        return summary
    
    def _get_sample_phrases(self, count: int) -> List[str]:
        """サンプルフレーズ（テスト用）"""
        sample_phrases = [
            "From my perspective - 私の見解では",
            "It is worth noting that - 注目すべきは",
            "This raises the question of - これは～という疑問を提起する",
            "To put it differently - 言い換えれば",
            "This underscores the importance of - これは～の重要性を強調している",
            "A compelling argument - 説得力のある議論",
            "To delve deeper into - より深く掘り下げる",
            "This phenomenon can be attributed to - この現象は～に起因すると考えられる",
            "It is imperative that - ～することが不可欠である",
            "This warrants further investigation - これはさらなる調査が必要である"
        ]
        return sample_phrases[:count]

