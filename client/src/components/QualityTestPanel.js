import { qualityApi } from "../api/qualityApi.js";
import { lockApi } from "../api/lockApi.js";
import { session } from "../utils/session.js";
import { appState } from "../state/appState.js";
import { settingsState } from "../state/settingsState.js";
import { toast } from "../utils/toast.js";
import { reportApi } from "../api/reportApi.js";

export class QualityTestPanel {
  constructor() {
    this.viewQualityTest = document.getElementById("view-quality-test");
    this.viewQualityProgress = document.getElementById(
      "view-quality-test-progress",
    );

    this.selectLock = document.getElementById("select-quality-lock");
    this.btnStart = document.getElementById("btn-start-quality-test");
    this.btnBackProgress = document.getElementById("btn-back-quality-list");
    this.resultsList = document.getElementById("quality-results-list");
    this.statusText = document.getElementById("quality-test-status");
    this.tbody = document.getElementById("quality-test-list-body");

    this.lblTester = document.getElementById("qt-param-tester");
    this.lblPasscode = document.getElementById("qt-param-passcode");
    this.lblCard = document.getElementById("qt-param-card");
    this.lblFingerprint = document.getElementById("qt-param-fingerprint");

    this.pollInterval = null;
    this.listPollInterval = null;
    this.currentTestId = null;

    this.bindEvents();
    this.loadSettings();
  }

  bindEvents() {
    if (this.btnStart) {
      this.btnStart.addEventListener("click", () => this.startTest());
    }

    if (this.btnBackProgress) {
      this.btnBackProgress.addEventListener("click", () => {
        if (this.viewQualityProgress)
          this.viewQualityProgress.classList.add("hidden");
        if (this.viewQualityTest)
          this.viewQualityTest.classList.remove("hidden");
        this.currentTestId = null;
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
        this.fetchTestList();
      });
      const btnSave = document.getElementById("btn-save-quality-report");
      if (btnSave) btnSave.classList.add("hidden");
    }

    document.addEventListener("settings-updated", () => this.loadSettings());

    if (this.selectLock) {
      this.selectLock.addEventListener("focus", () =>
        this.populateLockDropdown(),
      );
      this.selectLock.addEventListener("mouseenter", () =>
        this.populateLockDropdown(),
      );
      this.selectLock.addEventListener("change", (e) => {
        const lockId = e.target.value;
        const lockName = e.target.options[e.target.selectedIndex].text;
        if (lockId) {
          appState.setLock(lockId, lockName);
        } else {
          appState.clearLock();
        }
        this.currentTestId = null;
        this.fetchTestList();
      });
    }

    if (this.tbody) {
      this.tbody.addEventListener("click", (e) => this.handleTableAction(e));
    }

    document.addEventListener("navigate-quality-test", () => {
      this.loadSettings();
      this.populateLockDropdown();
      this.startListPolling();
    });
  }

  loadSettings() {
    if (this.lblTester)
      this.lblTester.innerText = settingsState.testerName || "Não Definido";
    if (this.lblPasscode)
      this.lblPasscode.innerText = settingsState.stdPasscode || "Não Definido";
    if (this.lblCard)
      this.lblCard.innerText = settingsState.stdCard || "Não Definido";
    if (this.lblFingerprint)
      this.lblFingerprint.innerText =
        settingsState.stdFingerprint || "Não Definido";
  }

  async populateLockDropdown() {
    try {
      if (!this.selectLock) return;

      if (this.selectLock.options.length <= 1) {
        this.selectLock.innerHTML =
          '<option value="" class="text-foreground font-medium">Carregando fechaduras...</option>';
        this.selectLock.disabled = true;

        const data = await lockApi.fetchLocks(session.getToken());

        if (data && data.errcode !== undefined && data.errcode !== 0) {
          this.selectLock.innerHTML =
            '<option value="">Erro ao buscar da API</option>';
          this.selectLock.disabled = false;
          return;
        }

        let locks = [];
        if (data && Array.isArray(data.list)) {
          locks = data.list;
        } else if (data && data.data && Array.isArray(data.data.list)) {
          locks = data.data.list;
        }

        const onlineLocks = locks.filter((l) => l.hasGateway === 1);

        if (onlineLocks.length === 0) {
          this.selectLock.innerHTML =
            '<option value="" class="text-foreground font-medium">Nenhuma fechadura online encontrada.</option>';
        } else {
          this.selectLock.innerHTML =
            '<option value="" class="text-foreground font-medium">Selecione uma fechadura online...</option>';
          onlineLocks.forEach((lock) => {
            const option = document.createElement("option");
            option.value = lock.lockId;
            option.className = "text-foreground font-medium";
            option.innerText = lock.lockAlias || "Sem Nome";
            this.selectLock.appendChild(option);
          });
        }
        this.selectLock.disabled = false;
      }

      if (appState.selectedLockId && this.selectLock) {
        const exists = Array.from(this.selectLock.options).some(
          (opt) => opt.value == appState.selectedLockId,
        );
        if (exists) {
          this.selectLock.value = appState.selectedLockId;
        }
      }
    } catch (err) {
      if (this.selectLock) {
        this.selectLock.innerHTML =
          '<option value="">Falha de conexão com o servidor</option>';
        this.selectLock.disabled = false;
      }
    }
  }

