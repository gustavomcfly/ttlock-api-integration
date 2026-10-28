import { session } from "./session.js";

let redirecting = false;

// fetch que anexa a sessão do servidor. Se o servidor responder 401 (sessão
// ausente/expirada), limpa o login e volta para a tela de entrada.
export async function authFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = session.getSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && !redirecting) {
    redirecting = true;
    session.clear();
    location.reload();
  }
  return res;
}
