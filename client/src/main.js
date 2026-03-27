import loginHtml from "./pages/login.html?raw";
import sidebarHtml from "./pages/sidebar.html?raw";
import topbarHtml from "./pages/topbar.html?raw";
import homeHtml from "./pages/home.html?raw";
import lockHtml from "./pages/lock.html?raw";
import passcodeHtml from "./pages/passcode.html?raw";
import rfidHtml from "./pages/rfid.html?raw";
import testsHtml from "./pages/tests.html?raw";
import reportsHtml from "./pages/reports.html?raw";
import lockSettingsHtml from "./pages/lockSettings.html?raw";
import fingerprintHtml from "./pages/fingerprint.html?raw";

// --- INJECT HTML ---
document.getElementById("app").innerHTML = `
    ${loginHtml}
    <div id="dashboard" style="display: none;" class="flex flex-col min-h-screen relative">
        ${sidebarHtml}
        ${topbarHtml}
        <main class="container mx-auto max-w-5xl p-4 sm:p-6 mt-2 flex-1 relative">
            ${homeHtml}
            ${lockHtml}
            ${passcodeHtml}
            ${rfidHtml}
            ${fingerprintHtml}
            ${testsHtml}
            ${reportsHtml}
            ${lockSettingsHtml}
        </main>
    </div>
`;

import { session } from "./utils/session.js";
import { appState } from "./state/appState.js";
import { LoginScreen } from "./components/LoginScreen.js";
import { DeviceTable } from "./components/DeviceTable.js";
import { ActionPanel } from "./components/ActionPanel.js";
import { PasscodePanel } from "./components/PasscodePanel.js";
import { RfidPanel } from "./components/RfidPanel.js";
import { TestsPanel } from "./components/TestsPanel.js";
import { FingerprintPanel } from "./components/FingerprintPanel.js";

// --- DOM ELEMENTS ---
const dashboardElement = document.getElementById("dashboard");
const btnLogout = document.getElementById("btn-logout");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const btnOpenSidebar = document.getElementById("btn-open-sidebar");
const btnCloseSidebar = document.getElementById("btn-close-sidebar");
const viewFingerprint = document.getElementById("view-fingerprint");
const btnGoFingerprint = document.getElementById("btn-go-fingerprint");
const btnBackLockFromFingerprint = document.getElementById(
  "btn-back-lock-fingerprint",
);

// Sidebar Nav Buttons
const btnSidebarHome = document.getElementById("btn-sidebar-home");
const btnSidebarTests = document.getElementById("btn-sidebar-tests");
const btnSidebarReports = document.getElementById("btn-sidebar-reports");

// Views
const viewHome = document.getElementById("view-home");
const viewLock = document.getElementById("view-lock");
const viewPasscode = document.getElementById("view-passcode");
const viewRfid = document.getElementById("view-rfid");
const viewTests = document.getElementById("view-tests");
const viewReports = document.getElementById("view-reports");
const viewLockSettings = document.getElementById("view-lock-settings");

// Navigation Buttons
const btnTopbarHome = document.getElementById("btn-topbar-home");
const btnBackHome = document.getElementById("btn-back-home");
const btnBackLockFromPasscode = document.getElementById("btn-back-lock");
const btnBackLockFromRfid = document.getElementById("btn-back-lock-rfid");
const btnGoLockSettings = document.getElementById("btn-go-lock-settings");
const btnBackLockFromSettings = document.getElementById(
  "btn-back-lock-dashboard",
);
const btnGoRfid = document.getElementById("btn-go-rfid");

let testsPanel;

