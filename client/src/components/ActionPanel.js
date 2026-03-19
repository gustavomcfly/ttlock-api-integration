import { apiClient } from '../api/apiClient.js';
import { session } from '../utils/session.js';
import { appState } from '../state/appState.js';
import { toast } from '../utils/toast.js';

export class ActionPanel {
    constructor() {
        // Buttons
        this.btnRemoteUnlock = document.getElementById('btn-remote-unlock');
        this.btnRefreshDetails = document.getElementById('btn-refresh-details');
        this.btnRename = document.getElementById('btn-rename');
        this.btnChangePasscode = document.getElementById('btn-change-passcode');
        this.btnConfigPassage = document.getElementById('btn-config-passage');
        this.btnDeleteLock = document.getElementById('btn-delete-lock');

        // Inputs
        this.inputNewName = document.getElementById('input-new-name');
        this.inputSuperPasscode = document.getElementById('input-super-passcode');
        this.selectPassageMode = document.getElementById('select-passage-mode');

        // Detail spans
        this.detailBattery = document.getElementById('detail-battery');
        this.detailMac = document.getElementById('detail-mac');
        this.detailFirmware = document.getElementById('detail-firmware');
        this.detailPassage = document.getElementById('detail-passage');

        this.bindEvents();
    }

    bindEvents() {
        if (this.btnRemoteUnlock) this.btnRemoteUnlock.addEventListener('click', () => this.remoteUnlock());
        if (this.btnRefreshDetails) this.btnRefreshDetails.addEventListener('click', () => this.loadLockDetails());
        
        if (this.btnRename) this.btnRename.addEventListener('click', () => this.renameLock());
        if (this.btnChangePasscode) this.btnChangePasscode.addEventListener('click', () => this.changeSuperPasscode());
        if (this.btnConfigPassage) this.btnConfigPassage.addEventListener('click', () => this.configPassageMode());
        if (this.btnDeleteLock) this.btnDeleteLock.addEventListener('click', () => this.deleteLock());
    }

    // --- API Calls ---

    async loadLockDetails() {
        if (!appState.selectedLockId) return;
        
        // Brief loading state
        this.detailBattery.innerText = "...";
        this.detailMac.innerText = "...";
        
        try {
            const data = await apiClient.getLockDetails(session.getToken(), appState.selectedLockId);
            if (data.errcode === 0) {
                this.detailBattery.innerText = `${data.electricQuantity || 0}%`;
                this.detailMac.innerText = data.lockMac || 'Desconhecido';
                this.detailFirmware.innerText = data.firmwareRevision || 'N/A';
                this.detailPassage.innerText = data.passageMode === 1 ? 'Ativado' : 'Desativado';
            } else {
                toast.error("Não foi possível carregar os detalhes.");
            }
        } catch (err) {
            console.error(err);
        }
    }

    async remoteUnlock() {
        if (!appState.selectedLockId) return;
        const btn = this.btnRemoteUnlock;
        
        btn.innerText = "Destrancando...";
        btn.disabled = true;

        try {
            const data = await apiClient.remoteUnlock(session.getToken(), appState.selectedLockId);
            if (data.errcode === 0) {
                toast.success(`Fechadura desbloqueada com sucesso.`);
            } else {
                toast.error(`Falha: ${data.errmsg || 'Erro desconhecido'}`);
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
        if (!newName || !appState.selectedLockId) return toast.info("Insira um nome válido.");

        this.btnRename.innerText = "...";
        try {
            const data = await apiClient.renameLock(session.getToken(), appState.selectedLockId, newName);
            if (data.errcode === 0) {
                toast.success("Nome alterado com sucesso!");
                document.getElementById('lock-view-name').innerText = newName;
                appState.setLock(appState.selectedLockId, newName);
                this.inputNewName.value = '';
            } else {
                toast.error(`Falha: ${data.errmsg || 'Erro'}`);
            }
        } catch (err) {
            toast.error("Erro de conexão.");
        } finally {
            this.btnRename.innerText = "Salvar";
        }
    }

    async changeSuperPasscode() {
        const password = this.inputSuperPasscode.value.trim();
        if (!password || password.length < 4) return toast.info("A senha deve ter pelo menos 4 dígitos.");

        this.btnChangePasscode.innerText = "...";
        try {
            const data = await apiClient.changeSuperPasscode(session.getToken(), appState.selectedLockId, password);
            if (data.errcode === 0) {
                toast.success("Super senha alterada com sucesso!");
                this.inputSuperPasscode.value = '';
            } else {
                toast.error(`Falha: ${data.errmsg || 'Erro'}`);
            }
        } catch (err) {
            toast.error("Erro de conexão.");
        } finally {
            this.btnChangePasscode.innerText = "Salvar";
        }
    }

    async configPassageMode() {
        const mode = parseInt(this.selectPassageMode.value);
        
        // TTLock usually requires passageMode (1 or 2) and optionally a schedule (startDate/endDate)
        // Adjust this payload based on your exact backend requirements.
        const payload = {
            passageMode: mode === 1 ? 1 : 2, // 1: Auto-unlock (Passage on), 2: Auto-lock (Passage off)
            isAllDay: 1 // Defaulting to all day for simplicity
        };

        this.btnConfigPassage.innerText = "...";
        try {
            const data = await apiClient.configPassageMode(session.getToken(), appState.selectedLockId, payload);
            if (data.errcode === 0) {
                toast.success("Modo de passagem atualizado!");
                this.loadLockDetails(); // Refresh details to show new mode
            } else {
                toast.error(`Falha: ${data.errmsg || 'Erro'}`);
            }
        } catch (err) {
            toast.error("Erro de conexão.");
        } finally {
            this.btnConfigPassage.innerText = "Aplicar";
        }
    }

    async deleteLock() {
        if (!appState.selectedLockId) return;
        
        // Built-in browser confirmation for dangerous actions
        const confirmDelete = confirm(`ATENÇÃO: Tem certeza que deseja excluir a fechadura "${appState.selectedLockName}"? Esta ação não pode ser desfeita.`);
        if (!confirmDelete) return;

        this.btnDeleteLock.innerText = "Excluindo...";
        this.btnDeleteLock.disabled = true;

        try {
            const data = await apiClient.deleteLock(session.getToken(), appState.selectedLockId);
            if (data.errcode === 0) {
                toast.success("Fechadura excluída com sucesso.");
                // Redirect user back to home
                document.getElementById('btn-back-home').click();
                // Note: The device table should ideally be forced to refresh here.
            } else {
                toast.error(`Falha: ${data.errmsg || 'Erro'}`);
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