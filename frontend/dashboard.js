// API base URL
const API_BASE = 'http://127.0.0.1:8002';

// DOM elements
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

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = '/';
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

// Logout handler - FIXED
logoutBtn.addEventListener('click', () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('username');
    // Use absolute path to ensure proper redirect
    window.location.href = '/';
});

// Alternative logout function that you can also use
function logout() {
    console.log('🚪 Logging out user...');
    localStorage.removeItem('username');
    window.location.href = '/';
}

// Also attach logout to window for debugging
window.logout = logout;

// Fetch EBITDA data
fetchDataBtn.addEventListener('click', fetchEBITDA);

tickerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchEBITDA();
    }
});

async function fetchEBITDA() {
    const input = tickerInput.value.trim().toUpperCase();

    if (!input) {
        showError('Please enter stock ticker symbols (e.g., AAPL or AAPL,MSFT,GOOGL)');
        return;
    }

    // Parse multiple tickers
    const tickers = input.split(',').map(t => t.trim()).filter(t => t);

    if (tickers.length === 0) {
        showError('Please enter valid stock ticker symbols');
        return;
    }

    // Show loading, hide other displays
    loadingDiv.classList.remove('d-none');
    dataDisplay.classList.add('d-none');
    errorDisplay.classList.add('d-none');

    try {
        console.log(`🔄 Fetching data for tickers:`, tickers);

        let response;
        let allData;

        if (tickers.length === 1) {
            // Single ticker - use individual endpoint
            response = await fetch(`${API_BASE}/ebitda/${tickers[0]}`);
            allData = [await response.json()];
        } else {
            // Multiple tickers - use batch endpoint
            const tickersParam = tickers.join(',');
            response = await fetch(`${API_BASE}/ebitda/batch/${tickersParam}`);
            allData = await response.json();
        }

        console.log(`📊 Response status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('✅ Data received:', allData);

        // Filter out tickers with no data
        const validData = allData.filter(data => data.ebitda_last_4 && data.ebitda_last_4.length > 0);

        if (validData.length === 0) {
            showError('No EBITDA data found for any of the provided tickers. Try AAPL, MSFT, or GOOGL.');
            return;
        }

        // Display the data
        if (validData.length === 1) {
            // Single company view
            displaySingleCompany(validData[0]);
        } else {
            // Multi-company comparison view
            displayMultiCompanyComparison(validData);
        }

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

function displaySingleCompany(mainData) {
    // Clear existing content
    if (ebitdaTableBody) ebitdaTableBody.innerHTML = '';
    if (competitorCards) competitorCards.innerHTML = '';

    // Display metrics for single company
    displayMetrics([mainData]);

    // Display table data
    displayTableData(mainData);

    // Create charts for single company
    createSingleCompanyCharts(mainData);

    // Update titles
    updateTitles(`${mainData.ticker} Analysis`);

    // Show data display
    dataDisplay.classList.remove('d-none');
}

function displayMultiCompanyComparison(allData) {
    // Clear existing content
    if (ebitdaTableBody) ebitdaTableBody.innerHTML = '';
    if (metricsRow) metricsRow.innerHTML = '';

    // Display comparison metrics
    displayComparisonMetrics(allData);

    // Create comparison charts
    createComparisonCharts(allData);

    // Display competitor cards for all companies
    displayAllCompanies(allData);

    // Update titles
    updateTitles(`Multi-Company Comparison (${allData.map(d => d.ticker).join(', ')})`);

    // Show data display
    dataDisplay.classList.remove('d-none');
}

function displayMetrics(companies) {
    if (!metricsRow || companies.length === 0) return;

    const company = companies[0];
    const ebitdaData = company.ebitda_last_4;

    const currentEBITDA = ebitdaData[0];
    const previousEBITDA = ebitdaData[1] || currentEBITDA;
    const growth = previousEBITDA ? ((currentEBITDA - previousEBITDA) / previousEBITDA * 100).toFixed(1) : 0;
    const averageEBITDA = ebitdaData.reduce((a, b) => a + b, 0) / ebitdaData.length;

    metricsRow.innerHTML = `
        <div class="col-md-3">
            <div class="metric-card">
                <div class="metric-value">$${currentEBITDA.toLocaleString()}</div>
                <div class="metric-label">Current Quarter EBITDA</div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="metric-card" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
                <div class="metric-value ${growth >= 0 ? 'trend-up' : 'trend-down'}">${growth}%</div>
                <div class="metric-label">Quarterly Growth</div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="metric-card" style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);">
                <div class="metric-value">$${averageEBITDA.toLocaleString()}</div>
                <div class="metric-label">Average EBITDA</div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="metric-card" style="background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);">
                <div class="metric-value">${company.ebitda_last_4.length}</div>
                <div class="metric-label">Quarters Analyzed</div>
            </div>
        </div>
    `;
}

function displayComparisonMetrics(companies) {
    if (!metricsRow) return;

    // Show simple count of companies being compared
    metricsRow.innerHTML = `
        <div class="col-md-12">
            <div class="metric-card">
                <div class="metric-value">${companies.length} Companies</div>
                <div class="metric-label">Comparing: ${companies.map(c => c.ticker).join(', ')}</div>
            </div>
        </div>
    `;
}

function displayTableData(company) {
    if (!ebitdaTableBody) return;

    ebitdaTableBody.innerHTML = '';

    company.ebitda_last_4.forEach((value, index) => {
        const previousValue = company.ebitda_last_4[index + 1];
        const change = previousValue ? value - previousValue : 0;
        const changePercent = previousValue ? ((change / previousValue) * 100).toFixed(1) : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Quarter ${company.ebitda_last_4.length - index}</td>
            <td>$${value.toLocaleString()}</td>
            <td class="${change >= 0 ? 'trend-up' : 'trend-down'}">
                ${change >= 0 ? '+' : ''}${change.toLocaleString()} (${change >= 0 ? '+' : ''}${changePercent}%)
            </td>
            <td>
                <span class="${change >= 0 ? 'trend-up' : 'trend-down'}">
                    ${change >= 0 ? '↗' : '↘'}
                </span>
            </td>
        `;
        ebitdaTableBody.appendChild(row);
    });
}

