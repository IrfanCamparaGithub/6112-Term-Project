// Alpha Vantage NEWS_SENTIMENT integration
const API_KEY = 'BNDU5TPXWRQ7S1OK';
const BASE_URL = 'https://www.alphavantage.co/query';

const topicsEl = document.getElementById('topics');
const tickersEl = document.getElementById('tickers');
const limitEl = document.getElementById('limit');
const sortEl = document.getElementById('sort');
const fetchBtn = document.getElementById('fetchNewsBtn');
const newsList = document.getElementById('newsList');
const statusEl = document.getElementById('status');

function getSelectedTopics() {
  return Array.from(topicsEl.selectedOptions).map(o => o.value).join(',');
}

function buildUrl() {
  const params = new URLSearchParams();
  params.set('function', 'NEWS_SENTIMENT');
  const topics = getSelectedTopics();
  const tickers = (tickersEl.value || '').trim().toUpperCase().replace(/\s+/g, '');
  const limit = limitEl.value || '50';
  const sort = sortEl.value || 'LATEST';

  if (topics) params.set('topics', topics);
  if (tickers) params.set('tickers', tickers);
  params.set('limit', limit);
  params.set('sort', sort);
  params.set('apikey', API_KEY);

  return `${BASE_URL}?${params.toString()}`;
}

function asPct(x) {
  if (typeof x !== 'number') return '—';
  return (x * 100).toFixed(1) + '%';
}

function sentimentBadge(score) {
  let label = 'Neutral', cls = 'bg-secondary';
  if (typeof score === 'number') {
    if (score > 0.1) { label = 'Positive'; cls = 'bg-success'; }
    else if (score < -0.1) { label = 'Negative'; cls = 'bg-danger'; }
  }
  return `<span class="badge ${cls}">${label}</span>`;
}

function confidenceBadge(conf) {
  if (typeof conf !== 'number') return '';
  let cls = conf >= 0.6 ? 'bg-success' : conf >= 0.3 ? 'bg-warning text-dark' : 'bg-secondary';
  return `<span class="badge ${cls}">Conf: ${asPct(conf)}</span>`;
}

function topicPills(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return arr.map(t => `<span class="topic-pill">${t}</span>`).join(' ');
}

function renderArticles(articles) {
  newsList.innerHTML = '';
  if (!Array.isArray(articles) || articles.length === 0) {
    newsList.innerHTML = `<div class="col-12"><div class="card"><div class="card-body">No articles found.</div></div></div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  articles.forEach(a => {
    const title = a.title ?? 'Untitled';
    const url = a.url ?? '#';
    const source = a.source ?? a.authors?.[0] ?? 'Unknown';
    const summary = a.summary ?? '';
    const img = a.banner_image ?? '';
    const topics = (a.topics || []).map(x => x.topic).filter(Boolean);
    const score = typeof a.overall_sentiment_score === 'number' ? a.overall_sentiment_score : null;
    const conf  = typeof a.overall_sentiment_label_confidence === 'number' ? a.overall_sentiment_label_confidence : null;

    const col = document.createElement('div');
    col.className = 'col-12';

    col.innerHTML = `
      <div class="card news-card">
        <div class="card-body">
          <div class="d-flex gap-3">
            ${img ? `<img src="${img}" alt="" style="width:120px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #1f2937;">` : ''}
            <div class="flex-grow-1">
              <h5 class="card-title mb-1"><a href="${url}" target="_blank" rel="noopener">${title}</a></h5>
              <div class="mb-2 muted">Source: ${source}</div>
              <p class="mb-2" style="white-space:pre-wrap">${summary}</p>
              <div class="d-flex flex-wrap align-items-center gap-2">
                ${sentimentBadge(score)}
                ${confidenceBadge(conf)}
                ${topicPills(topics)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    frag.appendChild(col);
  });

  newsList.appendChild(frag);
}

async function fetchNews() {
  const url = buildUrl();
  statusEl.textContent = 'Fetching latest news...';
  newsList.innerHTML = '';

  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      statusEl.textContent = `Server error: ${res.status}`;
      newsList.innerHTML = `<div class="col-12"><div class="card"><div class="card-body">${text}</div></div></div>`;
      return;
    }

    const data = JSON.parse(text);

    // Alpha Vantage wraps articles inside "feed"
    const feed = Array.isArray(data.feed) ? data.feed : [];
    // Render most recent first (already LATEST by default)
    renderArticles(feed);
    statusEl.textContent = `Showing ${feed.length} articles`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Failed to fetch news.';
    newsList.innerHTML = `<div class="col-12"><div class="card"><div class="card-body">` +
                         `Error: ${err.message}</div></div></div>`;
  }
}

// Events
fetchBtn.addEventListener('click', fetchNews);

// Auto-load latest (no time window)
document.addEventListener('DOMContentLoaded', fetchNews);
