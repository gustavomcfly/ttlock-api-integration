import { lockApi } from "../api/lockApi.js";
import { cyclicTestApi } from "../api/cyclicTestApi.js";
import { session } from "../utils/session.js";
import { toast } from "../utils/toast.js";
import { cyclicTestStore } from "../state/cyclicTestStore.js";
import { reportApi } from "../api/reportApi.js";
import { settingsState } from "../state/settingsState.js";

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

    this._bindFormEvents();
  }

  _bindFormEvents() {
    this._btnStart?.addEventListener("click", () => this._handleStart());
    this._btnRefreshLocks?.addEventListener("click", () => this._fetchLocks());
  }

  async syncLock() {
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
    const userId = session.getUserId();
    if (!userId) return; // sessão antiga, sem userId local — faça login novamente
    try {
      const data = await cyclicTestApi.listByUser(userId);
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

    // Testes que conhecíamos e estavam ativos, mas não aparecem mais na lista de ativos
    // -> terminaram (completed/failed/stopped). Busca o estado final e avança a fila.
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
        this._launchTest(next);
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
      userId: session.getUserId(),
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
  async _launchTest(config) {
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
      this._selectedId = data.testId;

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
      this._render();
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
    this._knownIds.delete(id);
    cyclicTestStore.delete(id);
    if (this._selectedId === id) this._selectedId = null;
    if (this._editingId === id) this._editingId = null;
    this._render();
  }

  selectTest(id) {
    const wasSelected = id === this._selectedId;
    this._selectedId = wasSelected ? null : id;
    this._editingId = null;
    this._render();

    if (!wasSelected) {
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
    if (this._selectedId === id) this._selectedId = null;
    if (this._editingId === id) this._editingId = null;
    this._render();
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
    if (this._selectedId && cyclicTestStore.get(this._selectedId)) {
      if (this._editingId === this._selectedId) {
        this._renderEditForm(cyclicTestStore.get(this._selectedId));
      } else {
        this._renderDetail(this._selectedId);
      }
    } else {
      this._selectedId = null;
      if (this._detailContainer) this._detailContainer.classList.add("hidden");
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
      this._listContainer.innerHTML = `<p class="text-muted-foreground py-10 text-center text-sm">Nenhum teste ativo. Configure um teste ao lado.</p>`;
      return;
    }

    this._listContainer.innerHTML = tests
      .map((test) => {
        const pct = Math.min(
          100,
          (test.completedCycles / test.totalCycles) * 100,
        );
        const isSelected = test.id === this._selectedId;
        const qLen = this._queueLengthFor(String(test.lockId));
        const isDone = ["completed", "failed", "stopped"].includes(test.status);

        return `
        <div class="mb-2 last:mb-0 cursor-pointer rounded-xl border px-4 py-3 transition-all ${
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border bg-background hover:border-primary/40 hover:bg-card"
        }" data-action="select" data-id="${test.id}">
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="min-w-0 flex-1 flex items-center gap-2">
              ${this._statusDot(test.status)}
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">${test.lockName}</p>
                <p class="text-muted-foreground text-xs tabular-nums">
                  ${test.completedCycles.toFixed(1)} / ${test.totalCycles} ciclos
                  ${test.battery !== null ? ` · 🔋 ${test.battery}%` : ""}
                  ${test.totalFailures > 0 ? ` · <span class="text-destructive">${test.totalFailures} falha(s)</span>` : ""}
                  ${qLen > 0 && !isDone ? ` · <span class="text-yellow-500">${qLen} na fila</span>` : ""}
                  ${test.startedBy ? ` · <span class="italic">por ${test.startedBy}</span>` : ""}
                </p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              ${this._statusBadge(test.status)}
              <button data-action="delete" data-id="${test.id}" class="text-muted-foreground hover:text-destructive ml-1 cursor-pointer rounded p-1 transition-colors" title="Remover">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          <div class="bg-muted h-1 w-full overflow-hidden rounded-full">
            <div class="h-1 rounded-full transition-all duration-500 ${isDone && test.status === "completed" ? "bg-green-500" : isDone ? "bg-muted-foreground" : "bg-primary"}" style="width: ${pct.toFixed(2)}%"></div>
          </div>
          ${!isDone ? `<p class="text-muted-foreground mt-1.5 truncate text-xs">${test.currentAction}</p>` : ""}
        </div>`;
      })
      .join("");

    this._listContainer.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
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
    const circumference = 2 * Math.PI * 46;
    const offset = circumference * (1 - pct / 100);
    const eta = this._calcETA(test);
    const isDone = ["completed", "failed", "stopped"].includes(test.status);

    const elapsed = test.startedAt
      ? (test.completedAt ? test.completedAt : Date.now()) - test.startedAt
      : 0;
    const recentLogs = [...test.log].reverse().slice(0, 30);
    const isActive = ["running", "paused"].includes(test.status);
    const qLen = this._queueLengthFor(String(test.lockId));

    this._detailContainer.innerHTML = `
      <div class="bg-card border-border overflow-hidden rounded-2xl border shadow-sm">
        <div class="border-border flex flex-col items-start justify-between gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
          <div class="flex items-center gap-3">
            ${this._statusDot(test.status)}
            <div>
              <h3 class="font-semibold">${test.lockName}</h3>
              <p class="text-muted-foreground text-xs font-mono">ID ${test.lockId}${test.startedBy ? ` · por ${test.startedBy}` : ""}</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${test.status === "running" ? `<button data-ctrl="pause" class="bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Pausar</button>` : ""}
            ${test.status === "paused" ? `<button data-ctrl="resume" class="bg-primary text-primary-foreground hover:bg-primary-hover flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>Retomar</button>` : ""}
            ${isActive ? `<button data-ctrl="stop" class="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>Parar</button>` : ""}
            ${isDone ? `<button data-ctrl="save-report" class="bg-secondary text-secondary-foreground hover:opacity-90 flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Salvar Relatório</button>` : ""}
            <button data-ctrl="edit" class="bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editar</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-0 border-b border-border md:grid-cols-4">
          <div class="flex flex-col items-center justify-center gap-2 border-r border-border p-5">
            <svg width="104" height="104" viewBox="0 0 104 104">
              <circle cx="52" cy="52" r="46" fill="none" stroke="hsl(var(--muted))" stroke-width="7"/>
              <circle cx="52" cy="52" r="46" fill="none" stroke="hsl(var(--primary))" stroke-width="7" stroke-linecap="round" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 52 52)"/>
              <text x="52" y="47" text-anchor="middle" dominant-baseline="central" style="font-size:18px;font-weight:700;font-family:Inter,sans-serif;fill:currentColor">${test.completedCycles.toFixed(1)}</text>
              <text x="52" y="65" text-anchor="middle" dominant-baseline="central" style="font-size:10px;font-family:Inter,sans-serif;fill:currentColor;opacity:.45">de ${test.totalCycles}</text>
            </svg>
            <span class="text-muted-foreground text-xs font-medium">Ciclos</span>
          </div>
          <div class="flex flex-col items-center justify-center gap-1 border-r border-border p-5">
            <p class="text-3xl font-bold tabular-nums">${test.battery !== null ? test.battery + "%" : "--"}</p>
            <p class="text-muted-foreground text-xs">Bateria</p>
            ${test.battery !== null && test.lowBatteryThreshold > 0 && test.battery <= test.lowBatteryThreshold ? `<span class="mt-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">Baixa</span>` : ""}
          </div>
          <div class="flex flex-col items-center justify-center gap-1 border-r border-border p-5">
            <p class="text-3xl font-bold tabular-nums">${isDone ? this._formatDuration(elapsed) : eta ? this._formatDuration(eta) : "--"}</p>
            <p class="text-muted-foreground text-xs">${isDone ? "Duração total" : "Estimativa"}</p>
            ${!isDone ? `<p class="text-muted-foreground mt-0.5 text-xs">${this._formatDuration(elapsed)} decorrido</p>` : ""}
          </div>
          <div class="flex flex-col items-center justify-center gap-2 p-5">
            ${this._statusBadge(test.status)}
            <p class="text-muted-foreground text-xs tabular-nums">${test.totalFailures} falha(s)</p>
            ${qLen > 0 && !isDone ? `<span class="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-600">${qLen} na fila</span>` : ""}
            ${isActive ? `<p class="text-muted-foreground mt-1 max-w-[130px] truncate text-center text-xs">${test.currentAction}</p>` : ""}
          </div>
        </div>
        <div class="border-border flex flex-wrap gap-x-6 gap-y-1 border-b px-5 py-3">
          <span class="text-muted-foreground text-xs">Intervalo (s): <strong class="text-foreground">${test.delayBetweenCycles}s</strong></span>
          <span class="text-muted-foreground text-xs">Falhas máx.: <strong class="text-foreground">${test.maxConsecutiveFailures}</strong></span>
          <span class="text-muted-foreground text-xs">Bat. alerta: <strong class="text-foreground">${test.lowBatteryThreshold > 0 ? test.lowBatteryThreshold + "%" : "desativado"}</strong></span>
        </div>
        <div class="p-5">
          <h4 class="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">Log de eventos</h4>
          ${recentLogs.length === 0 ? `<p class="text-muted-foreground py-6 text-center text-sm">Sem eventos ainda.</p>` : `<div class="overflow-hidden rounded-lg border border-border"><table class="w-full border-collapse text-sm"><thead><tr class="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide"><th class="px-3 py-2 text-left font-semibold w-24">Hora</th><th class="px-3 py-2 text-left font-semibold w-20">Tipo</th><th class="px-3 py-2 text-left font-semibold">Mensagem</th></tr></thead><tbody class="divide-y divide-border/50">${recentLogs.map((entry) => `<tr class="hover:bg-muted/20 transition-colors"><td class="px-3 py-1.5 font-mono text-xs text-muted-foreground whitespace-nowrap">${this._formatTime(entry.time)}</td><td class="px-3 py-1.5">${this._logTypeBadge(entry.type)}</td><td class="px-3 py-1.5 text-xs ${this._logLevelClass(entry.level)}">${entry.message}</td></tr>`).join("")}</tbody></table></div>`}
        </div>
      </div>`;

    this._detailContainer.querySelectorAll("[data-ctrl]").forEach((btn) => {
      btn.addEventListener("click", () => {
        switch (btn.dataset.ctrl) {
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

    this._detailContainer.innerHTML = `
      <div class="bg-card border-border rounded-2xl border p-5 shadow-sm">
        <div class="mb-5 flex items-center justify-between">
          <div><h3 class="font-semibold">Editar Parâmetros</h3><p class="text-muted-foreground text-xs">${test.lockName} · ${test.completedCycles.toFixed(1)} ciclos já realizados</p></div>
          <button id="btn-edit-cancel" class="text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors">Cancelar</button>
        </div>
      

        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div class="flex flex-col gap-1.5"><label class="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Total de ciclos</label><input type="number" id="edit-total-cycles" value="${test.totalCycles}" min="${minCycles}" max="99999" class="border-border bg-background focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"/><span class="text-muted-foreground text-xs">Mín: ${minCycles}</span></div>
          <div class="flex flex-col gap-1.5"><label class="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Intervalo (s)</label><input type="number" id="edit-delay-cycles" value="${test.delayBetweenCycles}" min="0" max="3600" class="border-border bg-background focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"/></div>
          <div class="flex flex-col gap-1.5"><label class="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Falhas máx.</label><input type="number" id="edit-max-failures" value="${test.maxConsecutiveFailures}" min="1" max="100" class="border-border bg-background focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"/></div>
          <div class="flex flex-col gap-1.5"><label class="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Bat. alerta (%)</label><input type="number" id="edit-battery-threshold" value="${test.lowBatteryThreshold}" min="0" max="100" class="border-border bg-background focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"/></div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button id="btn-edit-cancel2" class="bg-muted text-muted-foreground hover:bg-secondary cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors">Cancelar</button>
          <button id="btn-edit-save" class="bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer rounded-lg px-4 py-2 text-sm font-bold transition-colors">Salvar</button>
        </div>
      </div>`;

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

  _statusDot(status) {
    const map = {
      running: "bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.4)]",
      paused: "bg-yellow-500",
      completed: "bg-blue-500",
      failed: "bg-destructive",
      stopped: "bg-muted-foreground",
    };
    return `<span class="inline-block h-2 w-2 shrink-0 rounded-full ${map[status] || map.stopped}"></span>`;
  }

  _statusBadge(status) {
    const styles = {
      running: "bg-green-500/10 text-green-600 border-green-500/20",
      paused: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      failed: "bg-destructive/10 text-destructive border-destructive/20",
      stopped: "bg-muted text-muted-foreground border-border",
    };
    const labels = {
      running: "Em execução",
      paused: "Pausado",
      completed: "Concluído",
      failed: "Falhou",
      stopped: "Parado",
    };
    return `<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[status] || styles.stopped}">${labels[status] || status}</span>`;
  }

  _logTypeBadge(type) {
    const styles = {
      UNLOCK: "bg-green-500/10 text-green-700",
      LOCK: "bg-blue-500/10 text-blue-700",
      BATTERY: "bg-yellow-500/10 text-yellow-700",
      SYSTEM: "bg-muted text-muted-foreground",
    };
    return `<span class="rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${styles[type] || styles.SYSTEM}">${type}</span>`;
  }

  _logLevelClass(level) {
    return (
      {
        success: "text-green-600",
        error: "text-destructive",
        warning: "text-yellow-600",
        info: "text-muted-foreground",
      }[level] || "text-muted-foreground"
    );
  }
}
