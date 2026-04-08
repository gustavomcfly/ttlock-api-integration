import axios from "axios";
import "dotenv/config";

const BASE_URL = "https://api.sciener.com";

export const recordService = {
  async getRecords(accessToken, lockId, pageNo = 1, pageSize = 50) {
    const response = await axios.get(`${BASE_URL}/v3/lockRecord/list`, {
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

  async clearRecords(accessToken, lockId) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/lockRecord/clear`,
      params.toString(),
    );
    return response.data;
  },
};
