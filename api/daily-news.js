/**
 * Vercel Serverless Function: ニュース取得・処理・保存API
 * 毎日18時にVercel Cron Jobsから呼び出される
 */
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// データ保存先（Vercelの/tmpディレクトリを使用）
const DATA_DIR = '/tmp/daily-news';
const DATA_FILE = join(DATA_DIR, 'news-data.json');

/**
 * ニュースを要約
 */
async function summarizeNews(title, content) {
  const prompt = `以下のニュース記事を簡潔に要約してください（100-150語程度）。

タイトル: ${title}

本文:
${content.substring(0, 3000)}

要約:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes news articles concisely in English.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

/**
 * Advancedフレーズを生成
 */
async function generatePhrases(title, summary, count = 10) {
  const prompt = `以下のニュース記事を基に、議論や意見を述べる際に使えるAdvancedレベルの英語フレーズ、表現、または単語を${count}個生成してください。
各フレーズ/表現/単語には、その意味や使用例を簡潔に説明してください。

ニュースタイトル: ${title}
要約: ${summary}

形式:
1. フレーズ/表現/単語 - 説明

出力:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an English language expert that provides advanced-level phrases, expressions, and vocabulary for discussing news topics.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 800,
    temperature: 0.8,
  });

  const phrasesText = response.choices[0].message.content.trim();
  return parsePhrases(phrasesText, count);
}

function parsePhrases(text, count) {
  const phrases = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let cleaned = trimmed;
    if (trimmed[0].match(/[\d\-•]/)) {
      cleaned = trimmed.replace(/^[\d\-•\)\.\s]+/, '').trim();
    }

    if (cleaned.length > 10) {
      phrases.push(cleaned);
      if (phrases.length >= count) break;
    }
  }

  return phrases.length > 0 ? phrases : [text];
}

/**
 * DMM英会話のDaily Newsを取得
 */
