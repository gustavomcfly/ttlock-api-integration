import { lockApi } from "../api/lockApi.js";
import { cyclicTestApi } from "../api/cyclicTestApi.js";
import { session } from "../utils/session.js";
import { toast } from "../utils/toast.js";
import { cyclicTestStore } from "../state/cyclicTestStore.js";
import { reportApi } from "../api/reportApi.js";
import { settingsState } from "../state/settingsState.js";

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

const svg = (inner, size = 14, sw = 2, fill = "none") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const ICONS = {
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  battery:
    '<rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/>',
  repeat:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  alert:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  pause:
    '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  stop: '<rect x="3" y="3" width="18" height="18" rx="2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  sliders:
    '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
  cycle:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
};

const STATUS_TONE = {
  running: "primary",
  paused: "warning",
  completed: "success",
  failed: "danger",
  stopped: "neutral",
};
const FINISHED = ["completed", "failed", "stopped"];

// O teste de ciclagem roda inteiramente no backend (server/cyclicEngine.js), persistido
// no Postgres via Prisma. Este painel é um cliente "burro": inicia/pausa/retoma/para o
// teste por HTTP e faz polling do status — por isso o teste continua mesmo se a aba for
// fechada ou o navegador for encerrado.
export class CyclicTestPanel {
  constructor() {
    this._selectedId = null;
    this._editingId = null;
    this._locks = [];
    this._refreshInterval = null;

    this._lockQueues = new Map();
    // ids que já vimos nesta sessão (para manter testes concluídos visíveis na lista)
    this._knownIds = new Set();

    this._lockSelect = document.getElementById("cyclic-lock-select");
    this._inputTotalCycles = document.getElementById("cyclic-total-cycles");
    this._inputDelayCycles = document.getElementById("cyclic-delay-cycles");
    this._inputMaxFailures = document.getElementById("cyclic-max-failures");
    this._inputBatteryThreshold = document.getElementById(
      "cyclic-battery-threshold",
    );
    this._btnStart = document.getElementById("btn-start-cyclic-test");
    this._btnRefreshLocks = document.getElementById("btn-cyclic-refresh-locks");

    this._listContainer = document.getElementById("cyclic-tests-list");
    this._detailContainer = document.getElementById("cyclic-test-detail");
    this._countBadge = document.getElementById("cyclic-tests-count");
    this._viewList = document.getElementById("view-cyclic-test");
    this._viewProgress = document.getElementById("view-cyclic-test-progress");
    this._btnBack = document.getElementById("btn-back-cyclic-list");

    this._bindFormEvents();
    this._applyDefaultsFromSettings();
    document.addEventListener("settings-updated", () =>
      this._applyDefaultsFromSettings(),
    );
  }

  _bindFormEvents() {
    this._btnStart?.addEventListener("click", () => this._handleStart());
    this._btnRefreshLocks?.addEventListener("click", () => this._fetchLocks());
    this._btnBack?.addEventListener("click", () => this._showList());
  }

  // Navegação entre a lista/configuração e a página de acompanhamento do teste
  _showList() {
    this._selectedId = null;
    this._editingId = null;
    this._viewProgress?.classList.add("hidden");
    this._viewList?.classList.remove("hidden");
    this._render();
  }

  _showProgress(id) {
    this._selectedId = id;
    this._editingId = null;
    this._viewList?.classList.add("hidden");
    this._viewProgress?.classList.remove("hidden");
    this._render();
  }

    _applyDefaultsFromSettings() {
    if (this._inputTotalCycles && settingsState.defaultCycles !== undefined) {
      this._inputTotalCycles.value = settingsState.defaultCycles;
    }
    if (this._inputDelayCycles && settingsState.defaultInterval !== undefined) {
      this._inputDelayCycles.value = settingsState.defaultInterval;
    }
  }

  async syncLock() {
    this._showList();
    this._applyDefaultsFromSettings();
    await this._fetchLocks();
    await this._loadUserHistory();
    await this._pollBackend();
    this._render();
    this._startRefresh();
  }

