// Única coisa guardada no navegador: as credenciais da sessão.
//  - tt_token:   access_token da TTLock (necessário para os comandos nas fechaduras)
//  - tt_session: sessão do nosso servidor (identifica o usuário dono dos testes/relatórios)
// Configurações, testes e relatórios vivem no banco.
export const session = {
  save(token) {
    localStorage.setItem("tt_token", token);
  },
  getToken() {
    return localStorage.getItem("tt_token");
  },

  saveUser(sessionToken, username) {
    if (sessionToken) localStorage.setItem("tt_session", sessionToken);
    if (username) localStorage.setItem("tt_username", username);
  },
  getSessionToken() {
    return localStorage.getItem("tt_session");
  },
  getUsername() {
    return localStorage.getItem("tt_username");
  },

  clear() {
    localStorage.removeItem("tt_token");
    localStorage.removeItem("tt_session");
    localStorage.removeItem("tt_username");
    // Chaves de versões antigas (identidade e configurações locais)
    localStorage.removeItem("tt_user_id");
    localStorage.removeItem("pado_test_settings");
  },
  // Sessões antigas (sem tt_session) caem aqui e pedem novo login.
  isAuthenticated() {
    return !!this.getToken() && !!this.getSessionToken();
  },
};
