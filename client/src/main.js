import md5 from 'blueimp-md5';
import { apiClient } from './api/apiClient.js';
import { session } from './utils/session.js';
import { renderDeviceTable } from './components/DeviceTable.js';

let tempCredentials = {
    username: '',
    password: ''
};

let selectedLockId = null;

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
        remoteUnlock: document.getElementById('btn-remote-unlock')
    },
    inputs: {
        username: document.getElementById('username'),
        password: document.getElementById('password'),

    },
    table: {
        container: document.getElementById('device-table'),
        bodyId: document.getElementById('device-list-body'),
        emptyText: document.getElementById('no-devices')
    },
    texts: {
        displayClientId: document.getElementById('display-client-id'),
        connectionStatus: document.getElementById('connection-status'),
        selectedLockName: document.getElementById('selected-lock-name')
    },
    cards: {
        config: document.getElementById('config-card'),
        lockActions: document.getElementById('lock-actions')
    }
};

function init() {
    if (session.isAuthenticated()) {
        showDashboard(true);
    } else {
        showLogin();
    }
    setupEventListeners();
}

function showDashboard(isApiConnected = false) {
    ui.screens.login.style.display = 'none';
    ui.screens.dashboard.style.display = 'block';

    if (isApiConnected) {
        ui.texts.displayClientId.innerText = session.getClientId();
        ui.texts.connectionStatus.innerText = "● Sistema Ativo";
        ui.texts.connectionStatus.style.color = "#4CAF50";
        ui.buttons.fetchLocks.disabled = false;
        
        if (ui.cards.config) ui.cards.config.style.display = 'none';
    } else {
        ui.texts.displayClientId.innerText = "Configuração pendente";
        ui.texts.connectionStatus.innerText = "● Aguardando autentificação da API";
        ui.texts.connectionStatus.style.color = "#FFC107";
        ui.buttons.fetchLocks.disabled = true;
    }
}

function showLogin() {
    ui.screens.login.style.display = 'flex';
    ui.screens.dashboard.style.display = 'none';
}

function setupEventListeners() {
    ui.buttons.enterApp.addEventListener('click', handleEnterApp);
    ui.buttons.authenticate.addEventListener('click', handleAuthenticateAPI);
    ui.buttons.logout.addEventListener('click', handleLogout);
    ui.buttons.fetchLocks.addEventListener('click', handleFetchLocks);
    ui.table.bodyId.addEventListener('click', handleLockSelection);
    ui.buttons.remoteUnlock.addEventListener('click', handleRemoteUnlock);
}

function handleEnterApp() {
    const username = ui.inputs.username.value;
    const rawPassword = ui.inputs.password.value;

    if (!username || !rawPassword) {
        alert("Por favor, insira as credenciais da sua conta Pado Digital Locking.");
        return;
    }

    tempCredentials.username = username;
    tempCredentials.password = md5(rawPassword);

    showDashboard(false);
}

async function handleAuthenticateAPI() {
    if (!tempCredentials.username || !tempCredentials.password) {
        alert("Sessão expirada. Por favor faça logout e login novamente.");
        return;
    }

    ui.buttons.authenticate.innerText = "Conectando...";

    const credentials = {
        username: tempCredentials.username,
        password: tempCredentials.password 
    };

    try {
        const data = await apiClient.login(credentials);

        if (data.access_token) {
            session.save(data.access_token);
            showDashboard(true);
            alert("Autentificação bem sucedida!");
        } else {
            alert("Falha no login: " + (data.description || "Cheque suas credenciais."));
        }
    } catch (err) {
        alert("Falha de conexão. Verifique se o servidor está rodando.");
        console.error(err);
    } finally {
        ui.buttons.authenticate.innerText = "Conectar API";
    }
}

function handleLogout() {
    session.clear();
    tempCredentials = { username: '', password: '' };
    location.reload();
}

async function handleFetchLocks() {
    const token = session.getToken();
    ui.buttons.fetchLocks.innerText = "Carregando...";

    try {
        const data = await apiClient.fetchLocks(token);
        const hasLocks = renderDeviceTable(data.list, 'device-list-body');

        if (hasLocks) {
            ui.table.emptyText.style.display = 'none';
            ui.table.container.style.display = 'table';
        } else {
            ui.table.emptyText.innerText = "Não há fechaduras vinculadas a esta conta.";
            ui.table.emptyText.style.display = 'block';
            ui.table.container.style.display = 'none';
        }
    } catch (err) {
        alert("Falha ao tentar encontrar dispositivos.");
        console.error(err);
    } finally {
        ui.buttons.fetchLocks.innerText = "Encontrar Dispositivos";
    }
}

function handleLockSelection(event) {
    if (event.target.classList.contains('select-btn')) {
        const button = event.target;
        selectedLockId = button.getAttribute('data-id');
        const lockName = button.getAttribute('data-name');

        ui.cards.lockActions.style.display = 'block';
        if (ui.texts.selectedLockName) {
            ui.texts.selectedLockName.innerText = lockName;
        }

        const allRows = ui.table.bodyId.querySelectorAll('tr');
        allRows.forEach(row => row.style.backgroundColor = ''); 
        button.closest('tr').style.backgroundColor = '#e6f2ff'; 
    }
}

async function handleRemoteUnlock() {
    if (!selectedLockId) {
        alert("Por favor, selecione uma fechadura primeiro.");
        return;
    }

    const token = session.getToken();
    
    ui.buttons.remoteUnlock.innerText = "Desbloqueando...";
    ui.buttons.remoteUnlock.disabled = true;

    try {
        const data = await apiClient.remoteUnlock(token, selectedLockId);
        
        if (data.errcode === 0) {
            alert("Sucesso! Fechadura desbloqueada.");
        } else {
            alert(`Falha no desbloqueio: ${data.errmsg || data.description || 'Erro desconhecido'}`);
        }
    } catch (err) {
        alert("Erro ao se comunicar com o servidor.");
        console.error(err);
    } finally {
        ui.buttons.remoteUnlock.innerText = "Abertura Remota";
        ui.buttons.remoteUnlock.disabled = false;
    }
}

init();