  _hasAnythingToWatch() {
    const hasActiveTest = cyclicTestStore
      .getAll()
      .some((t) => ["running", "paused"].includes(t.status));
    const hasQueued = Array.from(this._lockQueues.values()).some(
      (q) => q.length > 0,
    );
    return hasActiveTest || hasQueued;
  }

  _startRefreshIfNeeded() {
    if (this._hasAnythingToWatch()) this._startRefresh();
    else this._stopRefresh();
  }

  // Testes finalizados não vêm em /active (que só traz running/paused), então sem isso
  // eles "desapareceriam" a cada reload mesmo estando salvos no banco. Carrega o
  // histórico do usuário logado uma vez ao entrar na tela.
  async _loadUserHistory() {
    try {
      const data = await cyclicTestApi.listMine();
      if (data.success) {
        for (const row of data.list) {
          cyclicTestStore.upsertFromServer(row);
          this._knownIds.add(row.id);
        }
      }
    } catch (_) {
      // Backend indisponível: segue só com o que /active trouxer.
    }
  }

  deactivate() {
    this._stopRefresh();
  }

  _startRefresh() {
    this._stopRefresh();
    this._refreshInterval = setInterval(() => this._pollBackend(), 1500);
  }

  _stopRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  // ---------------------------------------------------------
  // Sincronização com o backend: busca testes ativos, detecta
  // transições (ex: running -> completed) e mantém a UI ao vivo.
  // ---------------------------------------------------------
  async _pollBackend() {
    let activeRows = [];
    try {
      const data = await cyclicTestApi.listActive();
      if (data.success) activeRows = data.list;
    } catch (e) {

      // Backend fora do ar momentaneamente: mantém último estado conhecido.
      this._render();
      return;
    }

    const activeIds = new Set(activeRows.map((r) => r.id));

    for (const row of activeRows) {
      cyclicTestStore.upsertFromServer(row);
      this._knownIds.add(row.id);
    }

    const finishedNow = [];
    for (const id of this._knownIds) {
      if (activeIds.has(id)) continue;
      const cached = cyclicTestStore.get(id);
      if (cached && ["running", "paused"].includes(cached.status)) {
        finishedNow.push(id);
      }
    }

    for (const id of finishedNow) {
      try {
        const data = await cyclicTestApi.get(id);
        if (data.success) {
          const test = cyclicTestStore.upsertFromServer(data.test);
          this._onTestFinished(test);
        }
      } catch (_) {}
    }

    this._render();
    this._startRefreshIfNeeded();
  }

  _onTestFinished(test) {
    if (test.status === "completed") {
      toast.success(
        `[${test.lockName}] Teste concluído! ${test.totalCycles} ciclos.`,
      );
    } else if (test.status === "failed") {
      toast.error(
        `[${test.lockName}] Teste encerrado por falhas consecutivas.`,
      );
    }

    const next = this._dequeue(String(test.lockId));
    if (next) {
      setTimeout(() => {
        toast.info(`[${next.lockName}] Iniciando próximo teste da fila...`);
        this._launchTest(next, { open: false });
      }, 1500);
    }
  }

  async _fetchLocks() {
    if (this._lockSelect) {
      this._lockSelect.innerHTML = '<option value="">Carregando...</option>';
    }
    try {
      const data = await lockApi.fetchLocks(session.getToken());
      this._locks = (data.list || []).filter((l) => l.hasGateway === 1);
      this._renderLockSelect();
    } catch (e) {
      if (this._lockSelect) {
        this._lockSelect.innerHTML =
          '<option value="">Erro ao carregar fechaduras</option>';
      }
    }
  }

  _renderLockSelect() {
    if (!this._lockSelect) return;
    if (this._locks.length === 0) {
      this._lockSelect.innerHTML =
        '<option value="">Nenhuma fechadura online encontrada</option>';
      return;
    }
    this._lockSelect.innerHTML = this._locks
      .map(
        (l) =>
          `<option value="${l.lockId}">${l.lockAlias || "Lock " + l.lockId} · 🔋 ${l.electricQuantity ?? "--"}%</option>`,
      )
      .join("");
  }

