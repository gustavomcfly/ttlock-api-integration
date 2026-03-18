import { apiClient } from '../api/apiClient.js';
import { session } from '../utils/session.js';
import { appState } from '../state/appState.js';
import { toast } from '../utils/toast.js';

export class ActionPanel {
    constructor() {
        // Now it only looks for the button itself, not the old container
        this.btnRemoteUnlock = document.getElementById('btn-remote-unlock');
        
        if (this.btnRemoteUnlock) {
            this.bindEvents();
        }
    }

    bindEvents() {
        this.btnRemoteUnlock.addEventListener('click', (e) => {
            e.preventDefault();
            this.remoteUnlock();
        });
    }

    async remoteUnlock() {
        if (!appState.selectedLockId) {
            toast.info("Por favor, selecione uma fechadura primeiro.");
            return;
        }

        const token = session.getToken();
        this.btnRemoteUnlock.innerText = "Destrancando...";
        this.btnRemoteUnlock.disabled = true;

        try {
            const data = await apiClient.remoteUnlock(token, appState.selectedLockId);
            if (data.errcode === 0) {
                toast.success(`Sucesso! Fechadura ${appState.selectedLockName} desbloqueada.`);
            } else {
                toast.error(`Falha no desbloqueio: ${data.errmsg || data.description || 'Erro desconhecido'}`);
            }
        } catch (err) {
            toast.error("Erro ao se comunicar com o servidor.");
            console.error(err);
        } finally {
            this.btnRemoteUnlock.innerText = "Destrancar Agora";
            this.btnRemoteUnlock.disabled = false;
        }
    }
}