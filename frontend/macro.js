// Alpha Vantage macro indicators
const API_KEY = 'BNDU5TPXWRQ7S1OK';
const BASE = 'https://www.alphavantage.co/query';

const indicatorEl = document.getElementById('indicator');
const pointsEl = document.getElementById('points');
const sortEl = document.getElementById('sort');
const fetchBtn = document.getElementById('fetchBtn');
const statusEl = document.getElementById('status');
const ctx = document.getElementById('macroChart').getContext('2d');

let chart;

/** Map indicator -> function + label + value accessor */
const META = {
  REAL_GDP: {
    fn: 'REAL_GDP',
    title: 'Real GDP (Chained 2012 Dollars, Quarterly)',
    valueKey: 'value' // in billions
  },
  INFLATION: {
    fn: 'INFLATION',
    title: 'Inflation (CPI, Monthly, %)',
    valueKey: 'value' // percentage
  },
  FEDERAL_FUNDS_RATE: {
    fn: 'FEDERAL_FUNDS_RATE',
    title: 'Federal Funds Rate (Monthly, %)',
    valueKey: 'value' // percent
  }
};

function buildUrl(fn) {
  const p = new URLSearchParams();
  p.set('function', fn);
  p.set('apikey', API_KEY);
  return `${BASE}?${p.toString()}`;
}

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/** Normalize Alpha Vantage series */
function parseSeries(json) {
  // Alpha Vantage economic endpoints usually return { data: [ { date, value }, ... ] }
  if (Array.isArray(json?.data)) return json.data;
  // Graceful fallback: some endpoints use different keys; try common alternatives
  if (Array.isArray(json?.realtime_start)) return []; // not supported shape here
  // Some endpoints may wrap data differently; try to sniff arrays of objects with date/value
  if (json && typeof json === 'object') {
    for (const k of Object.keys(json)) {
      if (Array.isArray(json[k]) && json[k].length && json[k][0].date && (json[k][0].value != null)) {
        return json[k];
      }
    }
  }
  return [];
}

function formatValueLabel(indicator) {
  switch (indicator) {
    case 'REAL_GDP': return v => '$' + Intl.NumberFormat().format(v) + 'B';
    case 'INFLATION':
    case 'FEDERAL_FUNDS_RATE': return v => (v?.toFixed?.(2) ?? v) + '%';
    default: return v => String(v);
  }
}

function chartOptions(indicator) {
  const fmt = formatValueLabel(indicator);
  return {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#e5e7eb' } },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af', maxRotation: 0, autoSkip: true },
        grid: { color: 'rgba(148,163,184,0.15)' }
      },
      y: {
        ticks: {
          color: '#9ca3af',
          callback: (v) => fmt(v)
        },
        grid: { color: 'rgba(148,163,184,0.15)' },
        beginAtZero: false
      }
    }
  };
}

function drawChart(indicator, labels, values) {
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: META[indicator].title,
        data: values,
        borderWidth: 3,
        tension: 0.35,
        fill: false,
        borderColor: indicator === 'REAL_GDP' ? '#60a5fa' :
                    indicator === 'INFLATION' ? '#10b981' : '#f59e0b'
      }]
    },
    options: chartOptions(indicator)
  });
}

async function fetchIndicator() {
  const indicator = indicatorEl.value;
  const limit = Number(pointsEl.value || 40);
  const order = sortEl.value; // LATEST or EARLIEST

  statusEl.textContent = 'Fetching…';

  try {
    const url = buildUrl(META[indicator].fn);
    const res = await fetch(url);
    const text = await res.text();

    if (!res.ok) {
      statusEl.textContent = `Server error: ${res.status}`;
      console.error(text);
      return;
    }

    const json = JSON.parse(text);
    const series = parseSeries(json);
    const key = META[indicator].valueKey;

    let rows = series
      .map(r => ({ date: r.date, value: toNumber(r[key]) }))
      .filter(r => r.date && r.value != null);

    // Sort
    rows.sort((a, b) => (order === 'EARLIEST'
      ? new Date(a.date) - new Date(b.date)
      : new Date(b.date) - new Date(a.date)));

    // Limit
    rows = rows.slice(0, limit);

    // Display (x-axis should go left->right oldest->newest)
    rows.reverse();
    const labels = rows.map(r => r.date);
    const values = rows.map(r => r.value);

    drawChart(indicator, labels, values);
    statusEl.textContent = `Showing ${rows.length} points • ${META[indicator].title}`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Failed to fetch indicator.';
  }
}

fetchBtn.addEventListener('click', fetchIndicator);
document.addEventListener('DOMContentLoaded', fetchIndicator);
