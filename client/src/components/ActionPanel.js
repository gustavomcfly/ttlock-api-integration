import { apiClient } from '../api/apiClient.js';
import { session } from '../utils/session.js';
import { appState } from '../state/appState.js';
import { toast } from '../utils/toast.js';

export class ActionPanel {
    constructor() {
        this.panel = document.getElementById('lock-actions');
        this.btnRemoteUnlock = document.getElementById('btn-remote-unlock');
        this.bindEvents();
    }

    bindEvents() {
        this.btnRemoteUnlock.addEventListener('click', () => this.remoteUnlock());
    }

    show() {
        this.panel.style.display = 'block';
    }

    async remoteUnlock() {
        if (!appState.selectedLockId) {
            toast.error("Por favor, selecione uma fechadura primeiro.");
            return;
        }

        const token = session.getToken();
        this.btnRemoteUnlock.innerText = "Desbloqueando...";
        this.btnRemoteUnlock.disabled = true;

        try {
            const data = await apiClient.remoteUnlock(token, appState.selectedLockId);
            if (data.errcode === 0) {
                toast.error(`Sucesso! Fechadura ${appState.selectedLockName} desbloqueada.`);
            } else {
                toast.error(`Falha no desbloqueio: ${data.errmsg || data.description || 'Erro desconhecido'}`);
            }
        } catch (err) {
            toast.error("Erro ao se comunicar com o servidor.");
            console.error(err);
        } finally {
            this.btnRemoteUnlock.innerText = "Abertura Remota";
            this.btnRemoteUnlock.disabled = false;
        }
    }
}