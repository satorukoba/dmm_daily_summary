/**
 * Vercel Serverless Function: ニュース要約API
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
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

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

    const summary = response.choices[0].message.content.trim();

    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Error in summarize API:', error);
    return res.status(500).json({ 
      error: 'Failed to generate summary',
      message: error.message 
    });
  }
}

