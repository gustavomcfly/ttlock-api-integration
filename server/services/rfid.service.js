import axios from "axios";
import "dotenv/config";

const BASE_URL = "https://api.sciener.com";

export const rfidService = {
  async addCard(accessToken, lockId, cardNumber, name, startDate, endDate) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      cardNumber: cardNumber,
      cardName: name || "Cartão RFID",
      startDate: startDate || 0, // 0 = Permanent
      endDate: endDate || 0,
      addType: 2, // 2 = Add remotely via Wi-Fi Gateway
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/identityCard/add`,
      params.toString(),
    );
    return response.data;
  },

  async getCardList(accessToken, lockId, pageNo = 1, pageSize = 50) {
    const response = await axios.get(`${BASE_URL}/v3/identityCard/list`, {
      params: {
        clientId: process.env.TTLOCK_CLIENT_ID,
        accessToken: accessToken,
        lockId: lockId,
        pageNo: pageNo,
        pageSize: pageSize,
        date: Date.now(),
      },
    });
    return response.data;
  },

  async deleteCard(accessToken, lockId, cardId) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      cardId: cardId,
      deleteType: 2, // 2 = Delete via Wi-Fi Gateway
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/identityCard/delete`,
      params.toString(),
    );
    return response.data;
  },

  async clearCards(accessToken, lockId) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/identityCard/clear`,
      params.toString(),
    );
    return response.data;
  },

  async changePeriod(accessToken, lockId, cardId, startDate, endDate) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      cardId: cardId,
      startDate: startDate || 0,
      endDate: endDate || 0,
      changeType: 2, // 2 = Change validity via Wi-Fi Gateway
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/identityCard/changePeriod`,
      params.toString(),
    );
    return response.data;
  },
};