  _hasActiveLockTest(lockId) {
    return cyclicTestStore
      .getAll()
      .some(
        (t) =>
          String(t.lockId) === String(lockId) &&
          ["running", "paused"].includes(t.status),
      );
  }

  _enqueue(lockId, config) {
    if (!this._lockQueues.has(lockId)) this._lockQueues.set(lockId, []);
    this._lockQueues.get(lockId).push(config);
  }

  _dequeue(lockId) {
    const q = this._lockQueues.get(lockId);
    if (!q || q.length === 0) return null;
    return q.shift();
  }

  _queueLengthFor(lockId) {
    return this._lockQueues.get(lockId)?.length ?? 0;
  }

  async _handleStart() {
    const lockId = this._lockSelect?.value;
    const lockObj = this._locks.find(
      (l) => String(l.lockId) === String(lockId),
    );

    if (!lockId || !lockObj)
      return toast.error("Selecione uma fechadura online.");

    const totalCycles = parseInt(this._inputTotalCycles?.value);
    if (!totalCycles || totalCycles < 1)
      return toast.error("Número de ciclos inválido.");

    const config = {
      lockId,
      lockName: lockObj.lockAlias || `Lock ${lockId}`,
      totalCycles,
      delayBetweenCycles: Math.max(
        0,
        parseFloat(this._inputDelayCycles?.value) || 5,
      ),
      maxConsecutiveFailures: Math.max(
        1,
        parseInt(this._inputMaxFailures?.value) || 3,
      ),
      lowBatteryThreshold: Math.max(
        0,
        parseInt(this._inputBatteryThreshold?.value) || 20,
      ),
    };

    if (this._hasActiveLockTest(lockId)) {
      this._enqueue(lockId, config);
      const qLen = this._queueLengthFor(lockId);
      toast.info(
        `"${config.lockName}" já tem um teste em execução. Adicionado à fila (posição ${qLen}).`,
      );
      this._render();
      return;
    }

    await this._launchTest(config);
  }

  // ---------------------------------------------------------
  // Inicia o teste no BACKEND. Depois disso o navegador não faz
  // mais nada além de perguntar "como está indo?" periodicamente.
  // ---------------------------------------------------------
  async _launchTest(config, { open = true } = {}) {
    const token = session.getToken();
    if (!token) {
      toast.error(
        "Sessão expirada. Faça login novamente para iniciar o teste.",
      );
      return;
    }

    try {
      const data = await cyclicTestApi.start(config, token);
      if (!data.success) {
        toast.error(data.message || "Falha ao iniciar o teste no servidor.");
        return;
      }

      toast.success(
        `Teste iniciado no servidor: "${config.lockName}" · ${config.totalCycles} ciclos`,
      );
      this._knownIds.add(data.testId);

      // Popula o cache local imediatamente com o que sabemos, até o próximo poll confirmar.
      cyclicTestStore.upsertFromServer(
        data.test
          ? { ...data.test, logs: [] }
          : {
              id: data.testId,
              lockId: parseInt(config.lockId),
              totalCycles: config.totalCycles,
              completedCycles: 0,
              delayBetweenCycles: config.delayBetweenCycles,
              maxConsecutiveFailures: config.maxConsecutiveFailures,
              lowBatteryThreshold: config.lowBatteryThreshold,
              status: "running",
              totalFailures: 0,
              battery: null,
              startedAt: new Date().toISOString(),
              completedAt: null,
              logs: [],
            },
        config.lockName,
      );
      if (open) this._showProgress(data.testId);
      else this._render();
      await this._pollBackend();
    } catch (err) {
      console.error("Erro ao comunicar com o backend:", err);
      toast.error("Não foi possível iniciar o teste (backend indisponível).");
    }
  }

  async pauseTest(id) {
    const test = cyclicTestStore.get(id);
    if (!test || test.status !== "running") return;
    try {
      const data = await cyclicTestApi.pause(id);
      if (!data.success)
        return toast.error(data.message || "Não foi possível pausar.");
      toast.info("Teste pausado.");
    } catch (_) {
      toast.error("Falha ao comunicar com o servidor.");
    }
    await this._pollBackend();
  }

