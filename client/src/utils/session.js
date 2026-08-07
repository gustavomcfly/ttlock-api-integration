export const session = {
  save(token) {
    localStorage.setItem("tt_token", token);
  },
  getToken() {
    return localStorage.getItem("tt_token");
  },

  // Identidade local (linha na tabela User) associada ao username TTLock que fez login.
  // Persistida em localStorage para sobreviver a reload — appState é só memória e some.
  saveUser(userId, username) {
    if (userId) localStorage.setItem("tt_user_id", userId);
    if (username) localStorage.setItem("tt_username", username);
  },
  getUserId() {
    return localStorage.getItem("tt_user_id");
  },
  getUsername() {
    return localStorage.getItem("tt_username");
  },

  clear() {
    localStorage.removeItem("tt_token");
    localStorage.removeItem("tt_user_id");
    localStorage.removeItem("tt_username");
  },
  isAuthenticated() {
    return !!this.getToken();
  },
};
