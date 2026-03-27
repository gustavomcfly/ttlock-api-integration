import axios from "axios";
import "dotenv/config";

const BASE_URL = "https://api.sciener.com";

export const fingerprintService = {
  async addFingerprint(
    accessToken,
    lockId,
    fingerprintNumber,
    name,
    startDate,
    endDate,
  ) {
    const params = new URLSearchParams();

    params.append("clientId", process.env.TTLOCK_CLIENT_ID);
    params.append("accessToken", accessToken);
    params.append("lockId", lockId);
    params.append("fingerprintNumber", fingerprintNumber); // Required if adding pre-existing data via Gateway
    params.append("fingerprintName", name || "Biometria");
    params.append("startDate", startDate || 0);
    params.append("endDate", endDate || 0);
    params.append("addType", 2); // 2 = Push via Gateway
    params.append("date", Date.now());

    const response = await axios.post(
      `${BASE_URL}/v3/fingerprint/add`,
      params.toString(),
    );
    return response.data;
  },

  async getFingerprintList(accessToken, lockId, pageNo = 1, pageSize = 50) {
    const response = await axios.get(`${BASE_URL}/v3/fingerprint/list`, {
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

  async deleteFingerprint(accessToken, lockId, fingerprintId) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      fingerprintId: fingerprintId,
      deleteType: 2, // 2 = Delete via Wi-Fi Gateway
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/fingerprint/delete`,
      params.toString(),
    );
    return response.data;
  },

  async clearFingerprints(accessToken, lockId) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/fingerprint/clear`,
      params.toString(),
    );
    return response.data;
  },

  async changeFingerprintPeriod(
    accessToken,
    lockId,
    fingerprintId,
    startDate,
    endDate,
  ) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      fingerprintId: fingerprintId,
      startDate: startDate || 0,
      endDate: endDate || 0,
      changeType: 2, // 2 = Change via Wi-Fi Gateway
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/fingerprint/changePeriod`,
      params.toString(),
    );
    return response.data;
  },
};