  async resumeTest(id) {
    const test = cyclicTestStore.get(id);
    if (!test || test.status !== "paused") return;
    try {
      const data = await cyclicTestApi.resume(id);
      if (!data.success)
        return toast.error(data.message || "Não foi possível retomar.");
      toast.info("Teste retomado.");
    } catch (_) {
      toast.error("Falha ao comunicar com o servidor.");
    }
    await this._pollBackend();
  }

  async stopTest(id) {
    const test = cyclicTestStore.get(id);
    if (!test || ["completed", "failed", "stopped"].includes(test.status))
      return;
    try {
      await cyclicTestApi.stop(id, {
        status: "stopped",
        batteryEnd: test.battery,
      });
    } catch (_) {
      toast.error("Falha ao comunicar com o servidor.");
    }
    await this._pollBackend();
  }

  selectTest(id) {
    this._showProgress(id);
    cyclicTestApi
      .get(id)
      .then((data) => {
        if (data.success) {
          cyclicTestStore.upsertFromServer(data.test);
          if (this._selectedId === id) this._render();
        }
      })
      .catch(() => {});
  }

  async editTest(id, updates) {
    try {
      const data = await cyclicTestApi.edit(id, updates);
      if (!data.success) {
        toast.error(data.message || "Não foi possível salvar as alterações.");
        return;
      }
      toast.success("Parâmetros atualizados.");
    } catch (_) {
      toast.error("Falha ao comunicar com o servidor.");
    }
    this._editingId = null;
    await this._pollBackend();
  }

  async deleteTest(id) {
    const test = cyclicTestStore.get(id);
    if (!test) return;
    if (!["completed", "failed", "stopped"].includes(test.status)) {
      try {
        await cyclicTestApi.stop(id, {
          status: "stopped",
          batteryEnd: test.battery,
        });
      } catch (_) {}
    }
    try {
      const data = await cyclicTestApi.remove(id);
      if (!data.success) {
        toast.error(
          data.message || "Não foi possível remover o teste no servidor.",
        );
        return;
      }
    } catch (_) {
      toast.error("Falha ao comunicar com o servidor.");
      return;
    }
    this._knownIds.delete(id);
    cyclicTestStore.delete(id);
    if (this._selectedId === id) this._showList();
    else this._render();
  }

  async saveReport(id) {
    const test = cyclicTestStore.get(id);
    if (!test) return;
    try {
      const data = await reportApi.saveCyclic(
        id,
        settingsState.testerName || null,
      );
      if (data.success) {
        toast.success("Relatório salvo com sucesso!");
      } else {
        toast.error(data.message || "Erro ao salvar relatório.");
      }
    } catch {
      toast.error("Falha ao comunicar com o servidor.");
    }
  }

  _render() {
    this._renderList();
    const test = this._selectedId && cyclicTestStore.get(this._selectedId);
    if (!test) {
      // teste removido/inexistente: não deixa o usuário numa página vazia
      if (this._selectedId) this._showList();
      return;
    }
    this._renderProgressHeader(test);
    if (this._editingId === test.id) {
      if (!document.getElementById("edit-total-cycles"))
        this._renderEditForm(test);
    } else this._renderDetail(test.id);
  }

  _renderProgressHeader(test) {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("cyclic-progress-lock", test.lockName);
    set("cyclic-progress-id", `ID ${test.lockId}`);
    const user = document.getElementById("cyclic-progress-user");
    if (user) {
      user.classList.toggle("hidden", !test.startedBy);
      user.innerHTML = `${svg(ICONS.user, 12)}${esc(test.startedBy)}`;
    }
  }

