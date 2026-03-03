import md5 from 'blueimp-md5';
import { apiClient } from './api/apiClient.js';
import { session } from './utils/session.js';
import { renderDeviceTable } from './components/DeviceTable.js';

// Temporary storage for user credentials before API authentication
let tempCredentials = {
    username: '',
    password: '' // Stored as MD5 hash immediately for better security in memory
};

// 1. Cached DOM Elements
const ui = {
    screens: {
        login: document.getElementById('login-screen'),
        dashboard: document.getElementById('dashboard'),
    },
    buttons: {
        enterApp: document.getElementById('btn-enter-app'),
        authenticate: document.getElementById('btn-authenticate'),
        logout: document.getElementById('btn-logout'),
        fetchLocks: document.getElementById('btn-fetch-locks'),
    },
    inputs: {
        username: document.getElementById('username'),
        password: document.getElementById('password'),
        clientId: document.getElementById('clientId'),
        clientSecret: document.getElementById('clientSecret')
    },
    table: {
        container: document.getElementById('device-table'),
        bodyId: 'device-list-body',
        emptyText: document.getElementById('no-devices')
    },
    texts: {
        displayClientId: document.getElementById('display-client-id'),
        connectionStatus: document.getElementById('connection-status')
    },
    cards: {
        config: document.getElementById('config-card')
    }
};

// 2. Initialization
function init() {
    if (session.isAuthenticated()) {
        showDashboard(true);
    } else {
        showLogin();
    }
    setupEventListeners();
}

// 3. View Controllers
function showDashboard(isApiConnected = false) {
    ui.screens.login.style.display = 'none';
    ui.screens.dashboard.style.display = 'block';

    if (isApiConnected) {
        ui.texts.displayClientId.innerText = session.getClientId();
        ui.texts.connectionStatus.innerText = "● System Active";
        ui.texts.connectionStatus.style.color = "#4CAF50"; // Green
        ui.buttons.fetchLocks.disabled = false;
        ui.cards.config.style.display = 'none'; // Hide config card once connected
    } else {
        ui.texts.displayClientId.innerText = "Pending Configuration";
        ui.texts.connectionStatus.innerText = "● Waiting for API Auth";
        ui.texts.connectionStatus.style.color = "#FFC107"; // Yellow
        ui.buttons.fetchLocks.disabled = true;
    }
}

function showLogin() {
    ui.screens.login.style.display = 'flex';
    ui.screens.dashboard.style.display = 'none';
}

// 4. Events
function setupEventListeners() {
    ui.buttons.enterApp.addEventListener('click', handleEnterApp);
    ui.buttons.authenticate.addEventListener('click', handleAuthenticateAPI);
    ui.buttons.logout.addEventListener('click', () => {
        session.clear();
        tempCredentials = { username: '', password: '' };
        location.reload();
    });
    ui.buttons.fetchLocks.addEventListener('click', handleFetchLocks);
}

// 5. Business Logic (Handlers)

// Step 1: User logs into the local app using TTLock account details
function handleEnterApp() {
    const username = ui.inputs.username.value;
    const rawPassword = ui.inputs.password.value;

    if (!username || !rawPassword) {
        alert("Please enter your TTLock username and password.");
        return;
    }

    // Save in memory temporarily to use with the API call later
    tempCredentials.username = username;
    tempCredentials.password = md5(rawPassword); 

    // Move to dashboard, but API is not connected yet
    showDashboard(false);
}

// Step 2: User provides Client ID/Secret in the dashboard to authenticate with TTLock API
async function handleAuthenticateAPI() {
    const clientId = ui.inputs.clientId.value;
    const clientSecret = ui.inputs.clientSecret.value;

    if (!clientId || !clientSecret) {
        alert("Please provide the Client ID and Client Secret.");
        return;
    }

    if (!tempCredentials.username || !tempCredentials.password) {
        alert("Session expired. Please log out and enter your username/password again.");
        return;
    }

    ui.buttons.authenticate.innerText = "Connecting...";

    const credentials = {
        clientId,
        clientSecret,
        username: tempCredentials.username,
        password: tempCredentials.password // already MD5 hashed from Step 1
    };

    try {
        const data = await apiClient.login(credentials);

        if (data.access_token) {
            session.save(data.access_token, credentials.clientId);
            showDashboard(true); // Update UI to reflect active connection
            alert("API Authenticated Successfully!");
        } else {
            alert("Login failed: " + (data.description || "Check your credentials."));
        }
    } catch (err) {
        alert("Connection error. Is the Proxy Server (Port 3001) running?");
    } finally {
        ui.buttons.authenticate.innerText = "Connect API";
    }
}

async function handleFetchLocks() {
    const token = session.getToken();
    const clientId = session.getClientId();
    ui.buttons.fetchLocks.innerText = "Loading...";

    try {
        const data = await apiClient.fetchLocks(clientId, token);
        const hasLocks = renderDeviceTable(data.list, ui.table.bodyId);

        if (hasLocks) {
            ui.table.emptyText.style.display = 'none';
            ui.table.container.style.display = 'table';
        } else {
            ui.table.emptyText.innerText = "No locks bound to this account.";
            ui.table.emptyText.style.display = 'block';
        }
    } catch (err) {
        alert("Error fetching device list.");
    } finally {
        ui.buttons.fetchLocks.innerText = "Fetch Device List";
    }
}

// Start the application
init();