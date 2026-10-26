import { API_BASE } from "../config.js";
import { authFetch } from "../utils/http.js";
const API_BASE_URL = `${API_BASE}/quality`;

const post = async (path, body) => {
  const response = await authFetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
};

export const qualityApi = {
  startTest(accessToken, lockId, criteria, testParams) {
    return post("/start", { accessToken, lockId, criteria, testParams });
  },
  getStatus(testId) {
    return post("/status", { testId });
  },
  getList(lockId) {
    return post("/list", { lockId });
  },
};
