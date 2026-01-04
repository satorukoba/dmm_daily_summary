/**
 * Vercel Serverless Function: 保存されたニュース一覧を取得するAPI
 */
import { readFile } from 'fs/promises';
import { join } from 'path';

const DATA_DIR = '/tmp/daily-news';
const DATA_FILE = join(DATA_DIR, 'news-data.json');

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // データファイルを読み込む
    const data = await readFile(DATA_FILE, 'utf-8');
    const newsData = JSON.parse(data);

    return res.status(200).json(newsData);
  } catch (error) {
    // ファイルが存在しない場合
    if (error.code === 'ENOENT') {
      return res.status(200).json({
        lastUpdated: null,
        news: [],
        message: 'No news data available yet. Please run the daily-news API first.',
      });
    }

    console.error('Error reading news data:', error);
    return res.status(500).json({
      error: 'Failed to read news data',
      message: error.message,
    });
  }
}

