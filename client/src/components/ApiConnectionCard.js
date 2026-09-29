import { authApi } from "../api/authApi.js";
import { session } from "../utils/session.js";
import { appState } from "../state/appState.js";
import { toast } from "../utils/toast.js";

export class ApiConnectionCard {
  constructor(onConnectSuccess) {
    this.btnAuthenticate = document.getElementById("btn-authenticate");
    this.connectionStatus = document.getElementById("connection-status");
    this.onConnectSuccess = onConnectSuccess;
    this.bindEvents();
  }

  bindEvents() {
    if (this.btnAuthenticate) {
      this.btnAuthenticate.addEventListener("click", () => this.authenticate());
    }
  }

  async authenticate() {
    if (!appState.username) {
      toast.error("Sessão expirada. Por favor faça logout e login novamente.");
      return;
    }

    this.btnAuthenticate.innerText = "Conectando...";
    this.setPendingUI();

    try {
      const data = await authApi.login({
        username: appState.username,
        password: appState.password,
      });

      if (data.access_token) {
        session.save(data.access_token);
        session.saveUser(data.localUserId, appState.username);

        this.setConnectedUI();
        this.onConnectSuccess();
        toast.success("Autenticação bem sucedida!");
      } else {
        this.setDisconnectedUI();
        toast.error(
          "Falha no login: " + (data.description || "Cheque suas credenciais."),
        );
      }
    } catch (err) {
      this.setDisconnectedUI();
      toast.error("Falha de conexão com o servidor da TTLock.");
      console.error(err);
    } finally {
      this.btnAuthenticate.innerText = "Conectar API";
    }
  }
}
