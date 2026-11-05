import { lockApi } from "../api/lockApi.js";
import { session } from "../utils/session.js";
import { appState } from "../state/appState.js";
import { toast } from "../utils/toast.js";

export class ActionPanel {
  constructor() {
    // Buttons
    this.btnRemoteUnlock = document.getElementById("btn-remote-unlock");
    this.btnRefreshDetails = document.getElementById("btn-refresh-details");
    this.btnRename = document.getElementById("btn-rename");
    this.btnChangePasscode = document.getElementById("btn-change-passcode");
    this.btnConfigPassage = document.getElementById("btn-config-passage");
    this.btnConfigAutoLock = document.getElementById("btn-config-auto-lock");
    this.btnDeleteLock = document.getElementById("btn-delete-lock");
    this.btnGoPasscode = document.getElementById("btn-go-passcode");

    // Inputs
    this.inputNewName = document.getElementById("input-new-name");
    this.inputSuperPasscode = document.getElementById("input-super-passcode");
    this.selectPassageMode = document.getElementById("select-passage-mode");
    this.selectAutoLock = document.getElementById("select-auto-lock");
    this.inputAutoLockSeconds = document.getElementById(
      "input-auto-lock-seconds",
    );

    // Detail spans
    this.detailBattery = document.getElementById("detail-battery");
    this.detailMac = document.getElementById("detail-mac");
    this.detailFirmware = document.getElementById("detail-firmware");
    this.detailPassage = document.getElementById("detail-passage");

    this.bindEvents();
    this.syncAutoLockInput();
  }

  bindEvents() {
    if (this.btnRemoteUnlock)
      this.btnRemoteUnlock.addEventListener("click", () => this.remoteUnlock());
    if (this.btnRefreshDetails)
      this.btnRefreshDetails.addEventListener("click", () =>
        this.loadLockDetails(),
      );
    if (this.btnRename)
      this.btnRename.addEventListener("click", () => this.renameLock());
    if (this.btnChangePasscode)
      this.btnChangePasscode.addEventListener("click", () =>
        this.changeSuperPasscode(),
      );
    if (this.btnConfigPassage)
      this.btnConfigPassage.addEventListener("click", () =>
        this.configPassageMode(),
      );
    if (this.btnConfigAutoLock)
      this.btnConfigAutoLock.addEventListener("click", () =>
        this.configAutoLock(),
      );
    if (this.selectAutoLock)
      this.selectAutoLock.addEventListener("change", () =>
        this.syncAutoLockInput(),
      );
    if (this.btnDeleteLock)
      this.btnDeleteLock.addEventListener("click", () => this.deleteLock());

    // Navigate to the passcode registration view
    if (this.btnGoPasscode) {
      this.btnGoPasscode.addEventListener("click", () =>
        this.navigateToPasscode(),
      );
    }
  }

  navigateToPasscode() {
    const viewLock = document.getElementById("view-lock");
    const viewPasscode = document.getElementById("view-passcode");
    if (viewLock && viewPasscode) {
      viewLock.classList.add("hidden");
      viewPasscode.classList.remove("hidden");
      // Dispatch a custom event so main.js can sync the passcode panel
      document.dispatchEvent(new CustomEvent("navigate-passcode"));
    }
  }

  // --- API Calls ---

