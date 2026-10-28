import { API_BASE } from "../config.js";
import { authFetch } from "../utils/http.js";
const BASE = `${API_BASE}/reports`;

async function parse(res) {
  const data = await res.json();
  return data;
}

export const reportApi = {
  async list() {
    const res = await authFetch(`${BASE}`);
    return parse(res);
  },

  async get(id) {
    const res = await authFetch(`${BASE}/${id}`);
    return parse(res);
  },

  async saveCyclic(testId, testerName) {
    const res = await authFetch(`${BASE}/cyclic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId, testerName }),
    });
    return parse(res);
  },

  // O servidor monta o relatório a partir da auditoria salva no banco.
  async saveQuality(testId, testerName) {
    const res = await authFetch(`${BASE}/quality`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId, testerName }),
    });
    return parse(res);
  },

  async remove(id) {
    const res = await authFetch(`${BASE}/${id}`, { method: "DELETE" });
    return parse(res);
  },
};
