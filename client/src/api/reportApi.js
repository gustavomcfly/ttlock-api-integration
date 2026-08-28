import { API_BASE } from "../config.js";
const BASE = `${API_BASE}/reports`;

async function parse(res) {
  const data = await res.json();
  return data;
}

export const reportApi = {
  async list() {
    const res = await fetch(`${BASE}`);
    return parse(res);
  },

  async get(id) {
    const res = await fetch(`${BASE}/${id}`);
    return parse(res);
  },

  async saveCyclic(testId, testerName) {
    const res = await fetch(`${BASE}/cyclic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId, testerName }),
    });
    return parse(res);
  },

  async saveQuality(testSnapshot, testerName) {
    const res = await fetch(`${BASE}/quality`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testSnapshot, testerName }),
    });
    return parse(res);
  },

  async remove(id) {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    return parse(res);
  },
};