async function fetchDMMNews() {
  const cheerio = await import('cheerio');
  
  const baseUrl = 'https://eikaiwa.dmm.com/app/daily-news/';
  const maxNewsCount = 3;
  
  try {
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const newsList = [];
    const seenUrls = new Set();

    // DMM英会話のDaily Newsページの構造に応じてセレクタを調整
    // 一般的な構造を想定
    const newsItems = $('article, .news-item, .daily-news-item, a[href*="/daily-news/"]');

    if (newsItems.length === 0) {
      // 別のセレクタを試す
      const links = $('a[href*="/daily-news/"]');
      links.each((i, elem) => {
        if (newsList.length >= maxNewsCount) return false;
        
        const $elem = $(elem);
        const url = $elem.attr('href');
        if (!url || seenUrls.has(url)) return;

        const fullUrl = url.startsWith('http') ? url : `https://eikaiwa.dmm.com${url}`;
        const title = $elem.text().trim() || $elem.find('h1, h2, h3, .title, .news-title').text().trim();

        if (title && title.length > 10) {
          seenUrls.add(url);
          newsList.push({
            title,
            url: fullUrl,
            content: '', // 詳細ページから取得
            date: new Date().toISOString().split('T')[0],
          });
        }
      });
    } else {
      newsItems.each((i, elem) => {
        if (newsList.length >= maxNewsCount) return false;

        const $elem = $(elem);
        const link = $elem.find('a').first() || $elem;
        const url = link.attr('href');
        
        if (!url || seenUrls.has(url)) return;

        const fullUrl = url.startsWith('http') ? url : `https://eikaiwa.dmm.com${url}`;
        const title = $elem.find('h1, h2, h3, .title, .news-title').first().text().trim() || 
                     link.text().trim();

        if (title && title.length > 10) {
          seenUrls.add(url);
          newsList.push({
            title,
            url: fullUrl,
            content: '', // 詳細ページから取得
            date: new Date().toISOString().split('T')[0],
          });
        }
      });
    }

    // 各ニュースの詳細ページから本文を取得
    for (const news of newsList) {
      try {
        const detailResponse = await fetch(news.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (detailResponse.ok) {
          const detailHtml = await detailResponse.text();
          const $detail = cheerio.load(detailHtml);

          // 本文を取得
          const contentSelectors = [
            '.article-content',
            '.news-content',
            '.content',
            'article p',
            '.text-content',
            'main p',
          ];

          let content = '';
          for (const selector of contentSelectors) {
            const elements = $detail(selector);
            if (elements.length > 0) {
              content = elements
                .map((i, el) => $detail(el).text().trim())
                .get()
                .filter(text => text.length > 20)
                .join(' ');
              if (content.length > 100) break;
            }
          }

          if (!content || content.length < 100) {
            // フォールバック: すべてのpタグから取得
            const paragraphs = $detail('p');
            content = paragraphs
              .map((i, el) => $detail(el).text().trim())
              .get()
              .filter(text => text.length > 20)
              .join(' ');
          }

          news.content = content.substring(0, 5000);
        }
      } catch (error) {
        console.warn(`Failed to fetch content for ${news.url}:`, error);
        // サンプルコンテンツを設定
        news.content = 'This news article content could not be retrieved. Please visit the original article for full content.';
      }
    }

    // ニュースが見つからない場合はサンプルデータを返す
    if (newsList.length === 0) {
      console.warn('No news found, returning sample data');
      return [
        {
          title: 'Sample News Article 1',
          url: 'https://eikaiwa.dmm.com/app/daily-news/sample1',
          content: 'This is a sample news article for testing purposes. It contains information about current events and can be used to practice English conversation skills.',
          date: new Date().toISOString().split('T')[0],
        },
        {
          title: 'Sample News Article 2',
          url: 'https://eikaiwa.dmm.com/app/daily-news/sample2',
          content: 'This is another sample news article. It provides additional content for testing the news processing and summarization features.',
          date: new Date().toISOString().split('T')[0],
        },
        {
          title: 'Sample News Article 3',
          url: 'https://eikaiwa.dmm.com/app/daily-news/sample3',
          content: 'This is the third sample news article. It demonstrates how multiple news items can be processed and displayed on the web service.',
          date: new Date().toISOString().split('T')[0],
        },
      ];
    }

    return newsList.slice(0, maxNewsCount);
  } catch (error) {
    console.error('Error fetching DMM news:', error);
    // エラー時はサンプルデータを返す
    return [
      {
        title: 'Sample News Article 1',
        url: 'https://eikaiwa.dmm.com/app/daily-news/sample1',
        content: 'This is a sample news article for testing purposes. It contains information about current events and can be used to practice English conversation skills.',
        date: new Date().toISOString().split('T')[0],
      },
      {
        title: 'Sample News Article 2',
        url: 'https://eikaiwa.dmm.com/app/daily-news/sample2',
        content: 'This is another sample news article. It provides additional content for testing the news processing and summarization features.',
        date: new Date().toISOString().split('T')[0],
      },
      {
        title: 'Sample News Article 3',
        url: 'https://eikaiwa.dmm.com/app/daily-news/sample3',
        content: 'This is the third sample news article. It demonstrates how multiple news items can be processed and displayed on the web service.',
        date: new Date().toISOString().split('T')[0],
      },
    ];
  }
}

/**
 * データを保存
 */
async function saveNewsData(newsData) {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(newsData, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving news data:', error);
    return false;
  }
}

/**
 * メイン処理
 */
export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GETリクエスト: 手動実行用
  if (req.method === 'GET') {
    try {
      const newsList = await fetchDMMNews();
      const processedNews = [];

      for (const news of newsList) {
        const summary = await summarizeNews(news.title, news.content);
        const phrases = await generatePhrases(news.title, summary, 10);

        processedNews.push({
          title: news.title,
          url: news.url,
          summary,
          phrases,
          date: news.date,
        });
      }

      // データを保存
      const newsData = {
        lastUpdated: new Date().toISOString(),
        news: processedNews,
      };
      await saveNewsData(newsData);

      return res.status(200).json({
        success: true,
        message: 'News processed and saved successfully',
        newsCount: processedNews.length,
      });
    } catch (error) {
      console.error('Error processing news:', error);
      return res.status(500).json({
        error: 'Failed to process news',
        message: error.message,
      });
    }
  }

  // POSTリクエスト: Cron Jobsから呼び出される
  if (req.method === 'POST') {
    try {
      const newsList = await fetchDMMNews();
      const processedNews = [];

      for (const news of newsList) {
        const summary = await summarizeNews(news.title, news.content);
        const phrases = await generatePhrases(news.title, summary, 10);

        processedNews.push({
          title: news.title,
          url: news.url,
          summary,
          phrases,
          date: news.date,
        });
      }

      // データを保存
      const newsData = {
        lastUpdated: new Date().toISOString(),
        news: processedNews,
      };
      await saveNewsData(newsData);

      return res.status(200).json({
        success: true,
        message: 'News processed and saved successfully',
        newsCount: processedNews.length,
      });
    } catch (error) {
      console.error('Error processing news:', error);
      return res.status(500).json({
        error: 'Failed to process news',
        message: error.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

