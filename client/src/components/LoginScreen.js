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
        this.togglePasswordBtn = document.getElementById('toggle-password'); 
        
        this.onLoginSuccess = onLoginSuccess;
        this.bindEvents();
    }

    bindEvents() {
        this.enterButton.addEventListener('click', () => this.handleLogin());
        
        if (this.togglePasswordBtn) {
            this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        }
    }

    togglePasswordVisibility() {
        if (this.passwordInput.type === 'password') {
            this.passwordInput.type = 'text';
            this.togglePasswordBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;
        } else {
            this.passwordInput.type = 'password';
            this.togglePasswordBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        }
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
                toast.success("Autenticação bem sucedida!");
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