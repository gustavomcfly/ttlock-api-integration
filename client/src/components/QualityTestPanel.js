import { qualityApi } from "../api/qualityApi.js";
import { lockApi } from "../api/lockApi.js";
import { session } from "../utils/session.js";
import { appState } from "../state/appState.js";
import { settingsState } from "../state/settingsState.js";
import { toast } from "../utils/toast.js";
import { reportApi } from "../api/reportApi.js";

// ---------------------------------------------------------
// Helpers visuais (somente apresentação)
// ---------------------------------------------------------
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const svg = (inner, size = 14, sw = 2) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const ICON_CHECK = '<path d="M20 6 9 17l-5-5"/>';
const ICON_X = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>';
const ICON_LOCK =
  '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
const ICON_SPINNER = '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>';

// Resultado final de uma auditoria concluída
const isApproved = (test) => test.steps.every((s) => s.status === "sucesso");

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

    this.lblProgressLock = document.getElementById("quality-progress-lock");
    this.lblProgressId = document.getElementById("quality-progress-id");
    this.progressLabel = document.getElementById("quality-progress-label");
    this.progressPct = document.getElementById("quality-progress-pct");
    this.progressTrack = document.getElementById("quality-progress-track");
    this.progressBar = document.getElementById("quality-progress-bar");
    this.progressChips = document.getElementById("quality-progress-chips");
    this.btnSaveReport = document.getElementById("btn-save-quality-report");
    this.criteriaCount = document.getElementById("qt-criteria-count");
    this._lastStepsHtml = "";

    this.pollInterval = null;
    this.listPollInterval = null;
    this._active = false; // tela visível (só então o polling pode existir)
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
    }

    if (this.btnSaveReport) {
      this.btnSaveReport.classList.add("hidden");
      this.btnSaveReport.addEventListener("click", () => this.saveReport());
    }

    this.bindCriteriaControls();

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
      this._active = true;
      this.loadSettings();
      this.populateLockDropdown();
      this.startListPolling();
    });
  }

  bindCriteriaControls() {
    const boxes = () =>
      Array.from(document.querySelectorAll(".qt-criteria-checkbox"));
    const updateCount = () => {
      const all = boxes();
      const checked = all.filter((cb) => cb.checked).length;
      if (this.criteriaCount)
        this.criteriaCount.textContent = `${checked} de ${all.length}`;
    };

    boxes().forEach((cb) => cb.addEventListener("change", updateCount));
    document
      .getElementById("btn-qt-select-all")
      ?.addEventListener("click", () => {
        boxes().forEach((cb) => (cb.checked = true));
        updateCount();
      });
    document
      .getElementById("btn-qt-select-none")
      ?.addEventListener("click", () => {
        boxes().forEach((cb) => (cb.checked = false));
        updateCount();
      });
    updateCount();
  }

  // Limpa o painel de progresso ao trocar de auditoria (evita mostrar dados da anterior)
  resetProgressView() {
    this._lastStepsHtml = "";
    if (this.resultsList) this.resultsList.innerHTML = "";
    if (this.lblProgressLock) this.lblProgressLock.textContent = "—";
    if (this.lblProgressId) this.lblProgressId.textContent = "—";
    if (this.progressLabel) this.progressLabel.textContent = "0 de 0 etapas";
    if (this.progressPct) this.progressPct.textContent = "0%";
    if (this.progressBar) this.progressBar.style.width = "0%";
    if (this.progressChips) this.progressChips.innerHTML = "";
    if (this.btnSaveReport) this.btnSaveReport.classList.add("hidden");
    this.setStatus("Carregando...", "neutral");
  }

  setStatus(label, tone, live = false) {
    if (!this.statusText) return;
    this.statusText.textContent = label;
    this.statusText.className = `ui-badge ui-badge-dot ui-tone-${tone} ${live ? "is-live" : ""}`;
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
  }

  // Chamado pelo main.js ao sair da tela: nenhuma requisição deve continuar em segundo plano
  deactivate() {
    this._active = false;
    this.stopListPolling();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.currentTestId = null;
  }

  stopListPolling() {
    if (this.listPollInterval) {
      clearInterval(this.listPollInterval);
      this.listPollInterval = null;
    }
  }

  // O polling da lista só existe enquanto a tela está ativa E há auditoria em execução
  syncListPolling(list) {
    const hasRunning = list.some((t) => t.status === "executando");
    if (this._active && hasRunning) {
      if (!this.listPollInterval)
        this.listPollInterval = setInterval(() => this.fetchTestList(), 2500);
    } else {
      this.stopListPolling();
    }
  }

  async fetchTestList() {
    try {
      const res = await qualityApi.getList();
      if (res.errcode === 0 && res.list) {
        this.renderList(res.list);
        this.syncListPolling(res.list);
      }
    } catch (err) {}
  }

  renderList(list) {
    if (!this.tbody) return;

    if (list.length === 0) {
      this.tbody.innerHTML = `
        <tr><td colspan="5">
          <div class="ui-empty">
            <span class="ui-icon-tile ui-tone-neutral mb-2">${svg('<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>', 20)}</span>
            <p class="text-sm font-semibold">Nenhuma auditoria realizada</p>
            <p class="text-muted-foreground text-xs">Inicie a primeira auditoria no painel acima.</p>
          </div>
        </td></tr>`;
      return;
    }

    list.sort((a, b) => b.startTime - a.startTime);

    this.tbody.innerHTML = list
      .map((test) => {
        const total = test.steps.length;
        const completed = test.steps.filter(
          (s) => s.status === "sucesso" || s.status === "falha",
        ).length;
        const pct = total ? Math.round((completed / total) * 100) : 0;

        let tone;
        let label;
        let live = false;
        if (test.status === "executando") {
          tone = "primary";
          label = "Executando";
          live = true;
        } else if (test.status === "concluido") {
          tone = isApproved(test) ? "success" : "danger";
          label = isApproved(test) ? "Aprovado" : "Reprovado";
        } else {
          tone = "warning";
          label = "Erro";
        }

        const isSelected = test.testId === this.currentTestId;
        const id = esc(test.testId);

        return `
          <tr class="ui-tone-${tone} ${isSelected ? "is-selected" : ""}">
            <td><span class="ui-chip ui-mono" title="${id}">${id.slice(0, 8)}</span></td>
            <td>
              <div class="flex max-w-56 items-center gap-2">
                <span class="text-muted-foreground shrink-0">${svg(ICON_LOCK, 14)}</span>
                <span class="truncate font-medium" title="${esc(test.lockName)}">${esc(test.lockName) || "—"}</span>
              </div>
            </td>
            <td>
              <div class="flex items-center gap-3">
                <div class="ui-progress min-w-24 flex-1 ${live ? "is-live" : ""}"><span style="width: ${pct}%"></span></div>
                <span class="w-28 shrink-0 text-right whitespace-nowrap text-xs font-semibold tabular-nums">${completed}/${total}<span class="text-muted-foreground ml-1 font-normal">${pct}%</span></span>
              </div>
            </td>
            <td><span class="ui-badge ui-badge-dot ${live ? "is-live" : ""}">${label}</span></td>
            <td class="text-right">
              <div class="inline-flex items-center gap-1">
                <button type="button" class="btn-view-test ui-btn ui-btn-sm ${isSelected ? "ui-btn-primary" : "ui-btn-soft"}" data-id="${id}">${isSelected ? "Ocultar" : "Visualizar"}</button>
                <button type="button" class="btn-delete-test ui-btn ui-btn-ghost hover:text-destructive h-8 w-8 p-0" data-id="${id}" ${live ? "disabled" : ""} title="${live ? "Aguarde a auditoria terminar para apagar" : "Apagar auditoria"}" aria-label="Apagar auditoria">${svg('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>', 14)}</button>
              </div>
            </td>
          </tr>`;
      })
      .join("");
  }

  async deleteTest(testId) {
    if (!confirm("Apagar esta auditoria do histórico?")) return;
    try {
      const res = await qualityApi.deleteTest(testId);
      if (res.errcode === 0) {
        toast.success("Auditoria apagada.");
        this.fetchTestList();
      } else {
        toast.error(res.errmsg || "Não foi possível apagar a auditoria.");
      }
    } catch (err) {
      toast.error("Falha ao comunicar com o servidor.");
    }
  }

  handleTableAction(e) {
    const del = e.target.closest(".btn-delete-test");
    if (del) {
      this.deleteTest(del.getAttribute("data-id"));
      return;
    }
    const btn = e.target.closest(".btn-view-test");
    if (btn) {
      this.currentTestId = btn.getAttribute("data-id");
      this.resetProgressView();
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
        this.resetProgressView();
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

          const approved = isApproved(res.data);
          this.setStatus(
            approved ? "Auditoria aprovada" : "Auditoria reprovada",
            approved ? "success" : "danger",
          );
          if (this.btnSaveReport) this.btnSaveReport.classList.remove("hidden");

          this.fetchTestList();
        } else {
          this.setStatus("Executando roteiro...", "primary", true);
          if (this.btnSaveReport) this.btnSaveReport.classList.add("hidden");
        }
      }
    } catch (e) {}
  }

  async saveReport() {
    if (!this.currentTestId) return;
    try {
      const testerName = settingsState.testerName || null;
      const data = await reportApi.saveQuality(this.currentTestId, testerName);
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
    if (!this.resultsList) return;
    const steps = testData.steps;
    const total = steps.length;
    const count = (st) => steps.filter((x) => x.status === st).length;
    const success = count("sucesso");
    const failed = count("falha");
    const running = count("executando");
    const pending = count("pendente");
    const done = success + failed;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const finished = testData.status === "concluido";

    // --- cabeçalho: fechadura + id ---
    if (this.lblProgressLock)
      this.lblProgressLock.textContent = testData.lockName || "—";
    if (this.lblProgressId)
      this.lblProgressId.textContent = (testData.testId || "").slice(0, 8);

    // --- resumo de progresso ---
    const barTone = finished
      ? failed === 0
        ? "success"
        : "danger"
      : "primary";
    if (this.progressLabel)
      this.progressLabel.textContent = `${done} de ${total} etapas`;
    if (this.progressPct) this.progressPct.textContent = `${pct}%`;
    if (this.progressTrack)
      this.progressTrack.className = `ui-progress ui-tone-${barTone} ${finished ? "" : "is-live"}`;
    if (this.progressBar) this.progressBar.style.width = `${pct}%`;
    if (this.progressChips) {
      const chip = (tone, text) =>
        `<span class="ui-chip ui-chip-tone ui-tone-${tone}">${text}</span>`;
      this.progressChips.innerHTML = [
        success > 0 ? chip("success", `${success} aprovada(s)`) : "",
        failed > 0 ? chip("danger", `${failed} com falha`) : "",
        running > 0 ? chip("primary", `${running} em execução`) : "",
        pending > 0 ? chip("neutral", `${pending} pendente(s)`) : "",
      ].join("");
    }

    // --- linha do tempo das etapas ---
    const stateMap = {
      pendente: { tone: "neutral", cls: "is-pending", label: "Pendente" },
      executando: { tone: "primary", cls: "is-running", label: "Executando" },
      sucesso: { tone: "success", cls: "is-done", label: "Concluída" },
      falha: { tone: "danger", cls: "is-failed", label: "Falhou" },
    };

    const html = steps
      .map((step, i) => {
        const st = stateMap[step.status] || stateMap.pendente;
        let marker = String(i + 1);
        if (step.status === "executando")
          marker = `<span class="animate-spin">${svg(ICON_SPINNER, 16, 2.5)}</span>`;
        else if (step.status === "sucesso") marker = svg(ICON_CHECK, 16, 3);
        else if (step.status === "falha") marker = svg(ICON_X, 16, 3);

        const logs =
          step.logs && step.logs.length > 0
            ? `<div class="ui-log ui-mono">${step.logs
                .map((log) => `<div class="ui-log-line">${esc(log)}</div>`)
                .join("")}</div>`
            : "";

        const error = step.errorMsg
          ? `<div class="ui-chip-tone ui-tone-danger mt-2 rounded-lg px-2.5 py-1.5 text-xs">${esc(step.errorMsg)}</div>`
          : "";

        return `
          <li class="ui-step ui-tone-${st.tone} ${st.cls}">
            <span class="ui-step-marker">${marker}</span>
            <div class="ui-step-card">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-sm font-semibold ${step.status === "pendente" ? "text-muted-foreground" : ""}">${esc(step.name)}</span>
                <span class="ui-badge ui-badge-dot ${step.status === "executando" ? "is-live" : ""}">${st.label}</span>
              </div>
              ${error}
              ${logs}
            </div>
          </li>`;
      })
      .join("");

    // Só redesenha se algo mudou: evita reiniciar a animação do spinner a cada polling
    if (html !== this._lastStepsHtml) {
      this._lastStepsHtml = html;
      this.resultsList.innerHTML = html;
    }
  }
}
