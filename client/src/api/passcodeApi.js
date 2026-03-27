const API_BASE_URL = "http://localhost:3001/api/passcode";

export const passcodeApi = {
  async generateRandomPasscode(
    accessToken,
    lockId,
    passcodeType,
    startDate,
    endDate,
  ) {
    const response = await fetch(`${API_BASE_URL}/generate-random`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        lockId,
        passcodeType,
        startDate,
        endDate,
      }),
    });
    return response.json();
  },

  async addCustomPasscode(payload) {
    const response = await fetch(`${API_BASE_URL}/add-custom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  async getPasscodeList(accessToken, lockId, pageNo = 1, pageSize = 50) {
    const response = await fetch(`${API_BASE_URL}/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId, pageNo, pageSize }),
    });
    return response.json();
  },

  async deletePasscode(accessToken, lockId, keyboardPwdId) {
    const response = await fetch(`${API_BASE_URL}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, lockId, keyboardPwdId }),
    });
    return response.json();
  },

  async changePasscode(accessToken, lockId, keyboardPwdId, newKeyboardPwd) {
    const response = await fetch(`${API_BASE_URL}/change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        lockId,
        keyboardPwdId,
        newKeyboardPwd,
      }),
    });
    return response.json();
  },
};
