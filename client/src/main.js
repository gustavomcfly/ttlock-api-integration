import loginHtml from "./pages/login.html?raw";
import sidebarHtml from "./pages/sidebar.html?raw";
import topbarHtml from "./pages/topbar.html?raw";
import homeHtml from "./pages/home.html?raw";
import lockHtml from "./pages/lock.html?raw";
import passcodeHtml from "./pages/passcode.html?raw";
import rfidHtml from "./pages/rfid.html?raw";
import fingerprintHtml from "./pages/fingerprint.html?raw";
import cyclicTestHtml from "./pages/cyclicTest.html?raw";
import qualityTestHtml from "./pages/qualityTest.html?raw";
import qualityTestProgressHtml from "./pages/qualityTestProgress.html?raw";
import reportsHtml from "./pages/reports.html?raw";
import lockSettingsHtml from "./pages/lockSettings.html?raw";
import settingsHtml from "./pages/settings.html?raw";

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
            ${cyclicTestHtml}
            ${qualityTestHtml}
            ${qualityTestProgressHtml}
            ${reportsHtml}
            ${lockSettingsHtml}
            ${settingsHtml}
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
import { FingerprintPanel } from "./components/FingerprintPanel.js";
import { RecordPanel } from "./components/RecordPanel.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { CyclicTestPanel } from "./components/CyclicTestPanel.js";
import { QualityTestPanel } from "./components/QualityTestPanel.js";

const dashboardElement = document.getElementById("dashboard");
const btnLogout = document.getElementById("btn-logout");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const btnOpenSidebar = document.getElementById("btn-open-sidebar");
const btnCloseSidebar = document.getElementById("btn-close-sidebar");

const btnSidebarHome = document.getElementById("btn-sidebar-home");
const btnSidebarTests = document.getElementById("btn-sidebar-tests");
const btnSidebarQuality = document.getElementById("btn-sidebar-quality");
const btnSidebarReports = document.getElementById("btn-sidebar-reports");
const btnSidebarSettings = document.getElementById("btn-sidebar-settings");

const viewHome = document.getElementById("view-home");
const viewLock = document.getElementById("view-lock");
const viewPasscode = document.getElementById("view-passcode");
const viewRfid = document.getElementById("view-rfid");
const viewFingerprint = document.getElementById("view-fingerprint");
const viewCyclicTest = document.getElementById("view-cyclic-test");
const viewQualityTest = document.getElementById("view-quality-test");
const viewQualityTestProgress = document.getElementById(
  "view-quality-test-progress",
);
const viewReports = document.getElementById("view-reports");
const viewLockSettings = document.getElementById("view-lock-settings");
const viewSettings = document.getElementById("view-settings");

let recordPanel;
let cyclicPanel;
let qualityPanel;
let settingsPanel;

function init() {
  try {
    new ActionPanel();
  } catch (e) {
    console.error(e);
  }
  try {
    new PasscodePanel();
  } catch (e) {
    console.error(e);
  }
  try {
    new RfidPanel();
  } catch (e) {
    console.error(e);
  }
  try {
    new FingerprintPanel();
  } catch (e) {
    console.error(e);
  }

  try {
    recordPanel = new RecordPanel();
  } catch (e) {
    console.error(e);
  }
  try {
    settingsPanel = new SettingsPanel();
  } catch (e) {
    console.error(e);
  }
  try {
    cyclicPanel = new CyclicTestPanel();
  } catch (e) {
    console.error(e);
  }
  try {
    qualityPanel = new QualityTestPanel();
  } catch (e) {
    console.error(e);
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

  if (btnLogout) btnLogout.addEventListener("click", handleLogout);
  if (btnOpenSidebar) btnOpenSidebar.addEventListener("click", openSidebar);
  if (btnCloseSidebar) btnCloseSidebar.addEventListener("click", closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

  document.getElementById("btn-topbar-home")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigateToHomeView();
  });
  document.getElementById("btn-back-home")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigateToHomeView();
  });

  document
    .getElementById("btn-go-lock-settings")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllViews();
      if (viewLockSettings) viewLockSettings.classList.remove("hidden");
    });

  document.getElementById("btn-go-rfid")?.addEventListener("click", (e) => {
    e.preventDefault();
    hideAllViews();
    if (viewRfid) viewRfid.classList.remove("hidden");
  });

  document
    .getElementById("btn-go-fingerprint")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllViews();
      if (viewFingerprint) viewFingerprint.classList.remove("hidden");
    });

  const backButtons = [
    "btn-back-lock",
    "btn-back-lock-rfid",
    "btn-back-lock-fingerprint",
    "btn-back-lock-dashboard",
  ];
  backButtons.forEach((id) => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToLockViewFromSubView();
    });
  });

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
      hideAllViews();
      if (viewCyclicTest) viewCyclicTest.classList.remove("hidden");
      updateSidebarActiveState("btn-sidebar-tests");
      if (cyclicPanel) cyclicPanel.syncLock();
    });
  }

  if (btnSidebarQuality) {
    btnSidebarQuality.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();
      hideAllViews();
      if (viewQualityTest) viewQualityTest.classList.remove("hidden");
      updateSidebarActiveState("btn-sidebar-quality");
      document.dispatchEvent(new CustomEvent("navigate-quality-test"));
    });
  }

  if (btnSidebarReports) {
    btnSidebarReports.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();
      hideAllViews();
      if (viewReports) viewReports.classList.remove("hidden");
      updateSidebarActiveState("btn-sidebar-reports");
    });
  }

  if (btnSidebarSettings) {
    btnSidebarSettings.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();
      hideAllViews();
      if (viewSettings) viewSettings.classList.remove("hidden");
      updateSidebarActiveState("btn-sidebar-settings");
      if (settingsPanel) settingsPanel.loadSettingsToUI();
    });
  }

  document.addEventListener("navigate-lock", () => {
    if (recordPanel) recordPanel.syncLock();
  });

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

function hideAllViews() {
  const views = [
    viewHome,
    viewLock,
    viewPasscode,
    viewRfid,
    viewFingerprint,
    viewCyclicTest,
    viewQualityTest,
    viewQualityTestProgress,
    viewReports,
    viewLockSettings,
    viewSettings,
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
  document.dispatchEvent(new CustomEvent("navigate-lock"));
}

function navigateToLockViewFromSubView() {
  hideAllViews();
  if (viewLock) viewLock.classList.remove("hidden");
  updateSidebarActiveState("btn-sidebar-home");
  document.dispatchEvent(new CustomEvent("navigate-lock"));
}

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