function init() {
  // --- INSTANTIATE COMPONENTS ---
  let actionPanel;
  let passcodePanel;
  let rfidPanel;
  let fingerprintPanel;

  try {
    actionPanel = new ActionPanel();
  } catch (e) {
    console.error("ActionPanel init error:", e);
  }
  try {
    passcodePanel = new PasscodePanel();
  } catch (e) {
    console.error("PasscodePanel init error:", e);
  }
  try {
    rfidPanel = new RfidPanel();
  } catch (e) {
    console.error("RfidPanel init error:", e);
  }
  try {
    testsPanel = new TestsPanel();
  } catch (e) {
    console.error("TestsPanel init error:", e);
  }
  try {
    fingerprintPanel = new FingerprintPanel();
  } catch (e) {
    console.error("FingerprintPanel init error:", e);
  }

  const deviceTable = new DeviceTable((lockId, lockName) => {
    navigateToLockView(lockId, lockName);
  });

  const loginScreen = new LoginScreen(() => {
    deviceTable.enable();
    showDashboard();
    deviceTable.fetchLocks();
    navigateToHomeView();
  });

  // --- GLOBAL EVENTS ---
  if (btnLogout) btnLogout.addEventListener("click", handleLogout);
  if (btnOpenSidebar) btnOpenSidebar.addEventListener("click", openSidebar);
  if (btnCloseSidebar) btnCloseSidebar.addEventListener("click", closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

  // --- TOPBAR/GLOBAL ROUTING ---
  if (btnTopbarHome) {
    btnTopbarHome.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToHomeView();
    });
  }

  // --- HOME VIEW ROUTING ---
  if (btnBackHome) {
    btnBackHome.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToHomeView();
    });
  }

  // --- LOCK VIEW ROUTING ---
  if (btnGoLockSettings) {
    btnGoLockSettings.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToLockSettingsView();
    });
  }

  if (btnGoRfid) {
    btnGoRfid.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllViews();
      if (viewRfid) viewRfid.classList.remove("hidden");
      if (rfidPanel) rfidPanel.syncLock();
    });
  }

  if (btnGoFingerprint) {
    btnGoFingerprint.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllViews();
      if (viewFingerprint) viewFingerprint.classList.remove("hidden");
      if (fingerprintPanel) fingerprintPanel.syncLock();
    });
  }

  // --- SUB-VIEW ROUTING (BACK BUTTONS) ---
  if (btnBackLockFromPasscode) {
    btnBackLockFromPasscode.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToLockViewFromSubView();
    });
  }

  if (btnBackLockFromRfid) {
    btnBackLockFromRfid.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToLockViewFromSubView();
    });
  }

  if (btnBackLockFromFingerprint) {
    btnBackLockFromFingerprint.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToLockViewFromSubView();
    });
  }

  if (btnBackLockFromSettings) {
    btnBackLockFromSettings.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToLockViewFromSubView();
    });
  }

  document.addEventListener("navigate-passcode", () => {
    if (passcodePanel) passcodePanel.syncLock();
  });

  // --- SIDEBAR ROUTING ---
  if (btnSidebarHome) {
    btnSidebarHome.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();
      navigateToHomeView();
    });
  }

  if (btnSidebarTests) {
    btnSidebarTests.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();
      navigateToTestsView();
    });
  }

  if (btnSidebarReports) {
    btnSidebarReports.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();
      navigateToReportsView();
    });
  }

  // --- INITIALIZATION CHECK ---
  if (session.isAuthenticated()) {
    loginScreen.hide();
    deviceTable.enable();
    showDashboard();
    deviceTable.fetchLocks();
    navigateToHomeView();
  } else {
    loginScreen.show();
  }
}

// --- SIDEBAR HIGHLIGHT LOGIC ---
function updateSidebarActiveState(activeId) {
  const links = document.querySelectorAll(".sidebar-link");
  links.forEach((link) => {
    if (link.id === activeId) {
      link.className =
        "sidebar-link px-4 py-3 rounded-lg bg-primary/10 text-primary font-semibold transition-colors";
    } else {
      link.className =
        "sidebar-link px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";
    }
  });
}

// --- ROUTING FUNCTIONS ---

function hideAllViews() {
  const views = [
    viewHome,
    viewLock,
    viewPasscode,
    viewRfid,
    viewFingerprint,
    viewTests,
    viewReports,
    viewLockSettings,
  ];
  views.forEach((view) => {
    if (view) view.classList.add("hidden");
  });
}

function navigateToHomeView() {
  try {
    appState.clearLock();
  } catch (e) {}
  hideAllViews();
  if (viewHome) viewHome.classList.remove("hidden");
  updateSidebarActiveState("btn-sidebar-home");
}

function navigateToLockView(lockId, lockName) {
  document.getElementById("lock-view-name").innerText = lockName;
  document.getElementById("lock-view-id").innerText = lockId;

  hideAllViews();
  if (viewLock) viewLock.classList.remove("hidden");

  updateSidebarActiveState("btn-sidebar-home");

  try {
    document.getElementById("btn-refresh-details").click();
  } catch (e) {}
}

function navigateToLockViewFromSubView() {
  hideAllViews();
  if (viewLock) viewLock.classList.remove("hidden");
  updateSidebarActiveState("btn-sidebar-home");
}

function navigateToLockSettingsView() {
  const nameEl = document.getElementById("lock-settings-name");
  if (nameEl && appState.selectedLockName) {
    nameEl.innerText = appState.selectedLockName;
  }
  hideAllViews();
  if (viewLockSettings) viewLockSettings.classList.remove("hidden");
  updateSidebarActiveState("btn-sidebar-home");
}

function navigateToTestsView() {
  if (testsPanel && typeof testsPanel.reset === "function") {
    testsPanel.reset();
  }
  hideAllViews();
  if (viewTests) viewTests.classList.remove("hidden");
  updateSidebarActiveState("btn-sidebar-tests");
}

function navigateToReportsView() {
  hideAllViews();
  if (viewReports) viewReports.classList.remove("hidden");
  updateSidebarActiveState("btn-sidebar-reports");
}

// --- UI FUNCTIONS ---

function openSidebar() {
  sidebarOverlay.classList.remove("hidden");
  setTimeout(() => {
    sidebarOverlay.classList.remove("opacity-0");
    sidebar.classList.remove("-translate-x-full");
  }, 10);
}

function closeSidebar() {
  sidebar.classList.add("-translate-x-full");
  sidebarOverlay.classList.add("opacity-0");
  setTimeout(() => {
    sidebarOverlay.classList.add("hidden");
  }, 300);
}

function showDashboard() {
  dashboardElement.style.display = "flex";
  const statusEl = document.getElementById("connection-status");
  if (statusEl) {
    statusEl.innerText = "● Online";
    statusEl.classList.remove("bg-yellow-100", "text-yellow-800");
    statusEl.classList.add("bg-green-100", "text-green-800");
  }
}

function handleLogout() {
  session.clear();
  appState.clear();
  location.reload();
}

init();
