import { API_BASE } from "../config.js";
const API_BASE_URL = `${API_BASE}/auth`;

export const authApi = {
  async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return response.json();
  },
};
