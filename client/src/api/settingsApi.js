import { API_BASE } from "../config.js";
import { authFetch } from "../utils/http.js";

const BASE = `${API_BASE}/settings`;

export const settingsApi = {
  async get() {
    const res = await authFetch(BASE);
    return res.json();
  },

  async save(settings) {
    const res = await authFetch(BASE, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
