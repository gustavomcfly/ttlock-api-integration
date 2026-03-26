import loginHtml from './pages/login.html?raw';
import sidebarHtml from './pages/sidebar.html?raw';
import topbarHtml from './pages/topbar.html?raw';
import homeHtml from './pages/home.html?raw';
import lockHtml from './pages/lock.html?raw';
import passcodeHtml from './pages/passcode.html?raw'; 

document.getElementById('app').innerHTML = `
    ${loginHtml}
    <div id="dashboard" style="display: none;" class="flex flex-col min-h-screen relative">
        ${sidebarHtml}
        ${topbarHtml}
        <main class="container mx-auto max-w-5xl p-4 sm:p-6 mt-2 flex-1 relative">
            ${homeHtml}
            ${lockHtml}
            ${passcodeHtml}
        </main>
    </div>
`;

import { session } from './utils/session.js';
import { appState } from './state/appState.js';
import { LoginScreen } from './components/LoginScreen.js';
import { DeviceTable } from './components/DeviceTable.js';
import { ActionPanel } from './components/ActionPanel.js';
import { PasscodePanel } from './components/PasscodePanel.js'; 

const dashboardElement = document.getElementById('dashboard');
const btnLogout = document.getElementById('btn-logout');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnOpenSidebar = document.getElementById('btn-open-sidebar');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const btnSidebarHome = document.getElementById('btn-sidebar-home'); 

const viewHome = document.getElementById('view-home');
const viewLock = document.getElementById('view-lock');
const viewPasscode = document.getElementById('view-passcode'); 
const btnBackHome = document.getElementById('btn-back-home');
const btnBackLock = document.getElementById('btn-back-lock'); 

function init() {
    let actionPanel;
    let passcodePanel;

    try { actionPanel = new ActionPanel(); } catch(e) { console.error('ActionPanel init error:', e); }
    try { passcodePanel = new PasscodePanel(); } catch(e) { console.error('PasscodePanel init error:', e); } 
    
    const deviceTable = new DeviceTable((lockId, lockName) => {
        navigateToLockView(lockId, lockName);
    });
    
    const loginScreen = new LoginScreen(() => {
        deviceTable.enable(); 
        showDashboard(); 
        deviceTable.fetchLocks(); 
    });

    if (btnLogout) btnLogout.addEventListener('click', handleLogout);
    if (btnOpenSidebar) btnOpenSidebar.addEventListener('click', openSidebar);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    
    if (btnBackHome) {
        btnBackHome.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToHomeView();
        });
    }

    if (btnBackLock) {
        btnBackLock.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToLockViewFromPasscode();
        });
    }

    document.addEventListener('navigate-passcode', () => {
        if (passcodePanel) passcodePanel.syncLock();
    });

    if (btnSidebarHome) {
        btnSidebarHome.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();
            navigateToHomeView();
        });
    }

    if (session.isAuthenticated()) {
        loginScreen.hide(); 
        deviceTable.enable();
        showDashboard();
        deviceTable.fetchLocks();
    } else {
        loginScreen.show();
    }
}

function navigateToLockView(lockId, lockName) {
    document.getElementById('lock-view-name').innerText = lockName;
    document.getElementById('lock-view-id').innerText = lockId;
    
    if (viewHome && viewLock) {
        viewHome.classList.add('hidden');
        if (viewPasscode) viewPasscode.classList.add('hidden'); // hide passcode
        viewLock.classList.remove('hidden');

        try {
            document.getElementById('btn-refresh-details').click();
        } catch(e) {}
    }
}

function navigateToLockViewFromPasscode() {
    if (viewPasscode) viewPasscode.classList.add('hidden');
    if (viewLock) viewLock.classList.remove('hidden');
}

function navigateToHomeView() {
    try {
        if (typeof appState.clearLock === 'function') {
            appState.clearLock(); 
        } else {
            appState.setLock(null, null);
        }
    } catch (e) {}
    
    if (viewHome && viewLock) {
        viewLock.classList.add('hidden');
        if (viewPasscode) viewPasscode.classList.add('hidden');
        viewHome.classList.remove('hidden');
    }
}

function openSidebar() {
    sidebarOverlay.classList.remove('hidden');
    setTimeout(() => {
        sidebarOverlay.classList.remove('opacity-0');
        sidebar.classList.remove('-translate-x-full');
    }, 10);
}

function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('opacity-0');
    setTimeout(() => {
        sidebarOverlay.classList.add('hidden');
    }, 300); 
}

function showDashboard() {
    dashboardElement.style.display = 'flex';
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
        statusEl.innerText = "● Online";
        statusEl.classList.remove('bg-yellow-100', 'text-yellow-800');
        statusEl.classList.add('bg-green-100', 'text-green-800');
    }
}

function handleLogout() {
    session.clear();
    appState.clear();
    location.reload();
}

init();