function createSingleCompanyCharts(company) {
    // Destroy existing charts
    if (ebitdaChart) ebitdaChart.destroy();
    if (comparisonChart) comparisonChart.destroy();

    // Create main EBITDA chart
    const ebitdaCtx = document.getElementById('ebitdaChart');
    if (ebitdaCtx) {
        const quarters = ['Q4', 'Q3', 'Q2', 'Q1'].slice(-company.ebitda_last_4.length).reverse();
        const ebitdaValues = [...company.ebitda_last_4].reverse();

        ebitdaChart = new Chart(ebitdaCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: quarters,
                datasets: [{
                    label: `${company.ticker} EBITDA`,
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
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'EBITDA ($)'
                        }
                    }
                }
            }
        });
    }

    // Create simple bar chart for single company
    const comparisonCtx = document.getElementById('comparisonChart');
    if (comparisonCtx) {
        comparisonChart = new Chart(comparisonCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Latest Quarter'],
                datasets: [{
                    label: company.ticker,
                    data: [company.ebitda_last_4[0]],
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
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'EBITDA ($)'
                        }
                    }
                }
            }
        });
    }
}

function createComparisonCharts(companies) {
    // Destroy existing charts
    if (ebitdaChart) ebitdaChart.destroy();
    if (comparisonChart) comparisonChart.destroy();

    // Create comparison line chart
    const ebitdaCtx = document.getElementById('ebitdaChart');
    if (ebitdaCtx) {
        const quarters = ['Q4', 'Q3', 'Q2', 'Q1'].slice(-4).reverse();
        const colors = ['#667eea', '#28a745', '#ffc107', '#dc3545', '#6f42c1'];

        const datasets = companies.map((company, index) => ({
            label: company.ticker,
            data: [...company.ebitda_last_4].reverse(),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            borderWidth: 3,
            fill: false,
            tension: 0.4
        }));

        ebitdaChart = new Chart(ebitdaCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: quarters,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Multi-Company EBITDA Trends'
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'EBITDA ($)'
                        }
                    }
                }
            }
        });
    }

    // Create comparison bar chart
    const comparisonCtx = document.getElementById('comparisonChart');
    if (comparisonCtx) {
        const colors = ['#667eea', '#28a745', '#ffc107', '#dc3545', '#6f42c1'];

        const datasets = companies.map((company, index) => ({
            label: company.ticker,
            data: [company.ebitda_last_4[0]],
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 2
        }));

        comparisonChart = new Chart(comparisonCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Latest Quarter'],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Current Quarter Comparison'
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'EBITDA ($)'
                        }
                    }
                }
            }
        });
    }
}

function displayAllCompanies(companies) {
    if (!competitorCards) return;

    competitorCards.innerHTML = '';

    companies.forEach(company => {
        const currentEBITDA = company.ebitda_last_4[0];
        const previousEBITDA = company.ebitda_last_4[1] || currentEBITDA;
        const growth = previousEBITDA ? ((currentEBITDA - previousEBITDA) / previousEBITDA * 100).toFixed(1) : 0;

        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-3 mb-3';
        card.innerHTML = `
            <div class="card competitor-card h-100">
                <div class="card-body">
                    <h6 class="card-title">${company.ticker}</h6>
                    <div class="metric-value">$${currentEBITDA.toLocaleString()}</div>
                    <div class="metric-label">Current EBITDA</div>
                    <div class="mt-2 ${growth >= 0 ? 'trend-up' : 'trend-down'}">
                        <small>Quarterly Growth: ${growth >= 0 ? '+' : ''}${growth}%</small>
                    </div>
                </div>
            </div>
        `;
        competitorCards.appendChild(card);
    });
}

function updateTitles(title) {
    const mainChartTitle = document.getElementById('mainChartTitle');
    const tableTitle = document.getElementById('tableTitle');

    if (mainChartTitle) mainChartTitle.textContent = title;
    if (tableTitle) tableTitle.textContent = title;
}

function showError(message) {
    console.error('🚨 Error:', message);
    if (errorMessage && errorDisplay) {
        errorMessage.textContent = message;
        errorDisplay.classList.remove('d-none');
    }
}

// Test function for console
window.testAPI = async function(tickers = 'AAPL,MSFT') {
    try {
        const response = await fetch(`${API_BASE}/ebitda/batch/${tickers}`);
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Data:', data);
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
};

// Debug function to check login status
window.checkLoginStatus = function() {
    const username = localStorage.getItem('username');
    console.log('🔐 Login status:', username ? `Logged in as ${username}` : 'Not logged in');
    return username;
};