import md5 from 'blueimp-md5';
import { appState } from '../state/appState.js';
import { apiClient } from '../api/apiClient.js';
import { session } from '../utils/session.js';
import { toast } from '../utils/toast.js';

export class LoginScreen {
    constructor(onLoginSuccess) {
        this.container = document.getElementById('login-screen');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.enterButton = document.getElementById('btn-enter-app');
        
        this.onLoginSuccess = onLoginSuccess;
        this.bindEvents();
    }

    bindEvents() {
        this.enterButton.addEventListener('click', () => this.handleLogin());
    }

    async handleLogin() {
        const username = this.usernameInput.value;
        const rawPassword = this.passwordInput.value;

        if (!username || !rawPassword) {
            toast.error("Por favor, insira as credenciais da sua conta.");
            return;
        }

        this.enterButton.innerText = "Conectando...";
        this.enterButton.disabled = true;

        const credentials = {
            username: username,
            password: md5(rawPassword)
        };

        try {
            const data = await apiClient.login(credentials);

            if (data.access_token) {
                session.save(data.access_token);
                appState.setCredentials(username, credentials.password);
                this.hide();
                this.onLoginSuccess();
            } else {
                toast.error("Falha no login: " + (data.description || "Cheque suas credenciais."));
            }
        } catch (err) {
            toast.error("Falha de conexão com o servidor.");
            console.error(err);
        } finally {
            this.enterButton.innerText = "Entrar no Sistema";
            this.enterButton.disabled = false;
        }
    }

    show() { this.container.style.display = 'flex'; }
    hide() { this.container.style.display = 'none'; }
}