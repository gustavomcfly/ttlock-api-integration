export const settingsState = {
  testerName: "",
  stdPasscode: "",
  stdCard: "",
  stdFingerprint: "",
  defaultCycles: 100,
  defaultUnlockTime: 5,
  defaultInterval: 5,

  load() {
    const saved = localStorage.getItem("pado_test_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(this, parsed);
    }
  },

  save(data) {
    Object.assign(this, data);
    localStorage.setItem("pado_test_settings", JSON.stringify(this));
  },
};

// Auto-load settings when the app starts
settingsState.load();
