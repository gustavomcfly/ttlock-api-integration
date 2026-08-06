const BASE_URL = "/db/cyclic-tests";

async function parse(response) {
  const data = await response.json();
  if (!response.ok && data && data.message === undefined) {
    data.message = `Erro (${response.status})`;
  }
  return data;
}

export const cyclicTestApi = {
  // Testes "running"/"paused" em qualquer fechadura — usado para reidratar a UI
  // ao entrar na tela, mesmo que o teste tenha sido iniciado em outra aba ou sessão.
  async listActive() {
    const res = await fetch(`${BASE_URL}/active`);
    return parse(res);
  },

  async get(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    return parse(res);
  },

  async start(config, token) {
    const res = await fetch(`${BASE_URL}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lockId: config.lockId,
        lockAlias: config.lockName,
        totalCycles: config.totalCycles,
        delayBetweenCycles: config.delayBetweenCycles,
        maxConsecutiveFailures: config.maxConsecutiveFailures,
        lowBatteryThreshold: config.lowBatteryThreshold,
        token,
      }),
    });
    return parse(res);
  },

  async pause(id) {
    const res = await fetch(`${BASE_URL}/${id}/pause`, { method: "POST" });
    return parse(res);
  },

  async resume(id) {
    const res = await fetch(`${BASE_URL}/${id}/resume`, { method: "POST" });
    return parse(res);
  },

  async stop(id, { status, batteryEnd } = {}) {
    const res = await fetch(`${BASE_URL}/${id}/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status || "stopped", batteryEnd }),
    });
    return parse(res);
  },

  async edit(id, updates) {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return parse(res);
  },
};
