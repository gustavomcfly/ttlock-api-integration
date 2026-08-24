import { API_BASE } from "../config.js";
const API_BASE_URL = `${API_BASE}/lock`;

export const lockApi = {
  async fetchLocks(accessToken) {
    const response = await fetch(`${API_BASE_URL}/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    return response.json();
  },

  async remoteUnlock(accessToken, lockId) {
    const response = await fetch(`${API_BASE_URL}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId }),
    });
    return response.json();
  },

  async remoteLock(accessToken, lockId) {
    const response = await fetch(`${API_BASE_URL}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId }),
    });
    return response.json();
  },

  async getLockDetails(accessToken, lockId) {
    const response = await fetch(`${API_BASE_URL}/detail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId }),
    });
    return response.json();
  },

  async renameLock(accessToken, lockId, lockName) {
    const response = await fetch(`${API_BASE_URL}/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId, lockName }),
    });
    return response.json();
  },

  async changeSuperPasscode(accessToken, lockId, password) {
    const response = await fetch(`${API_BASE_URL}/super-passcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId, password }),
    });
    return response.json();
  },

  async configPassageMode(accessToken, lockId, passageModeData) {
    const response = await fetch(`${API_BASE_URL}/passage-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId, ...passageModeData }),
    });
    return response.json();
  },

  async checkUpdate(accessToken, lockId) {
    const response = await fetch(`${API_BASE_URL}/check-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId }),
    });
    return response.json();
  },

  async deleteLock(accessToken, lockId) {
    const response = await fetch(`${API_BASE_URL}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId }),
    });
    return response.json();
  },
};
