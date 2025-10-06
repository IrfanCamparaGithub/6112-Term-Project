// API base URL
const API_BASE = 'http://127.0.0.1:8002';

// DOM elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerModal = document.getElementById('registerModal');
const registerLink = document.getElementById('registerLink');
const cancelRegister = document.getElementById('cancelRegister');
const messageDiv = document.getElementById('message');
const registerMessageDiv = document.getElementById('registerMessage');

// Show message function
function showMessage(message, type, element) {
    element.textContent = message;
    element.className = `p-4 rounded-lg backdrop-blur-sm border ${
        type === 'success' 
            ? 'bg-green-500/10 border-green-500/20 text-green-300' 
            : 'bg-red-500/10 border-red-500/20 text-red-300'
    }`;
    element.classList.remove('hidden');

    if (type === 'success') {
        setTimeout(() => {
            element.classList.add('hidden');
        }, 3000);
    }
}

// Show register modal
registerLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerModal.classList.remove('hidden');
});

// Hide register modal
cancelRegister.addEventListener('click', () => {
    registerModal.classList.add('hidden');
    registerMessageDiv.classList.add('hidden');
});

// Close modal when clicking outside
registerModal.addEventListener('click', (e) => {
    if (e.target === registerModal) {
        registerModal.classList.add('hidden');
        registerMessageDiv.classList.add('hidden');
    }
});

// Login form handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/login_user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: username,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('✓ Login successful! Redirecting...', 'success', messageDiv);
            // Store username for the main page
            localStorage.setItem('username', username);
            // Redirect to main page
            setTimeout(() => {
                window.location.href = '/main.html';
            }, 1500);
        } else {
            showMessage('✗ ' + (data.detail || 'Login failed'), 'danger', messageDiv);
        }
    } catch (error) {
        showMessage('✗ Network error. Please try again.', 'danger', messageDiv);
    }
});

// Register form handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch(`${API_BASE}/register_user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: username,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('✓ Registration successful! You can now login.', 'success', registerMessageDiv);
            // Clear form and close modal after success
            setTimeout(() => {
                registerForm.reset();
                registerModal.classList.add('hidden');
                registerMessageDiv.classList.add('hidden');
            }, 2000);
        } else {
            showMessage('✗ ' + (data.detail || 'Registration failed'), 'danger', registerMessageDiv);
        }
    } catch (error) {
        showMessage('✗ Network error. Please try again.', 'danger', registerMessageDiv);
    }
});