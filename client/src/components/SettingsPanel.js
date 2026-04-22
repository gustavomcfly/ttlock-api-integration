import { settingsState } from "../state/settingsState.js";
import { toast } from "../utils/toast.js";

export class SettingsPanel {
  constructor() {
    this.inputName = document.getElementById("cfg-tester-name");
    this.inputPasscode = document.getElementById("cfg-std-passcode");
    this.inputCard = document.getElementById("cfg-std-card");
    this.inputFingerprint = document.getElementById("cfg-std-fingerprint");

    this.inputCycles = document.getElementById("cfg-def-cycles");
    this.inputUnlockTime = document.getElementById("cfg-def-unlock-time");
    this.inputInterval = document.getElementById("cfg-def-interval");

    this.btnSave = document.getElementById("btn-save-settings");

    this.bindEvents();
  }

  bindEvents() {
    if (this.btnSave) {
      this.btnSave.addEventListener("click", () => this.saveSettings());
    }
  }

  // Called automatically when navigating to the Settings page
  loadSettingsToUI() {
    if (this.inputName) this.inputName.value = settingsState.testerName;
    if (this.inputPasscode)
      this.inputPasscode.value = settingsState.stdPasscode;
    if (this.inputCard) this.inputCard.value = settingsState.stdCard;
    if (this.inputFingerprint)
      this.inputFingerprint.value = settingsState.stdFingerprint;

    if (this.inputCycles) this.inputCycles.value = settingsState.defaultCycles;
    if (this.inputUnlockTime)
      this.inputUnlockTime.value = settingsState.defaultUnlockTime;
    if (this.inputInterval)
      this.inputInterval.value = settingsState.defaultInterval;
  }

  saveSettings() {
    const data = {
      testerName: this.inputName.value.trim(),
      stdPasscode: this.inputPasscode.value.trim(),
      stdCard: this.inputCard.value.trim(),
      stdFingerprint: this.inputFingerprint.value.trim(),
      defaultCycles: parseInt(this.inputCycles.value) || 100,
      defaultUnlockTime: parseInt(this.inputUnlockTime.value) || 5,
      defaultInterval: parseInt(this.inputInterval.value) || 5,
    };

    settingsState.save(data);
    toast.success("Configurações salvas com sucesso!");

    // Dispatch a custom event in case other panels (like TestsPanel) want to listen and update immediately
    document.dispatchEvent(new CustomEvent("settings-updated"));
  }
}
