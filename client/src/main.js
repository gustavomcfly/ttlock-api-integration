import { session } from "./utils/session.js";
import { appState } from "./state/appState.js";

import { LoginScreen } from "./components/LoginScreen.js";
import { DeviceTable } from "./components/DeviceTable.js";
import { ActionPanel } from "./components/ActionPanel.js";

const dashboardElement = document.getElementById("dashboard");
const btnLogout = document.getElementById("btn-logout");

function init() {
  const actionPanel = new ActionPanel();

  const deviceTable = new DeviceTable(() => {
    actionPanel.show();
  });

  const loginScreen = new LoginScreen(() => {
    deviceTable.enable();
    showDashboard();
    deviceTable.fetchLocks();
  });

  btnLogout.addEventListener("click", handleLogout);

  if (session.isAuthenticated()) {
    loginScreen.hide();
    deviceTable.enable();
    showDashboard();

    deviceTable.fetchLocks();
  } else {
    loginScreen.show();
  }
}

function showDashboard() {
  dashboardElement.style.display = "block";

  document.getElementById("connection-status").innerText = "● Sistema Ativo";
  document.getElementById("connection-status").style.color = "#4CAF50";
  document.getElementById("display-client-id").innerText =
    "Autenticado via Servidor";
}

function handleLogout() {
  session.clear();
  appState.clear();
  location.reload();
}

init();
