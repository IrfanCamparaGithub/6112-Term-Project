// Same-origin base (avoid CORS / port issues)
const API_BASE = window.location.origin;

// Chart.js dark defaults
Chart.defaults.color = '#e5e7eb';
Chart.defaults.borderColor = 'rgba(148,163,184,0.15)';

let ebitdaChart = null;
let revenueChart = null;
let netIncomeChart = null;

// DOM
const welcomeUser = document.getElementById('welcomeUser');
const logoutBtn = document.getElementById('logoutBtn');
const fetchDataBtn = document.getElementById('fetchDataBtn');
const tickerInput = document.getElementById('tickerInput');
const loadingDiv = document.getElementById('loading');
const dataDisplay = document.getElementById('dataDisplay');
const ebitdaTableBody = document.getElementById('ebitdaTableBody');

// Utils
const asArray = (x) => Array.isArray(x) ? x : (x == null ? [] : [x]);
const normalizeRecord = (r) => ({
  ticker: r?.ticker ?? '',
  ebitda_last_4: asArray(r?.ebitda_last_4),
  revenue_last_4: asArray(r?.revenue_last_4),
  net_income_last_4: asArray(r?.net_income_last_4),
});

function destroyCharts() {
  if (ebitdaChart) { ebitdaChart.destroy(); ebitdaChart = null; }
  if (revenueChart) { revenueChart.destroy(); revenueChart = null; }
  if (netIncomeChart) { netIncomeChart.destroy(); netIncomeChart = null; }
}

function chartOpts() {
  return {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#e5e7eb' } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(148,163,184,0.15)' } },
      y: {
        ticks: { color: '#9ca3af', callback: v => '$' + Intl.NumberFormat().format(v) },
        grid: { color: 'rgba(148,163,184,0.15)' },
        beginAtZero: true
      }
    }
  };
}

// IMPORTANT: do NOT destroy charts inside this helper.
// Single-ticker flow creates 3 charts sequentially.
function makeLineChart(ctx, label, data, color) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Q1','Q2','Q3','Q4'].slice(-data.length),
      datasets: [{
        label,
        data: [...data].reverse(),  // oldest -> newest
        borderWidth: 3,
        fill: false,
        tension: 0.35,
        borderColor: color
      }]
    },
    options: chartOpts()
  });
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  const u = localStorage.getItem('username');
  if (!u) { window.location.href = '/'; return; }
  welcomeUser.textContent = `Welcome, ${u}!`;
});

logoutBtn.onclick = () => { localStorage.removeItem('username'); window.location.href = '/'; };
fetchDataBtn.onclick = fetchFinancials;
tickerInput.addEventListener('keypress', e => { if (e.key === 'Enter') fetchFinancials(); });

