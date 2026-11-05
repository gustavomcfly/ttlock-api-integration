import axios from "axios";
import "../utils/ttlockErrors.js";
import "dotenv/config";

const BASE_URL = "https://api.sciener.com";

export const rfidService = {
  async addCard(accessToken, lockId, cardNumber, name, startDate, endDate) {
    const params = new URLSearchParams();

    params.append("clientId", process.env.TTLOCK_CLIENT_ID);
    params.append("accessToken", accessToken);
    params.append("lockId", lockId);
    params.append("cardNumber", cardNumber); // REQUIRED BY TTLOCK
    params.append("cardName", name || "Cartão RFID");
    params.append("startDate", startDate || 0);
    params.append("endDate", endDate || 0);
    params.append("addType", 2); // 2 = Push known card via Gateway
    params.append("date", Date.now());

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
      deleteType: 2,
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
      changeType: 2,
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/identityCard/changePeriod`,
      params.toString(),
    );
    return response.data;
  },
};
