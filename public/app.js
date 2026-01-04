// APIのベースURL（Vercelデプロイ後のURLに置き換える）
const API_BASE_URL = window.location.origin;

// ローカルストレージのキー
const STORAGE_KEY = 'daily-news-data';

/**
 * ニュース一覧を取得（ローカルストレージから、またはAPIから）
 */
async function fetchNewsList() {
    try {
        // まずローカルストレージから取得を試みる
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
            const data = JSON.parse(cachedData);
            // キャッシュが1時間以内なら使用
            if (data.lastUpdated && (Date.now() - new Date(data.lastUpdated).getTime()) < 3600000) {
                return data;
            }
        }

        // キャッシュがないか古い場合は、daily-news APIを呼び出してデータを取得・処理
        const response = await fetch(`${API_BASE_URL}/api/daily-news`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // ローカルストレージに保存
        if (data.news && data.news.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching news:', error);
        // エラー時はキャッシュがあれば使用
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        throw error;
    }
}

/**
 * 日付をフォーマット
 */
function formatDate(dateString) {
    if (!dateString) return '不明';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * ニュースカードを生成
 */
function createNewsCard(news, index) {
    const card = document.createElement('div');
    card.className = 'news-card';

    const phrasesList = news.phrases
        .map((phrase, i) => `<li>${phrase}</li>`)
        .join('');

    card.innerHTML = `
        <h2>${index + 1}. ${escapeHtml(news.title)}</h2>
        ${news.url ? `<a href="${news.url}" target="_blank" rel="noopener noreferrer" class="news-url">🔗 元の記事を見る</a>` : ''}
        
        <div class="summary-section">
            <h3>📝 Summary</h3>
            <p>${escapeHtml(news.summary)}</p>
        </div>

        <div class="phrases-section">
            <h3>💬 Advanced Phrases & Expressions</h3>
            <ol class="phrases-list">
                ${phrasesList}
            </ol>
        </div>
    `;

    return card;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * ページを更新
 */
async function updatePage() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const newsContainerEl = document.getElementById('newsContainer');
    const emptyEl = document.getElementById('empty');
    const lastUpdatedEl = document.getElementById('lastUpdated');

    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        newsContainerEl.style.display = 'none';
        emptyEl.style.display = 'none';

        const data = await fetchNewsList();

        loadingEl.style.display = 'none';

        if (data.lastUpdated) {
            lastUpdatedEl.textContent = `最終更新: ${formatDate(data.lastUpdated)}`;
        }

        if (data.news && data.news.length > 0) {
            newsContainerEl.innerHTML = '';
            data.news.forEach((news, index) => {
                const card = createNewsCard(news, index);
                newsContainerEl.appendChild(card);
            });
            newsContainerEl.style.display = 'grid';
        } else {
            emptyEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Error updating page:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', () => {
    updatePage();

    // 5分ごとに自動更新
    setInterval(updatePage, 5 * 60 * 1000);
});

