import { session } from './utils/session.js';
import { appState } from './state/appState.js';

import { LoginScreen } from './components/LoginScreen.js';
import { DeviceTable } from './components/DeviceTable.js';
import { ActionPanel } from './components/ActionPanel.js';

const dashboardElement = document.getElementById('dashboard');
const btnLogout = document.getElementById('btn-logout');

// Sidebar Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnOpenSidebar = document.getElementById('btn-open-sidebar');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const btnSidebarHome = document.getElementById('btn-sidebar-home'); // <-- New

// View Elements
const viewHome = document.getElementById('view-home');
const viewLock = document.getElementById('view-lock');
const btnBackHome = document.getElementById('btn-back-home');

function init() {
    // Initialize ActionPanel safely
    let actionPanel;
    try { actionPanel = new ActionPanel(); } catch(e) { console.error("ActionPanel init error:", e); }
    
    const deviceTable = new DeviceTable((lockId, lockName) => {
        navigateToLockView(lockId, lockName);
    });
    
    const loginScreen = new LoginScreen(() => {
        deviceTable.enable(); 
        showDashboard(); 
        deviceTable.fetchLocks(); 
    });

    // Attach Event Listeners
    if (btnLogout) btnLogout.addEventListener('click', handleLogout);
    if (btnOpenSidebar) btnOpenSidebar.addEventListener('click', openSidebar);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Fix: Back Button
    if (btnBackHome) {
        btnBackHome.addEventListener('click', (e) => {
            e.preventDefault(); // Prevents default browser behaviors
            navigateToHomeView();
        });
    }

    // Fix: Sidebar Home Button
    if (btnSidebarHome) {
        btnSidebarHome.addEventListener('click', (e) => {
            e.preventDefault(); // Prevents the "#" link from jumping the page
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
    
    viewHome.classList.add('hidden');
    viewLock.classList.remove('hidden');
}

function navigateToHomeView() {
    appState.clearLock(); 
    
    viewLock.classList.add('hidden');
    viewHome.classList.remove('hidden');
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