  _renderList() {
    if (!this._listContainer) return;
    const tests = cyclicTestStore.getAll();
    const activeCount = tests.filter((t) =>
      ["running", "paused"].includes(t.status),
    ).length;
    if (this._countBadge) this._countBadge.textContent = activeCount;

    if (tests.length === 0) {
      this._listContainer.innerHTML = `
        <tr><td colspan="5">
          <div class="ui-empty">
            <span class="ui-icon-tile ui-tone-neutral mb-2">${svg(ICONS.cycle, 20)}</span>
            <p class="text-sm font-semibold">Nenhum teste realizado</p>
            <p class="text-muted-foreground text-xs">Inicie o primeiro teste no painel acima.</p>
          </div>
        </td></tr>`;
      return;
    }

    this._listContainer.innerHTML = tests
      .map((test) => {
        const pct = Math.min(
          100,
          (test.completedCycles / test.totalCycles) * 100,
        );
        const qLen = this._queueLengthFor(String(test.lockId));
        const isDone = FINISHED.includes(test.status);
        const tone = STATUS_TONE[test.status] || "neutral";
        const id = esc(test.id);
        const meta = [
          test.battery !== null ? `Bateria ${test.battery}%` : "",
          test.startedBy ? `por ${esc(test.startedBy)}` : "",
        ]
          .filter(Boolean)
          .join(" · ");

        return `
          <tr class="ui-tone-${tone} ${test.id === this._selectedId ? "is-selected" : ""}">
            <td>
              <div class="flex max-w-64 items-center gap-2.5">
                <span class="text-muted-foreground shrink-0">${svg(ICONS.lock, 14)}</span>
                <div class="min-w-0">
                  <p class="truncate font-medium" title="${esc(test.lockName)}">${esc(test.lockName)}</p>
                  ${meta || qLen > 0 ? `<p class="text-muted-foreground truncate text-xs">${meta}${qLen > 0 && !isDone ? ` <span class="ui-chip ui-chip-tone ui-tone-warning">${qLen} na fila</span>` : ""}</p>` : ""}
                </div>
              </div>
            </td>
            <td>
              <div class="flex items-center gap-3">
                <div class="ui-progress min-w-24 flex-1 ${test.status === "running" ? "is-live" : ""}"><span style="width: ${pct.toFixed(2)}%"></span></div>
                <span class="w-28 shrink-0 text-right whitespace-nowrap text-xs font-semibold tabular-nums">${test.completedCycles.toFixed(1)}/${test.totalCycles}<span class="text-muted-foreground ml-1 font-normal">${pct.toFixed(0)}%</span></span>
              </div>
            </td>
            <td class="tabular-nums ${test.totalFailures > 0 ? "ui-tone-danger ui-text-tone font-semibold" : ""}">${test.totalFailures}</td>
            <td>${this._statusBadge(test.status)}</td>
            <td class="text-right">
              <div class="inline-flex items-center gap-1">
                <button type="button" data-action="select" data-id="${id}" class="ui-btn ui-btn-sm ${test.id === this._selectedId ? "ui-btn-primary" : "ui-btn-soft"}">Visualizar</button>
                <button type="button" data-action="delete" data-id="${id}" class="ui-btn ui-btn-ghost hover:text-destructive h-8 w-8 p-0" title="Remover" aria-label="Remover teste">${svg(ICONS.trash, 14)}</button>
              </div>
            </td>
          </tr>`;
      })
      .join("");

    this._listContainer.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", () => {
        const { action, id } = el.dataset;
        if (action === "select") this.selectTest(id);
        if (action === "delete") {
          const test = cyclicTestStore.get(id);
          const name = test?.lockName || "este teste";
          const running = test && ["running", "paused"].includes(test.status);
          const msg = running
            ? `Parar e remover o teste de "${name}"?`
            : `Remover o teste de "${name}"?`;
          if (confirm(msg)) this.deleteTest(id);
        }
      });
    });
  }

  _renderDetail(id) {
    const test = cyclicTestStore.get(id);
    if (!test || !this._detailContainer) return;
    this._detailContainer.classList.remove("hidden");

    const pct = Math.min(100, (test.completedCycles / test.totalCycles) * 100);
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - pct / 100);
    const eta = this._calcETA(test);
    const isDone = FINISHED.includes(test.status);
    const isActive = ["running", "paused"].includes(test.status);
    const tone = STATUS_TONE[test.status] || "neutral";

    const elapsed = test.startedAt
      ? (test.completedAt ? test.completedAt : Date.now()) - test.startedAt
      : 0;
    const recentLogs = [...test.log].reverse().slice(0, 30);
    const qLen = this._queueLengthFor(String(test.lockId));

    const lowBattery =
      test.battery !== null &&
      test.lowBatteryThreshold > 0 &&
      test.battery <= test.lowBatteryThreshold;
    const batteryTone =
      test.battery === null
        ? "neutral"
        : lowBattery || test.battery <= 20
          ? "danger"
          : test.battery <= 50
            ? "warning"
            : "success";

    const btn = (ctrl, cls, icon, label) =>
      `<button type="button" data-ctrl="${ctrl}" class="ui-btn ui-btn-sm ${cls}">${svg(icon, 13, 2.2)}${label}</button>`;

    const logRows = recentLogs
      .map(
        (entry) => `
          <tr>
            <td class="ui-mono text-muted-foreground whitespace-nowrap text-xs">${this._formatTime(entry.time)}</td>
            <td>${this._logTypeBadge(entry.type)}</td>
            <td class="text-xs ${this._logLevelClass(entry.level)}">${esc(entry.message)}</td>
          </tr>`,
      )
      .join("");

    this._detailContainer.innerHTML = `
      <section class="ui-panel ui-tone-${tone}">
        <div class="ui-panel-head">
          <div class="flex flex-wrap items-center gap-3">
            <h3 class="ui-panel-title">Status atual</h3>
            ${this._statusBadge(test.status)}
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${test.status === "running" ? btn("pause", "ui-btn-soft", ICONS.pause, "Pausar") : ""}
            ${test.status === "paused" ? btn("resume", "ui-btn-primary", ICONS.play, "Retomar") : ""}
            ${isActive ? btn("stop", "ui-btn-danger", ICONS.stop, "Parar") : ""}
            ${isDone ? btn("save-report", "ui-btn-primary", ICONS.file, "Salvar relatório") : ""}
            ${btn("edit", "ui-btn-soft", ICONS.edit, "Editar")}
          </div>
        </div>

        <div class="ui-section">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="ui-tile">
              <svg width="112" height="112" viewBox="0 0 104 104" role="img" aria-label="${pct.toFixed(0)}% dos ciclos">
                <circle cx="52" cy="52" r="${radius}" fill="none" stroke="hsl(var(--muted))" stroke-width="7"/>
                <circle cx="52" cy="52" r="${radius}" fill="none" style="stroke:hsl(var(--tone))" stroke-width="7" stroke-linecap="round" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 52 52)"/>
                <text x="52" y="47" text-anchor="middle" dominant-baseline="central" style="font-size:18px;font-weight:700;font-family:Inter,sans-serif;fill:currentColor">${test.completedCycles.toFixed(1)}</text>
                <text x="52" y="65" text-anchor="middle" dominant-baseline="central" style="font-size:10px;font-family:Inter,sans-serif;fill:currentColor;opacity:.5">de ${test.totalCycles}</text>
              </svg>
              <p class="text-muted-foreground text-xs">Ciclos · ${pct.toFixed(0)}% concluído</p>
            </div>

            <div class="ui-tile ui-tone-${batteryTone}">
              <span class="ui-icon-tile ui-icon-tile-sm">${svg(ICONS.battery, 18)}</span>
              <p class="text-3xl leading-tight font-bold tracking-tight tabular-nums">${test.battery !== null ? test.battery + "%" : "--"}</p>
              <div class="ui-progress w-full max-w-32"><span style="width: ${test.battery ?? 0}%"></span></div>
              <p class="text-muted-foreground text-xs">Bateria${lowBattery ? ' · <strong class="ui-text-tone">baixa</strong>' : ""}</p>
            </div>

            <div class="ui-tile ui-tone-info">
              <span class="ui-icon-tile ui-icon-tile-sm">${svg(ICONS.clock, 18)}</span>
              <p class="text-3xl leading-tight font-bold tracking-tight tabular-nums">${isDone ? this._formatDuration(elapsed) : eta ? this._formatDuration(eta) : "--"}</p>
              <p class="text-muted-foreground text-xs">${isDone ? "Duração total" : "Tempo restante estimado"}</p>
              ${!isDone ? `<p class="text-muted-foreground text-xs">${this._formatDuration(elapsed)} decorrido</p>` : ""}
            </div>

            <div class="ui-tile ui-tone-${test.totalFailures > 0 ? "danger" : "success"}">
              <span class="ui-icon-tile ui-icon-tile-sm">${svg(test.totalFailures > 0 ? ICONS.alert : '<path d="M20 6 9 17l-5-5"/>', 18)}</span>
              <p class="text-3xl leading-tight font-bold tracking-tight tabular-nums ${test.totalFailures > 0 ? "ui-text-tone" : ""}">${test.totalFailures}</p>
              <p class="text-muted-foreground text-xs">falha(s) no total</p>
              ${qLen > 0 && !isDone ? `<span class="ui-chip ui-chip-tone ui-tone-warning">${qLen} na fila</span>` : ""}
              ${isActive ? `<p class="text-muted-foreground max-w-full truncate text-xs" title="${esc(test.currentAction)}">${esc(test.currentAction)}</p>` : ""}
            </div>
          </div>
        </div>

        <div class="ui-section">
          <div class="mb-3 flex items-center gap-2">
            ${svg(ICONS.sliders, 15)}
            <h4 class="ui-section-title">Parâmetros do teste</h4>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="ui-chip">Intervalo <strong class="text-foreground">${test.delayBetweenCycles}s</strong></span>
            <span class="ui-chip">Falhas máx. <strong class="text-foreground">${test.maxConsecutiveFailures}</strong></span>
            <span class="ui-chip">Bateria baixa <strong class="text-foreground">${test.lowBatteryThreshold > 0 ? test.lowBatteryThreshold + "%" : "desativado"}</strong></span>
          </div>
        </div>

        <div class="ui-section">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              ${svg(ICONS.list, 15)}
              <h4 class="ui-section-title">Log de eventos</h4>
            </div>
            ${test.log.length > 30 ? `<span class="ui-hint">Últimos 30 de ${test.log.length} eventos</span>` : ""}
          </div>
          ${
            recentLogs.length === 0
              ? `<div class="border-border text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">Sem eventos ainda.</div>`
              : `<div class="border-border overflow-hidden rounded-xl border"><div class="ui-scroll"><table class="ui-table"><thead><tr><th class="w-28">Hora</th><th class="w-28">Tipo</th><th>Mensagem</th></tr></thead><tbody>${logRows}</tbody></table></div></div>`
          }
        </div>
      </section>`;

    this._detailContainer.querySelectorAll("[data-ctrl]").forEach((btnEl) => {
      btnEl.addEventListener("click", () => {
        switch (btnEl.dataset.ctrl) {
          case "pause":
            this.pauseTest(id);
            break;
          case "resume":
            this.resumeTest(id);
            break;
          case "stop":
            if (confirm(`Parar o teste de "${test.lockName}"?`))
              this.stopTest(id);
            break;
          case "edit":
            this._editingId = id;
            this._render();
            break;
          case "save-report":
            this.saveReport(id);
            break;
        }
      });
    });
  }

  _renderEditForm(test) {
    if (!this._detailContainer) return;
    this._detailContainer.classList.remove("hidden");
    const minCycles = Math.ceil(test.completedCycles);

    const field = (label, id, value, suffix, attrs, hint = "") => `
      <div class="ui-field">
        <label for="${id}" class="ui-label">${label}</label>
        <div class="ui-input-wrap">
          <input type="number" id="${id}" value="${value}" ${attrs} class="ui-input"/>
          <span class="ui-suffix">${suffix}</span>
        </div>
        ${hint ? `<span class="ui-hint">${hint}</span>` : ""}
      </div>`;

    this._detailContainer.innerHTML = `
      <section class="ui-panel">
        <div class="ui-panel-head">
          <div class="flex items-center gap-3">
            <span class="ui-icon-tile ui-icon-tile-sm">${svg(ICONS.edit, 18)}</span>
            <div>
              <h3 class="ui-panel-title">Editar parâmetros</h3>
              <p class="ui-panel-subtitle">${esc(test.lockName)} · ${test.completedCycles.toFixed(1)} ciclos já realizados</p>
            </div>
          </div>
          <button type="button" id="btn-edit-cancel" class="ui-btn ui-btn-ghost ui-btn-sm">Cancelar</button>
        </div>

        <div class="ui-section">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            ${field("Total de ciclos", "edit-total-cycles", test.totalCycles, "ciclos", `min="${minCycles}" max="99999"`, `Mínimo: ${minCycles}`)}
            ${field("Intervalo", "edit-delay-cycles", test.delayBetweenCycles, "seg", `min="0" max="3600"`, "Entre comandos")}
            ${field("Falhas máx.", "edit-max-failures", test.maxConsecutiveFailures, "falhas", `min="1" max="100"`, "Consecutivas até parar")}
            ${field("Bateria baixa", "edit-battery-threshold", test.lowBatteryThreshold, "%", `min="0" max="100"`, "0 desativa o alerta")}
          </div>
        </div>

        <div class="ui-panel-foot flex justify-end gap-2">
          <button type="button" id="btn-edit-cancel2" class="ui-btn ui-btn-soft">Cancelar</button>
          <button type="button" id="btn-edit-save" class="ui-btn ui-btn-primary">Salvar alterações</button>
        </div>
      </section>`;

    const cancelFn = () => {
      this._editingId = null;
      this._render();
    };
    document
      .getElementById("btn-edit-cancel")
      ?.addEventListener("click", cancelFn);
    document
      .getElementById("btn-edit-cancel2")
      ?.addEventListener("click", cancelFn);
    document.getElementById("btn-edit-save")?.addEventListener("click", () => {
      const newTotal = parseInt(
        document.getElementById("edit-total-cycles").value,
      );
      const updates = {
        totalCycles: Math.max(minCycles, newTotal || minCycles),
        delayBetweenCycles: Math.max(
          0,
          parseFloat(document.getElementById("edit-delay-cycles").value) || 0,
        ),
        maxConsecutiveFailures: Math.max(
          1,
          parseInt(document.getElementById("edit-max-failures").value) || 1,
        ),
        lowBatteryThreshold: Math.max(
          0,
          parseInt(document.getElementById("edit-battery-threshold").value) ||
            0,
        ),
      };
      this.editTest(test.id, updates);
    });
  }

  _calcETA(test) {
    if (
      test.status !== "running" ||
      test.completedCycles <= 0 ||
      !test.startedAt
    )
      return null;
    const elapsed = Date.now() - test.startedAt;
    const rate = test.completedCycles / elapsed;
    const remaining = test.totalCycles - test.completedCycles;
    return remaining / rate;
  }

  _formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  _formatTime(ts) {
    return new Date(ts).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  _statusBadge(status) {
    const labels = {
      running: "Em execução",
      paused: "Pausado",
      completed: "Concluído",
      failed: "Falhou",
      stopped: "Parado",
    };
    const tone = STATUS_TONE[status] || "neutral";
    const live = status === "running" ? "is-live" : "";
    return `<span class="ui-badge ui-badge-dot ui-tone-${tone} ${live}">${labels[status] || esc(status)}</span>`;
  }

  _logTypeBadge(type) {
    const tones = {
      UNLOCK: "success",
      LOCK: "info",
      BATTERY: "warning",
      SYSTEM: "neutral",
    };
    return `<span class="ui-chip ui-chip-tone ui-tone-${tones[type] || "neutral"} ui-mono font-semibold">${esc(type)}</span>`;
  }

  _logLevelClass(level) {
    return (
      {
        success: "ui-tone-success ui-text-tone",
        error: "ui-tone-danger ui-text-tone",
        warning: "ui-tone-warning ui-text-tone",
        info: "text-muted-foreground",
      }[level] || "text-muted-foreground"
    );
  }
}
