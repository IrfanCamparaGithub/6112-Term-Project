// API base URL
const API_BASE = 'http://127.0.0.1:8002';

// DOM elements - updated for your HTML structure
const welcomeUser = document.getElementById('welcomeUser');
const logoutBtn = document.getElementById('logoutBtn');
const fetchDataBtn = document.getElementById('fetchDataBtn');
const tickerInput = document.getElementById('tickerInput');
const loadingDiv = document.getElementById('loading');
const dataDisplay = document.getElementById('dataDisplay');
const errorDisplay = document.getElementById('errorDisplay');
const errorMessage = document.getElementById('errorMessage');
const metricsRow = document.getElementById('metricsRow');
const ebitdaTableBody = document.getElementById('ebitdaTableBody');
const competitorCards = document.getElementById('competitorCards');

// Chart instances
let ebitdaChart = null;
let comparisonChart = null;

// Common competitors by sector
const COMPETITOR_MAP = {
    'AAPL': ['MSFT', 'GOOGL', 'AMZN'],
    'MSFT': ['AAPL', 'GOOGL', 'AMZN'],
    'GOOGL': ['MSFT', 'AAPL', 'META'],
    'AMZN': ['AAPL', 'MSFT', 'WMT'],
    'TSLA': ['F', 'GM', 'RIVN'],
    'META': ['GOOGL', 'SNAP', 'TWTR'],
    'NFLX': ['DIS', 'CMCSA', 'PARA']
};

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = 'index.html';
        return;
    }

    if (welcomeUser) {
        welcomeUser.textContent = `Welcome, ${username}!`;
    }

    // Auto-load AAPL data on page load
    setTimeout(() => {
        fetchEBITDA();
    }, 1000);
});

// Logout handler
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('username');
    window.location.href = 'index.html';
});

// Fetch EBITDA data
fetchDataBtn.addEventListener('click', fetchEBITDA);

tickerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchEBITDA();
    }
});

async function fetchEBITDA() {
    const ticker = tickerInput.value.trim().toUpperCase();

    if (!ticker) {
        showError('Please enter a stock ticker symbol (e.g., AAPL, MSFT, GOOGL)');
        return;
    }

    // Show loading, hide other displays
    loadingDiv.classList.remove('d-none');
    dataDisplay.classList.add('d-none');
    errorDisplay.classList.add('d-none');

    try {
        console.log(`🔄 Fetching data for ${ticker}`);

        const response = await fetch(`${API_BASE}/ebitda/${ticker}`);

        console.log(`📊 Response status: ${response.status}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`API endpoint not found. Check if server is running on port 8002.`);
            } else if (response.status === 500) {
                throw new Error(`Server error. Check server logs.`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }

        const data = await response.json();
        console.log('✅ Data received:', data);

        // For now, just display basic data without competitors
        displayBasicEBITDA(data);

    } catch (error) {
        console.error('💥 Fetch error:', error);

        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showError(`Cannot connect to server. Make sure FastAPI is running on port 8002.`);
        } else {
            showError(`Failed to fetch data: ${error.message}`);
        }
    } finally {
        loadingDiv.classList.add('d-none');
    }
}

function displayBasicEBITDA(data) {
    // Clear existing table
    if (ebitdaTableBody) {
        ebitdaTableBody.innerHTML = '';
    }

    if (data.ebitda_last_4 && data.ebitda_last_4.length > 0) {
        // Display in table
        data.ebitda_last_4.forEach((value, index) => {
            const previousValue = data.ebitda_last_4[index + 1];
            const change = previousValue ? value - previousValue : 0;
            const changePercent = previousValue ? ((change / previousValue) * 100).toFixed(1) : 0;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Quarter ${data.ebitda_last_4.length - index}</td>
                <td>$${value.toLocaleString()}M</td>
                <td class="${change >= 0 ? 'trend-up' : 'trend-down'}">
                    ${change >= 0 ? '+' : ''}${change.toLocaleString()}M (${change >= 0 ? '+' : ''}${changePercent}%)
                </td>
                <td>
                    <span class="${change >= 0 ? 'trend-up' : 'trend-down'}">
                        ${change >= 0 ? '↗' : '↘'}
                    </span>
                </td>
            `;
            if (ebitdaTableBody) {
                ebitdaTableBody.appendChild(row);
            }
        });

        // Update titles
        const mainChartTitle = document.getElementById('mainChartTitle');
        const tableTitle = document.getElementById('tableTitle');

        if (mainChartTitle) mainChartTitle.textContent = `${data.ticker} - EBITDA Trend`;
        if (tableTitle) tableTitle.textContent = `${data.ticker} - Quarterly EBITDA Details`;

        // Show data display
        if (dataDisplay) {
            dataDisplay.classList.remove('d-none');
        }

        // Create simple charts
        createSimpleCharts(data);

    } else {
        showError(`No EBITDA data available for ${data.ticker}`);
    }
}

function createSimpleCharts(data) {
    // Destroy existing charts
    if (ebitdaChart) {
        ebitdaChart.destroy();
    }
    if (comparisonChart) {
        comparisonChart.destroy();
    }

    // Create main EBITDA chart
    const ebitdaCtx = document.getElementById('ebitdaChart');
    if (ebitdaCtx) {
        const quarters = ['Q4', 'Q3', 'Q2', 'Q1'].slice(-data.ebitda_last_4.length).reverse();
        const ebitdaValues = [...data.ebitda_last_4].reverse();

        ebitdaChart = new Chart(ebitdaCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: quarters,
                datasets: [{
                    label: `${data.ticker} EBITDA ($M)`,
                    data: ebitdaValues,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Quarterly EBITDA Trend'
                    }
                }
            }
        });
    }

    // Create simple comparison chart (just the main company for now)
    const comparisonCtx = document.getElementById('comparisonChart');
    if (comparisonCtx) {
        comparisonChart = new Chart(comparisonCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Latest Quarter'],
                datasets: [{
                    label: data.ticker,
                    data: [data.ebitda_last_4[0]],
                    backgroundColor: '#667eea',
                    borderColor: '#667eea',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Current Quarter EBITDA'
                    }
                }
            }
        });
    }
}

function showError(message) {
    console.error('🚨 Error:', message);
    if (errorMessage && errorDisplay) {
        errorMessage.textContent = message;
        errorDisplay.classList.remove('d-none');
    }
}

// Test function for console
window.testAPI = async function() {
    try {
        const response = await fetch(`${API_BASE}/ebitda/AAPL`);
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Data:', data);
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
};