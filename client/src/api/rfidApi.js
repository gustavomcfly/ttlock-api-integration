const API_BASE_URL = "http://localhost:3001/api/rfid";

export const rfidApi = {
  async addCard(payload) {
    const response = await fetch(`${API_BASE_URL}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  async getCardList(accessToken, lockId, pageNo = 1, pageSize = 50) {
    const response = await fetch(`${API_BASE_URL}/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId, pageNo, pageSize }),
    });
    return response.json();
  },

  async deleteCard(accessToken, lockId, cardId) {
    const response = await fetch(`${API_BASE_URL}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId, cardId }),
    });
    return response.json();
  },

  async clearCards(accessToken, lockId) {
    const response = await fetch(`${API_BASE_URL}/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId }),
    });
    return response.json();
  },

  async changePeriod(payload) {
    const response = await fetch(`${API_BASE_URL}/change-period`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  },
};
