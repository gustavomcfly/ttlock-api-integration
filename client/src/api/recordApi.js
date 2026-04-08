const API_BASE_URL = "http://localhost:3001/api/record";

export const recordApi = {
  async getRecords(accessToken, lockId, pageNo = 1, pageSize = 50) {
    const response = await fetch(`${API_BASE_URL}/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId, pageNo, pageSize }),
    });
    return response.json();
  },

  async clearRecords(accessToken, lockId) {
    const response = await fetch(`${API_BASE_URL}/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId }),
    });
    return response.json();
  },
};
