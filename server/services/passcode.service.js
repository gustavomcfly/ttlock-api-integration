import axios from "axios";
import "dotenv/config";

const BASE_URL = "https://api.sciener.com";

export const passcodeService = {
  async getRandomPasscode(
    accessToken,
    lockId,
    passcodeType,
    startDate,
    endDate,
  ) {
    const params = new URLSearchParams();
    params.append("clientId", process.env.TTLOCK_CLIENT_ID);
    params.append("accessToken", accessToken);
    params.append("lockId", lockId);
    params.append("keyboardPwdType", passcodeType);
    params.append("date", Date.now());

    const safeStartDate = startDate || Date.now();
    const safeEndDate = endDate || 0;

    params.append("startDate", safeStartDate);
    params.append("endDate", safeEndDate);

    const response = await axios.post(
      `${BASE_URL}/v3/keyboardPwd/get`,
      params.toString(),
    );
    return response.data;
  },

  async addCustomPasscode(
    accessToken,
    lockId,
    passcode,
    name,
    startDate,
    endDate,
    isAllDay,
    weekDays,
    startTime,
    endTime,
  ) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      keyboardPwd: passcode,
      keyboardPwdName: name || "Senha Customizada",
      startDate: startDate || Date.now(),
      endDate: endDate || 0,
      addType: 2,
      date: Date.now(),
    });

    if (isAllDay === 2) {
      params.append("isAllDay", 2);
      params.append("weekDays", weekDays);
      params.append("startTime", startTime);
      params.append("endTime", endTime);
    } else {
      params.append("isAllDay", 1);
    }

    const response = await axios.post(
      `${BASE_URL}/v3/keyboardPwd/add`,
      params.toString(),
    );
    return response.data;
  },

  async getPasscodeList(accessToken, lockId, pageNo = 1, pageSize = 50) {
    const response = await axios.get(`${BASE_URL}/v3/keyboardPwd/list`, {
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

  async deletePasscode(accessToken, lockId, keyboardPwdId) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      keyboardPwdId: keyboardPwdId,
      deleteType: 2, // 2 = Delete via Wi-Fi Gateway
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/keyboardPwd/delete`,
      params.toString(),
    );
    return response.data;
  },

  async changePasscode(accessToken, lockId, keyboardPwdId, newKeyboardPwd) {
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: accessToken,
      lockId: lockId,
      keyboardPwdId: keyboardPwdId,
      newKeyboardPwd: newKeyboardPwd,
      changeType: 2, // 2 = Change via Wi-Fi Gateway
      date: Date.now(),
    });
    const response = await axios.post(
      `${BASE_URL}/v3/keyboardPwd/change`,
      params.toString(),
    );
    return response.data;
  },
};
