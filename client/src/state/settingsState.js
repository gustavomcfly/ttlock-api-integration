import { settingsApi } from "../api/settingsApi.js";

const DEFAULTS = {
  testerName: "",
  stdPasscode: "",
  stdCard: "",
  stdFingerprint: "",
  defaultCycles: 100,
  defaultUnlockTime: 5,
  defaultInterval: 5,
};

// As configurações pertencem ao usuário e ficam no banco (tabela UserSettings).
// Este objeto é só o espelho em memória para os painéis lerem de forma síncrona;
// nada é gravado no navegador.
export const settingsState = {
  ...DEFAULTS,

  async load() {
    try {
      const data = await settingsApi.get();
      if (data.success) Object.assign(this, data.settings);
    } catch (_) {
      // Servidor indisponível: mantém o que já está em memória.
    }
  },

  async save(data) {
    const res = await settingsApi.save(data);
    if (!res.success) {
      throw new Error(res.message || "Erro ao salvar configurações.");
    }
    Object.assign(this, res.settings);
  },
};
