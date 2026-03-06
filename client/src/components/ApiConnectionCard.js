import { apiClient } from '../api/apiClient.js';
import { session } from '../utils/session.js';
import { appState } from '../state/appState.js';
import { toast } from '../utils/toast.js';

export class ApiConnectionCard {
    constructor(onConnectSuccess) {
        this.btnAuthenticate = document.getElementById('btn-authenticate');
        this.connectionStatus = document.getElementById('connection-status');
        this.onConnectSuccess = onConnectSuccess;
        this.bindEvents();
    }

    bindEvents() {
        this.btnAuthenticate.addEventListener('click', () => this.authenticate());
    }

    async authenticate() {
        if (!appState.credentials.username) {
            toast.error("Sessão expirada. Por favor faça logout e login novamente.");
            return;
        }

        this.btnAuthenticate.innerText = "Conectando...";
        try {
            const data = await apiClient.login(appState.credentials);

            if (data.access_token) {
                session.save(data.access_token);
                this.setConnectedUI();
                this.onConnectSuccess();
                toast.error("Autentificação bem sucedida!");
            } else {
                toast.error("Falha no login: " + (data.description || "Cheque suas credenciais."));
            }
        } catch (err) {
            toast.error("Falha de conexão com o servidor.");
            console.error(err);
        } finally {
            this.btnAuthenticate.innerText = "Conectar API";
        }
    }

    setConnectedUI() {
        this.connectionStatus.innerText = "● Sistema Ativo";
        this.connectionStatus.style.color = "#4CAF50";
        document.getElementById('config-card').style.display = 'none';
    }
}