// Main fetch
async function fetchFinancials() {
  const tickers = tickerInput.value.trim().toUpperCase().split(',').map(t => t.trim()).filter(Boolean);
  if (!tickers.length) return alert('Enter at least one ticker.');

  loadingDiv.classList.remove('d-none');
  dataDisplay.classList.add('d-none');

  try {
    // Use unified batch endpoint (your backend supports it)
    const url = `${API_BASE}/financials/batch/${encodeURIComponent(tickers.join(','))}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    const list = Array.isArray(raw) ? raw.map(normalizeRecord) : [];
    const valid = list.filter(x => x.ebitda_last_4.length || x.revenue_last_4.length || x.net_income_last_4.length);
    if (!valid.length) return alert('No financial data found.');

    if (valid.length === 1) {
      renderSingle(valid[0]);
    } else {
      renderMulti(valid);
    }
  } catch (e) {
    console.error(e);
    alert('Error fetching data: ' + e.message);
  } finally {
    loadingDiv.classList.add('d-none');
  }
}

// Single-company view
function renderSingle(c) {
  destroyCharts(); // destroy once

  const e = asArray(c.ebitda_last_4);
  const r = asArray(c.revenue_last_4);
  const n = asArray(c.net_income_last_4);

  const eCtx = document.getElementById('ebitdaChart')?.getContext('2d');
  const rCtx = document.getElementById('revenueChart')?.getContext('2d');
  const nCtx = document.getElementById('netIncomeChart')?.getContext('2d');

  if (eCtx && e.length) ebitdaChart = makeLineChart(eCtx, `${c.ticker} EBITDA`, e, '#60a5fa');
  if (rCtx && r.length) revenueChart = makeLineChart(rCtx, `${c.ticker} Revenue`, r, '#10b981');
  if (nCtx && n.length) netIncomeChart = makeLineChart(nCtx, `${c.ticker} Net Income`, n, '#f59e0b');

  fillEbitdaTable(e);
  dataDisplay.classList.remove('d-none');
}

// Multi-company comparison
function renderMulti(list) {
  destroyCharts(); // destroy once

  const colors = ['#60a5fa','#10b981','#f59e0b','#a855f7','#ef4444','#f97316'];
  const q = ['Q1','Q2','Q3','Q4'];

  const ctxE = document.getElementById('ebitdaChart')?.getContext('2d');
  const ctxR = document.getElementById('revenueChart')?.getContext('2d');
  const ctxN = document.getElementById('netIncomeChart')?.getContext('2d');

  if (ctxE) {
    ebitdaChart = new Chart(ctxE, {
      type: 'line',
      data: {
        labels: q,
        datasets: list.map((c, i) => ({
          label: `${c.ticker} EBITDA`,
          data: asArray(c.ebitda_last_4).slice().reverse(),
          borderColor: colors[i % colors.length],
          tension: 0.35,
          fill: false,
          borderWidth: 3
        }))
      },
      options: chartOpts()
    });
  }

  if (ctxR) {
    revenueChart = new Chart(ctxR, {
      type: 'line',
      data: {
        labels: q,
        datasets: list.map((c, i) => ({
          label: `${c.ticker} Revenue`,
          data: asArray(c.revenue_last_4).slice().reverse(),
          borderColor: colors[(i + 1) % colors.length],
          tension: 0.35,
          fill: false,
          borderWidth: 3
        }))
      },
      options: chartOpts()
    });
  }

  if (ctxN) {
    netIncomeChart = new Chart(ctxN, {
      type: 'line',
      data: {
        labels: q,
        datasets: list.map((c, i) => ({
          label: `${c.ticker} Net Income`,
          data: asArray(c.net_income_last_4).slice().reverse(),
          borderColor: colors[(i + 2) % colors.length],
          tension: 0.35,
          fill: false,
          borderWidth: 3
        }))
      },
      options: chartOpts()
    });
  }

  // Table note for multi-company mode
  if (ebitdaTableBody) {
    ebitdaTableBody.innerHTML = `<tr><td colspan="4" class="text-muted">Comparison shown above.</td></tr>`;
  }

  dataDisplay.classList.remove('d-none');
}

function fillEbitdaTable(vals) {
  if (!ebitdaTableBody) return;
  ebitdaTableBody.innerHTML = '';

  const series = asArray(vals);
  if (!series.length) {
    ebitdaTableBody.innerHTML = `<tr><td colspan="4" class="text-muted">No EBITDA data available.</td></tr>`;
    return;
  }

  const ordered = series.slice().reverse(); // oldest -> newest
  const labels = ['Q1','Q2','Q3','Q4'].slice(-ordered.length);

  for (let i = 0; i < ordered.length; i++) {
    const cur = ordered[i];
    const prev = i > 0 ? ordered[i - 1] : null;
    const change = prev !== null ? cur - prev : null;
    const trend = change === null ? '-' : change > 0 ? '▲' : change < 0 ? '▼' : '•';

    ebitdaTableBody.innerHTML += `
      <tr>
        <td>${labels[i]}</td>
        <td>$${Intl.NumberFormat().format(cur)}</td>
        <td>${change === null ? '-' : '$' + Intl.NumberFormat().format(change)}</td>
        <td>${trend}</td>
      </tr>`;
  }
}