  async loadLockDetails() {
    if (!appState.selectedLockId) return;

    this.detailBattery.innerText = "...";
    this.detailMac.innerText = "...";

    try {
      const data = await lockApi.getLockDetails(
        session.getToken(),
        appState.selectedLockId,
      );

      if (!data.errcode || data.errcode === 0) {
        this.detailBattery.innerText = `${data.electricQuantity || 0}%`;
        this.detailMac.innerText = data.lockMac || "Desconhecido";
        this.detailFirmware.innerText = data.firmwareRevision || "N/A";
        this.detailPassage.innerText =
          data.passageMode === 1 ? "Ativado" : "Desativado";
        this.applyAutoLockDetails(data.autoLockTime);
      } else {
        toast.error(
          `Falha: ${data.errmsg || "Não foi possível carregar os detalhes."}`,
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  // autoLockTime vem do detail: > 0 = segundos; -1/0/ausente = desativado
  applyAutoLockDetails(autoLockTime) {
    if (!this.selectAutoLock || !this.inputAutoLockSeconds) return;
    const seconds = parseInt(autoLockTime);
    const enabled = Number.isFinite(seconds) && seconds > 0;
    this.selectAutoLock.value = enabled ? "1" : "0";
    if (enabled) this.inputAutoLockSeconds.value = seconds;
    this.syncAutoLockInput();
  }

  syncAutoLockInput() {
    if (!this.selectAutoLock || !this.inputAutoLockSeconds) return;
    this.inputAutoLockSeconds.disabled = this.selectAutoLock.value !== "1";
  }

  async configAutoLock() {
    if (!appState.selectedLockId) return;

    const enabled = this.selectAutoLock.value === "1";
    let seconds = -1;
    if (enabled) {
      seconds = parseInt(this.inputAutoLockSeconds.value);
      if (!Number.isInteger(seconds) || seconds < 1)
        return toast.info("Informe um tempo válido em segundos (mínimo 1).");
    }

    this.btnConfigAutoLock.innerText = "...";
    this.btnConfigAutoLock.disabled = true;
    try {
      const data = await lockApi.setAutoLock(
        session.getToken(),
        appState.selectedLockId,
        seconds,
      );
      if (data.errcode === 0) {
        toast.success(
          enabled
            ? `Fechamento automático ativado (${seconds}s).`
            : "Fechamento automático desativado.",
        );
        this.loadLockDetails();
      } else {
        toast.error(`Falha: ${data.errmsg || "Erro"}`);
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    } finally {
      this.btnConfigAutoLock.innerText = "Aplicar";
      this.btnConfigAutoLock.disabled = false;
    }
  }

  async remoteUnlock() {
    if (!appState.selectedLockId) return;
    const btn = this.btnRemoteUnlock;

    btn.innerText = "Destrancando...";
    btn.disabled = true;

    try {
      const data = await lockApi.remoteUnlock(
        session.getToken(),
        appState.selectedLockId,
      );
      if (data.errcode === 0) {
        toast.success(`Fechadura desbloqueada com sucesso.`);
      } else {
        toast.error(`Falha: ${data.errmsg || "Erro desconhecido"}`);
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    } finally {
      btn.innerText = "Destrancar Agora";
      btn.disabled = false;
    }
  }

  async renameLock() {
    const newName = this.inputNewName.value.trim();
    if (!newName || !appState.selectedLockId)
      return toast.info("Insira um nome válido.");

    this.btnRename.innerText = "...";
    try {
      const data = await lockApi.renameLock(
        session.getToken(),
        appState.selectedLockId,
        newName,
      );
      if (data.errcode === 0) {
        toast.success("Nome alterado com sucesso!");
        document.getElementById("lock-view-name").innerText = newName;
        appState.setLock(appState.selectedLockId, newName);
        this.inputNewName.value = "";
      } else {
        toast.error(`Falha: ${data.errmsg || "Erro"}`);
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    } finally {
      this.btnRename.innerText = "Salvar";
    }
  }

  async changeSuperPasscode() {
    const password = this.inputSuperPasscode.value.trim();
    if (!password || password.length < 4)
      return toast.info("A senha deve ter pelo menos 4 dígitos.");

    this.btnChangePasscode.innerText = "...";
    try {
      const data = await lockApi.changeSuperPasscode(
        session.getToken(),
        appState.selectedLockId,
        password,
      );
      if (data.errcode === 0) {
        toast.success("Senha de administrador alterada com sucesso!");
        this.inputSuperPasscode.value = "";
      } else {
        toast.error(`Falha: ${data.errmsg || "Erro"}`);
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    } finally {
      this.btnChangePasscode.innerText = "Salvar";
    }
  }

  async configPassageMode() {
    const mode = parseInt(this.selectPassageMode.value);

    const payload = {
      passageMode: mode === 1 ? 1 : 2,
      isAllDay: 1,
    };

    this.btnConfigPassage.innerText = "...";
    try {
      const data = await lockApi.configPassageMode(
        session.getToken(),
        appState.selectedLockId,
        payload,
      );
      if (data.errcode === 0) {
        toast.success("Modo de passagem atualizado!");
        this.loadLockDetails();
      } else {
        toast.error(`Falha: ${data.errmsg || "Erro"}`);
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    } finally {
      this.btnConfigPassage.innerText = "Aplicar";
    }
  }

  async deleteLock() {
    if (!appState.selectedLockId) return;

    const confirmDelete = confirm(
      `ATENÇÃO: Tem certeza que deseja excluir a fechadura "${appState.selectedLockName}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmDelete) return;

    this.btnDeleteLock.innerText = "Excluindo...";
    this.btnDeleteLock.disabled = true;

    try {
      const data = await lockApi.deleteLock(
        session.getToken(),
        appState.selectedLockId,
      );
      if (data.errcode === 0) {
        toast.success("Fechadura excluída com sucesso.");
        document.getElementById("btn-back-home").click();
      } else {
        toast.error(`Falha: ${data.errmsg || "Erro"}`);
        this.btnDeleteLock.innerText = "Excluir Fechadura";
        this.btnDeleteLock.disabled = false;
      }
    } catch (err) {
      toast.error("Erro de conexão.");
      this.btnDeleteLock.innerText = "Excluir Fechadura";
      this.btnDeleteLock.disabled = false;
    }
  }
}
