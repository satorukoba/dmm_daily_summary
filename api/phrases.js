/**
 * Vercel Serverless Function: Advancedフレーズ生成API
 * OpenAI APIキーはVercelの環境変数に保存
 */
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, summary, count = 10 } = req.body;

    if (!title || !summary) {
      return res.status(400).json({ error: 'Title and summary are required' });
    }

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
    
    // フレーズをパース
    const phrases = parsePhrases(phrasesText, count);

    return res.status(200).json({ phrases });
  } catch (error) {
    console.error('Error in phrases API:', error);
    return res.status(500).json({ 
      error: 'Failed to generate phrases',
      message: error.message 
    });
  }
}

function parsePhrases(text, count) {
  const phrases = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 番号付きリストや箇条書きを処理
    let cleaned = trimmed;
    if (trimmed[0].match(/[\d\-•]/)) {
      cleaned = trimmed.replace(/^[\d\-•\)\.\s]+/, '').trim();
    }

    if (cleaned.length > 10) {
      phrases.push(cleaned);
      if (phrases.length >= count) break;
    }
  }

  // パースに失敗した場合は全体を返す
  return phrases.length > 0 ? phrases : [text];
}

