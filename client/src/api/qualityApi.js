import { API_BASE } from "../config.js";
const API_BASE_URL = `${API_BASE}/quality`;

export const qualityApi = {
  async startTest(accessToken, lockId, criteria, testParams) {
    const response = await fetch(`${API_BASE_URL}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId, criteria, testParams }),
    });
    return response.json();
  },
  async getStatus(testId) {
    const response = await fetch(`${API_BASE_URL}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId }),
    });
    return response.json();
  },
  async getList(lockId) {
    const response = await fetch(`${API_BASE_URL}/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockId }),
    });
    return response.json();
  },
};