  startListPolling() {
    this.fetchTestList();
    if (!this.listPollInterval) {
      this.listPollInterval = setInterval(() => this.fetchTestList(), 2500);
    }
  }

  async fetchTestList() {
    try {
      const res = await qualityApi.getList();
      if (res.errcode === 0 && res.list) {
        this.renderList(res.list);
      }
    } catch (err) {}
  }

  renderList(list) {
    if (!this.tbody) return;

    if (list.length === 0) {
      this.tbody.innerHTML = `<tr><td colspan="5" class="text-muted-foreground py-10 text-center text-sm">Nenhuma auditoria realizada.</td></tr>`;
      return;
    }

    this.tbody.innerHTML = "";
    list.sort((a, b) => b.startTime - a.startTime);

    list.forEach((test) => {
      const total = test.steps.length;
      const completed = test.steps.filter(
        (s) => s.status === "sucesso" || s.status === "falha",
      ).length;
      const progress = ((completed / total) * 100).toFixed(0);

      let statusBadge = "";
      if (test.status === "executando") {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-green-400/10 text-green-400 border border-green-400/20">Executando</span>`;
      } else if (test.status === "concluido") {
        const allSuccess = test.steps.every((s) => s.status === "sucesso");
        if (allSuccess) {
          statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">Aprovado</span>`;
        } else {
          statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">Reprovado</span>`;
        }
      } else {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Erro</span>`;
      }
      const btnSave = document.getElementById("btn-save-quality-report");
      if (btnSave) {
        btnSave.classList.remove("hidden");
        btnSave.onclick = () => this.saveReport();
      }

      const isSelected = test.testId === this.currentTestId;
      const rowClass = isSelected
        ? "border-primary/30 bg-primary/5"
        : "hover:bg-muted/30";
      const btnText = isSelected ? "Ocultar" : "Visualizar";
      const btnClass = isSelected
        ? "bg-primary text-primary-foreground hover:bg-primary/90"
        : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground";

      const tr = document.createElement("tr");
      tr.className = `transition-colors group ${rowClass}`;
      tr.innerHTML = `
            <td class="px-4 py-3 text-center font-mono text-xs text-primary">${test.testId}</td>
            <td class="px-4 py-3 text-center text-sm font-medium truncate max-w-[160px]" title="${test.lockName || ""}">${test.lockName || "—"}</td>
            <td class="px-4 py-3 text-center text-sm font-semibold">${completed} / ${total} <span class="text-muted-foreground ml-1">(${progress}%)</span></td>
            <td class="px-4 py-3 text-center">${statusBadge}</td>
            <td class="px-4 py-3 text-center">
                <button class="btn-view-test inline-flex items-center justify-center gap-1 ${btnClass} px-3 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer" data-id="${test.testId}">${btnText}</button>
            </td>
         `;
      this.tbody.appendChild(tr);
    });
  }

  handleTableAction(e) {
    const btn = e.target.closest(".btn-view-test");
    if (btn) {
      this.currentTestId = btn.getAttribute("data-id");
      if (this.viewQualityTest) this.viewQualityTest.classList.add("hidden");
      if (this.viewQualityProgress)
        this.viewQualityProgress.classList.remove("hidden");
      this.fetchStatus();
      this.startPolling();
      this.fetchTestList();
    }
  }

  async startTest() {
    const lockId = this.selectLock.value;
    const lockName =
      this.selectLock.options[this.selectLock.selectedIndex].text;

    if (!lockId)
      return toast.error("Selecione uma fechadura para iniciar o teste.");

    const checkboxes = document.querySelectorAll(
      ".qt-criteria-checkbox:checked",
    );
    const criteria = Array.from(checkboxes).map((cb) => cb.value);

    if (criteria.length === 0)
      return toast.error("Selecione ao menos um critério para teste.");
    if (!settingsState.testerName)
      return toast.error(
        "Configure seu perfil de Testador em 'Configurações' primeiro.",
      );

    const testParams = {
      lockName: lockName,
      testerName: settingsState.testerName,
      stdPasscode: settingsState.stdPasscode,
      stdCard: settingsState.stdCard,
      stdFingerprint: settingsState.stdFingerprint,
    };

    this.btnStart.disabled = true;

    try {
      const res = await qualityApi.startTest(
        session.getToken(),
        lockId,
        criteria,
        testParams,
      );
      if (res.errcode === 0 && res.data) {
        this.currentTestId = res.data.testId;
        if (this.viewQualityTest) this.viewQualityTest.classList.add("hidden");
        if (this.viewQualityProgress)
          this.viewQualityProgress.classList.remove("hidden");
        this.startPolling();
        this.fetchTestList();
      } else {
        toast.error("Falha ao criar script de teste.");
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    } finally {
      this.btnStart.disabled = false;
    }
  }

  startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.fetchStatus(), 1000);
  }

  async fetchStatus() {
    if (!this.currentTestId) return;
    try {
      const res = await qualityApi.getStatus(this.currentTestId);
      if (res.errcode === 0 && res.data) {
        this.renderSteps(res.data);
        if (res.data.status === "concluido") {
          clearInterval(this.pollInterval);
          this.pollInterval = null;

          const allSuccess = res.data.steps.every(
            (s) => s.status === "sucesso",
          );
          this.statusText.innerText = allSuccess
            ? "Auditoria Aprovada"
            : "Auditoria Reprovada";
          this.statusText.className = allSuccess
            ? "text-green-500 font-bold"
            : "text-red-500 font-bold";

          this.fetchTestList();
        } else {
          this.statusText.innerText = "Executando Script...";
          this.statusText.className = "text-green-400 font-bold animate-pulse";
        }
      }
    } catch (e) {}
  }

  async saveReport() {
    if (!this.currentTestId) return;
    try {
      const res = await qualityApi.getStatus(this.currentTestId);
      if (res.errcode !== 0 || !res.data) {
        return toast.error("Não foi possível obter os dados do teste.");
      }
      const testerName = settingsState.testerName || null;
      const data = await reportApi.saveQuality(res.data, testerName);
      if (data.success) {
        toast.success("Relatório salvo com sucesso!");
      } else {
        toast.error(data.message || "Erro ao salvar relatório.");
      }
    } catch {
      toast.error("Falha ao comunicar com o servidor.");
    }
  }

  renderSteps(testData) {
    this.resultsList.innerHTML = "";

    testData.steps.forEach((step) => {
      const li = document.createElement("li");
      li.className =
        "flex flex-col justify-center p-4 rounded-lg border border-border bg-background shadow-sm mb-3";

      let icon = "";
      let textColor = "text-muted-foreground";

      if (step.status === "pendente") {
        icon = `<div class="w-5 h-5 rounded-full border-2 border-muted shrink-0"></div>`;
      } else if (step.status === "executando") {
        textColor = "text-green-400 font-bold";
        icon = `<svg class="animate-spin w-5 h-5 text-green-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>`;
      } else if (step.status === "sucesso") {
        textColor = "text-foreground font-semibold";
        icon = `<div class="bg-green-500/20 text-green-500 rounded-full p-0.5 shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
      } else if (step.status === "falha") {
        textColor = "text-red-500 font-semibold";
        icon = `<div class="bg-red-500/20 text-red-500 rounded-full p-0.5 shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>`;
      }

      let logsHtml = "";
      if (step.logs && step.logs.length > 0) {
        logsHtml = `
          <div class="mt-3 pl-8 flex flex-col gap-1.5">
            ${step.logs
              .map(
                (log) => `
              <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-1.5 rounded">
                <span class="w-1.5 h-1.5 rounded-full bg-border shrink-0"></span>
                <span>${log}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        `;
      }

      li.innerHTML = `
        <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
                ${icon}
                <span class="text-sm ${textColor}">${step.name}</span>
            </div>
            ${step.errorMsg ? `<span class="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20 truncate ml-4 max-w-[200px] sm:max-w-xs" title="${step.errorMsg}">${step.errorMsg}</span>` : ""}
        </div>
        ${logsHtml}
      `;
      this.resultsList.appendChild(li);
    });
  }
}