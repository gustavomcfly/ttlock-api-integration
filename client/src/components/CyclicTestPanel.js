import { lockApi } from '../api/lockApi.js';
import { session } from '../utils/session.js';
import { toast } from '../utils/toast.js';
import { cyclicTestStore } from '../state/cyclicTestStore.js';

export class CyclicTestPanel {
  constructor() {
    this._selectedId = null;
    this._editingId = null;
    this._locks = [];
    this._refreshInterval = null;

    // per-lock queue: lockId -> [config, config, ...]
    this._lockQueues = new Map();

    // Form refs
    this._lockSelect = document.getElementById('cyclic-lock-select');
    this._inputTotalCycles = document.getElementById('cyclic-total-cycles');
    this._inputDelayAction = document.getElementById('cyclic-delay-action');
    this._inputHoldTime = document.getElementById('cyclic-hold-time');
    this._inputDelayCycles = document.getElementById('cyclic-delay-cycles');
    this._inputMaxFailures = document.getElementById('cyclic-max-failures');
    this._inputBatteryThreshold = document.getElementById('cyclic-battery-threshold');
    this._btnStart = document.getElementById('btn-start-cyclic-test');
    this._btnRefreshLocks = document.getElementById('btn-cyclic-refresh-locks');

    // Container refs
    this._listContainer = document.getElementById('cyclic-tests-list');
    this._detailContainer = document.getElementById('cyclic-test-detail');
    this._countBadge = document.getElementById('cyclic-tests-count');

    this._bindFormEvents();
  }

  _bindFormEvents() {
    this._btnStart?.addEventListener('click', () => this._handleStart());
    this._btnRefreshLocks?.addEventListener('click', () => this._fetchLocks());
  }

  async syncLock() {
    await this._fetchLocks();
    this._render();
    this._startRefresh();
  }

  deactivate() {
    this._stopRefresh();
  }

  _startRefresh() {
    this._stopRefresh();
    this._refreshInterval = setInterval(() => this._render(), 1000);
  }

  _stopRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  // ─── LOCK FETCHING ──────────────────────────────────────────────────────────

  async _fetchLocks() {
    if (this._lockSelect) {
      this._lockSelect.innerHTML = '<option value="">Carregando...</option>';
    }
    try {
      const data = await lockApi.fetchLocks(session.getToken());
      this._locks = (data.list || []).filter(l => l.hasGateway === 1);
      this._renderLockSelect();
    } catch (e) {
      if (this._lockSelect) {
        this._lockSelect.innerHTML = '<option value="">Erro ao carregar fechaduras</option>';
      }
    }
  }

  _renderLockSelect() {
    if (!this._lockSelect) return;
    if (this._locks.length === 0) {
      this._lockSelect.innerHTML = '<option value="">Nenhuma fechadura online encontrada</option>';
      return;
    }
    this._lockSelect.innerHTML = this._locks
      .map(l => `<option value="${l.lockId}">${l.lockAlias || 'Lock ' + l.lockId} · 🔋 ${l.electricQuantity ?? '--'}%</option>`)
      .join('');
  }

  // ─── QUEUE HELPERS ──────────────────────────────────────────────────────────

  _hasActiveLockTest(lockId) {
    return cyclicTestStore.getAll().some(
      t => String(t.lockId) === String(lockId) && ['running', 'paused'].includes(t.status)
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

  // ─── TEST CREATION ──────────────────────────────────────────────────────────

  async _handleStart() {
    const lockId = this._lockSelect?.value;
    const lockObj = this._locks.find(l => String(l.lockId) === String(lockId));

    if (!lockId || !lockObj) return toast.error('Selecione uma fechadura online.');

    const totalCycles = parseInt(this._inputTotalCycles?.value);
    if (!totalCycles || totalCycles < 1) return toast.error('Número de ciclos inválido.');

    const config = {
      lockId,
      lockName: lockObj.lockAlias || `Lock ${lockId}`,
      totalCycles,
      delayBeforeAction: Math.max(1, parseFloat(this._inputDelayAction?.value) || 3),
      holdTime: Math.max(1, parseFloat(this._inputHoldTime?.value) || 5),
      delayBetweenCycles: Math.max(0, parseFloat(this._inputDelayCycles?.value) || 5),
      maxConsecutiveFailures: Math.max(1, parseInt(this._inputMaxFailures?.value) || 3),
      lowBatteryThreshold: Math.max(0, parseInt(this._inputBatteryThreshold?.value) || 20),
    };

    if (this._hasActiveLockTest(lockId)) {
      this._enqueue(lockId, config);
      const qLen = this._queueLengthFor(lockId);
      toast.info(`"${config.lockName}" já tem um teste em execução. Adicionado à fila (posição ${qLen}).`);
      this._render();
      return;
    }

    this._launchTest(config);
  }

  _launchTest(config) {
    const test = cyclicTestStore.create(config);
    this._selectedId = test.id;
    this._render();
    toast.success(`Teste iniciado: "${config.lockName}" · ${config.totalCycles} ciclos`);
    this._runTest(test);
  }

  // ─── TEST LOOP ──────────────────────────────────────────────────────────────

  async _runTest(test) {
    while (test.completedCycles < test.totalCycles) {
      if (test._cancel || test.status === 'failed' || test.status === 'stopped') break;

      test.currentAction = `Aguardando ${test.delayBeforeAction}s antes do desbloqueio...`;
      await this._sleep(test.delayBeforeAction * 1000, test);
      if (test._cancel || test.status === 'failed' || test.status === 'stopped') break;

      // ── Unlock ──────────────────────────────────────────────────────────────
      test.currentAction = 'Enviando desbloqueio...';
      this._addLog(test, 'UNLOCK', 'Solicitando desbloqueio', 'info');

      let unlockOk = false;
      try {
        const r = await lockApi.remoteUnlock(session.getToken(), test.lockId);
        if (r.errcode === 0) {
          test.completedCycles += 0.5;
          test.consecutiveFailures = 0;
          unlockOk = true;
          this._addLog(test, 'UNLOCK', `Desbloqueio OK · ${test.completedCycles.toFixed(1)} ciclos`, 'success');
        } else {
          throw new Error(r.errmsg || `errcode ${r.errcode}`);
        }
      } catch (e) {
        test.totalFailures++;
        test.consecutiveFailures++;
        this._addLog(test, 'UNLOCK', `Falha: ${e.message}`, 'error');
        if (test.consecutiveFailures >= test.maxConsecutiveFailures) {
          test.status = 'failed';
          test.currentAction = `Parado: ${test.consecutiveFailures} falhas consecutivas.`;
          this._addLog(test, 'SYSTEM', `Limite de falhas atingido (${test.maxConsecutiveFailures}).`, 'error');
          toast.error(`[${test.lockName}] Teste encerrado por falhas consecutivas.`);
          break;
        }
        await this._sleep(test.delayBetweenCycles * 1000, test);
        continue;
      }

      if (!unlockOk || test._cancel || test.status === 'failed') break;

      // ── Hold ─────────────────────────────────────────────────────────────────
      test.currentAction = `Aberta — aguardando ${test.holdTime}s...`;
      await this._sleep(test.holdTime * 1000, test);
      if (test._cancel || test.status === 'failed' || test.status === 'stopped') break;

      // ── Lock ─────────────────────────────────────────────────────────────────
      test.currentAction = 'Enviando travamento...';
      this._addLog(test, 'LOCK', 'Solicitando travamento', 'info');

      try {
        const r = await lockApi.remoteLock(session.getToken(), test.lockId);
        if (r.errcode === 0) {
          test.completedCycles += 0.5;
          test.consecutiveFailures = 0;
          this._addLog(test, 'LOCK', `Travamento OK · ciclo ${test.completedCycles.toFixed(1)} concluído`, 'success');
        } else {
          throw new Error(r.errmsg || `errcode ${r.errcode}`);
        }
      } catch (e) {
        test.totalFailures++;
        test.consecutiveFailures++;
        this._addLog(test, 'LOCK', `Falha: ${e.message}`, 'error');
        if (test.consecutiveFailures >= test.maxConsecutiveFailures) {
          test.status = 'failed';
          test.currentAction = `Parado: ${test.consecutiveFailures} falhas consecutivas.`;
          this._addLog(test, 'SYSTEM', `Limite de falhas atingido (${test.maxConsecutiveFailures}).`, 'error');
          toast.error(`[${test.lockName}] Teste encerrado por falhas consecutivas.`);
          break;
        }
      }

      if (test._cancel || test.status === 'failed' || test.status === 'stopped') break;

      // ── Battery check every 5 full cycles ───────────────────────────────────
      const fullCycles = Math.floor(test.completedCycles);
      if (fullCycles > 0 && fullCycles % 5 === 0 && test.completedCycles % 1 === 0) {
        try {
          const details = await lockApi.getLockDetails(session.getToken(), test.lockId);
          if (details.electricQuantity !== undefined) {
            test.battery = details.electricQuantity;
            this._addLog(test, 'BATTERY', `Bateria: ${test.battery}%`, 'info');
            if (test.lowBatteryThreshold > 0 && test.battery <= test.lowBatteryThreshold) {
              toast.error(`[${test.lockName}] Bateria baixa: ${test.battery}% (limite: ${test.lowBatteryThreshold}%)`);
              this._addLog(test, 'BATTERY', `ALERTA: ${test.battery}% ≤ ${test.lowBatteryThreshold}%`, 'warning');
            }
          }
        } catch (_) { /* non-fatal */ }
      }

      // ── Delay between cycles ─────────────────────────────────────────────────
      if (test.completedCycles < test.totalCycles && test.delayBetweenCycles > 0) {
        test.currentAction = `Ciclo ${test.completedCycles.toFixed(1)} completo — aguardando ${test.delayBetweenCycles}s...`;
        await this._sleep(test.delayBetweenCycles * 1000, test);
      }
    }

    // ── Final state ───────────────────────────────────────────────────────────
    if (test.status === 'failed') {
      test.completedAt = Date.now();
    } else if (test._cancel || test.status === 'stopped') {
      test.status = 'stopped';
      test.completedAt = Date.now();
      test.currentAction = 'Teste interrompido manualmente.';
      this._addLog(test, 'SYSTEM', 'Interrompido pelo usuário.', 'info');
    } else if (test.completedCycles >= test.totalCycles) {
      test.status = 'completed';
      test.completedAt = Date.now();
      test.currentAction = `Concluído! ${test.totalCycles} ciclos realizados.`;
      this._addLog(test, 'SYSTEM', `Concluído. Total de falhas: ${test.totalFailures}.`, 'success');
      toast.success(`[${test.lockName}] Teste concluído! ${test.totalCycles} ciclos.`);
    }

    // ── Dequeue next test for this lock ───────────────────────────────────────
    const next = this._dequeue(String(test.lockId));
    if (next) {
      setTimeout(() => {
        toast.info(`[${next.lockName}] Iniciando próximo teste da fila...`);
        this._launchTest(next);
      }, 1500);
    }
  }

  // ─── SLEEP ──────────────────────────────────────────────────────────────────

  async _sleep(ms, test) {
    const step = 100;
    let remaining = ms;
    while (remaining > 0) {
      if (!test || test._cancel || test.status === 'failed' || test.status === 'stopped') return;
      if (test.status !== 'paused') remaining -= step;
      await new Promise(r => setTimeout(r, step));
    }
  }

  // ─── CONTROLS ───────────────────────────────────────────────────────────────

  pauseTest(id) {
    const test = cyclicTestStore.get(id);
    if (!test || test.status !== 'running') return;
    test.status = 'paused';
    test.currentAction = 'Pausado.';
    this._addLog(test, 'SYSTEM', 'Teste pausado.', 'info');
    this._render();
  }

  resumeTest(id) {
    const test = cyclicTestStore.get(id);
    if (!test || test.status !== 'paused') return;
    test.status = 'running';
    test.currentAction = 'Retomando...';
    this._addLog(test, 'SYSTEM', 'Teste retomado.', 'info');
    this._render();
  }

  stopTest(id) {
    const test = cyclicTestStore.get(id);
    if (!test || ['completed', 'failed', 'stopped'].includes(test.status)) return;
    test._cancel = true;
    test.status = 'stopped';
    this._render();
  }

  deleteTest(id) {
    const test = cyclicTestStore.get(id);
    if (!test) return;
    if (!['completed', 'failed', 'stopped'].includes(test.status)) {
      test._cancel = true;
      test.status = 'stopped';
    }
    cyclicTestStore.delete(id);
    if (this._selectedId === id) this._selectedId = null;
    if (this._editingId === id) this._editingId = null;
    this._render();
  }

  selectTest(id) {
    this._selectedId = (id === this._selectedId) ? null : id;
    this._editingId = null;
    this._render();
  }

  editTest(id, updates) {
    cyclicTestStore.update(id, updates);
    this._editingId = null;
    toast.success('Parâmetros atualizados.');
    this._render();
  }

  // ─── RENDER ORCHESTRATOR ────────────────────────────────────────────────────

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
      if (this._detailContainer) this._detailContainer.classList.add('hidden');
    }
  }

  // ─── TEST LIST ───────────────────────────────────────────────────────────────

  _renderList() {
    if (!this._listContainer) return;
    const tests = cyclicTestStore.getAll();

    // Count only active tests for the badge
    const activeCount = tests.filter(t => ['running', 'paused'].includes(t.status)).length;
    if (this._countBadge) this._countBadge.textContent = activeCount;

    if (tests.length === 0) {
      this._listContainer.innerHTML = `
        <p class="text-muted-foreground py-10 text-center text-sm">
          Nenhum teste ativo. Configure um teste ao lado.
        </p>`;
      return;
    }

    this._listContainer.innerHTML = tests.map(test => {
      const pct = Math.min(100, (test.completedCycles / test.totalCycles) * 100);
      const isSelected = test.id === this._selectedId;
      const qLen = this._queueLengthFor(String(test.lockId));
      const isDone = ['completed', 'failed', 'stopped'].includes(test.status);

      return `
        <div class="mb-2 last:mb-0 cursor-pointer rounded-xl border px-4 py-3 transition-all ${isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:border-primary/40 hover:bg-card'}"
          data-action="select" data-id="${test.id}">

          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="min-w-0 flex-1 flex items-center gap-2">
              ${this._statusDot(test.status)}
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">${test.lockName}</p>
                <p class="text-muted-foreground text-xs tabular-nums">
                  ${test.completedCycles.toFixed(1)} / ${test.totalCycles} ciclos
                  ${test.battery !== null ? ` · 🔋 ${test.battery}%` : ''}
                  ${test.totalFailures > 0 ? ` · <span class="text-destructive">${test.totalFailures} falha(s)</span>` : ''}
                  ${qLen > 0 && !isDone ? ` · <span class="text-yellow-500">${qLen} na fila</span>` : ''}
                </p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              ${this._statusBadge(test.status)}
              <button data-action="delete" data-id="${test.id}"
                class="text-muted-foreground hover:text-destructive ml-1 cursor-pointer rounded p-1 transition-colors"
                title="Remover">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="bg-muted h-1 w-full overflow-hidden rounded-full">
            <div class="h-1 rounded-full transition-all duration-500 ${isDone && test.status === 'completed' ? 'bg-green-500' : isDone ? 'bg-muted-foreground' : 'bg-primary'}"
              style="width: ${pct.toFixed(2)}%"></div>
          </div>

          ${!isDone ? `<p class="text-muted-foreground mt-1.5 truncate text-xs">${test.currentAction}</p>` : ''}
        </div>`;
    }).join('');

    this._listContainer.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const { action, id } = el.dataset;
        if (action === 'select') this.selectTest(id);
        if (action === 'delete') {
          const test = cyclicTestStore.get(id);
          const name = test?.lockName || 'este teste';
          const running = test && ['running', 'paused'].includes(test.status);
          const msg = running ? `Parar e remover o teste de "${name}"?` : `Remover o teste de "${name}"?`;
          if (confirm(msg)) this.deleteTest(id);
        }
      });
    });
  }

  // ─── TEST DETAIL ─────────────────────────────────────────────────────────────

  _renderDetail(id) {
    const test = cyclicTestStore.get(id);
    if (!test || !this._detailContainer) return;

    this._detailContainer.classList.remove('hidden');

    const pct = Math.min(100, (test.completedCycles / test.totalCycles) * 100);
    const circumference = 2 * Math.PI * 46;
    const offset = circumference * (1 - pct / 100);
    const eta = this._calcETA(test);
    const isDone = ['completed', 'failed', 'stopped'].includes(test.status);
    // FIX: freeze elapsed once the test ends
    const elapsed = test.startedAt
      ? (test.completedAt ? test.completedAt : Date.now()) - test.startedAt
      : 0;
    const recentLogs = [...test.log].reverse().slice(0, 30);
    const isActive = ['running', 'paused'].includes(test.status);
    const qLen = this._queueLengthFor(String(test.lockId));

    this._detailContainer.innerHTML = `
      <div class="bg-card border-border overflow-hidden rounded-2xl border shadow-sm">

        <!-- Header -->
        <div class="border-border flex flex-col items-start justify-between gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
          <div class="flex items-center gap-3">
            ${this._statusDot(test.status)}
            <div>
              <h3 class="font-semibold">${test.lockName}</h3>
              <p class="text-muted-foreground text-xs font-mono">ID ${test.lockId}</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${test.status === 'running' ? `
              <button data-ctrl="pause"
                class="bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                Pausar
              </button>` : ''}
            ${test.status === 'paused' ? `
              <button data-ctrl="resume"
                class="bg-primary text-primary-foreground hover:bg-primary-hover flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Retomar
              </button>` : ''}
            ${isActive ? `
              <button data-ctrl="stop"
                class="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                Parar
              </button>` : ''}
            <button data-ctrl="edit"
              class="bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar
            </button>
          </div>
        </div>

        <!-- Stats grid -->
        <div class="grid grid-cols-2 gap-0 border-b border-border md:grid-cols-4">

          <!-- Progress ring -->
          <div class="flex flex-col items-center justify-center gap-2 border-r border-border p-5">
            <svg width="104" height="104" viewBox="0 0 104 104">
              <circle cx="52" cy="52" r="46" fill="none" stroke="hsl(var(--muted))" stroke-width="7"/>
              <circle cx="52" cy="52" r="46" fill="none"
                stroke="hsl(var(--primary))" stroke-width="7"
                stroke-linecap="round"
                stroke-dasharray="${circumference.toFixed(2)}"
                stroke-dashoffset="${offset.toFixed(2)}"
                transform="rotate(-90 52 52)"/>
              <text x="52" y="47" text-anchor="middle" dominant-baseline="central"
                style="font-size:18px;font-weight:700;font-family:Inter,sans-serif;fill:currentColor">
                ${test.completedCycles.toFixed(1)}
              </text>
              <text x="52" y="65" text-anchor="middle" dominant-baseline="central"
                style="font-size:10px;font-family:Inter,sans-serif;fill:currentColor;opacity:.45">
                de ${test.totalCycles}
              </text>
            </svg>
            <span class="text-muted-foreground text-xs font-medium">Ciclos</span>
          </div>

          <!-- Bateria -->
          <div class="flex flex-col items-center justify-center gap-1 border-r border-border p-5">
            <p class="text-3xl font-bold tabular-nums">${test.battery !== null ? test.battery + '%' : '--'}</p>
            <p class="text-muted-foreground text-xs">Bateria</p>
            ${test.battery !== null && test.lowBatteryThreshold > 0 && test.battery <= test.lowBatteryThreshold
              ? `<span class="mt-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">Baixa</span>`
              : ''}
          </div>

          <!-- ETA / Elapsed -->
          <div class="flex flex-col items-center justify-center gap-1 border-r border-border p-5">
            <p class="text-3xl font-bold tabular-nums">${isDone ? this._formatDuration(elapsed) : (eta ? this._formatDuration(eta) : '--')}</p>
            <p class="text-muted-foreground text-xs">${isDone ? 'Duração total' : 'Estimativa'}</p>
            ${!isDone ? `<p class="text-muted-foreground mt-0.5 text-xs">${this._formatDuration(elapsed)} decorrido</p>` : ''}
          </div>

          <!-- Status + failures + queue -->
          <div class="flex flex-col items-center justify-center gap-2 p-5">
            ${this._statusBadge(test.status)}
            <p class="text-muted-foreground text-xs tabular-nums">${test.totalFailures} falha(s)</p>
            ${qLen > 0 && !isDone
              ? `<span class="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-600">${qLen} na fila</span>`
              : ''}
            ${isActive ? `<p class="text-muted-foreground mt-1 max-w-[130px] truncate text-center text-xs">${test.currentAction}</p>` : ''}
          </div>
        </div>

        <!-- Test params summary -->
        <div class="border-border flex flex-wrap gap-x-6 gap-y-1 border-b px-5 py-3">
          <span class="text-muted-foreground text-xs">Intervalo: <strong class="text-foreground">${test.delayBeforeAction}s</strong></span>
          <span class="text-muted-foreground text-xs">Aberta: <strong class="text-foreground">${test.holdTime}s</strong></span>
          <span class="text-muted-foreground text-xs">Entre ciclos: <strong class="text-foreground">${test.delayBetweenCycles}s</strong></span>
          <span class="text-muted-foreground text-xs">Falhas máx.: <strong class="text-foreground">${test.maxConsecutiveFailures}</strong></span>
          <span class="text-muted-foreground text-xs">Bat. alerta: <strong class="text-foreground">${test.lowBatteryThreshold > 0 ? test.lowBatteryThreshold + '%' : 'desativado'}</strong></span>
        </div>

        <!-- Log -->
        <div class="p-5">
          <h4 class="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">Log de eventos</h4>
          ${recentLogs.length === 0
            ? `<p class="text-muted-foreground py-6 text-center text-sm">Sem eventos ainda.</p>`
            : `<div class="overflow-hidden rounded-lg border border-border">
                <table class="w-full border-collapse text-sm">
                  <thead>
                    <tr class="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                      <th class="px-3 py-2 text-left font-semibold w-24">Hora</th>
                      <th class="px-3 py-2 text-left font-semibold w-20">Tipo</th>
                      <th class="px-3 py-2 text-left font-semibold">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/50">
                    ${recentLogs.map(entry => `
                      <tr class="hover:bg-muted/20 transition-colors">
                        <td class="px-3 py-1.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          ${this._formatTime(entry.time)}
                        </td>
                        <td class="px-3 py-1.5">${this._logTypeBadge(entry.type)}</td>
                        <td class="px-3 py-1.5 text-xs ${this._logLevelClass(entry.level)}">
                          ${entry.message}
                        </td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>`}
        </div>
      </div>`;

    this._detailContainer.querySelectorAll('[data-ctrl]').forEach(btn => {
      btn.addEventListener('click', () => {
        switch (btn.dataset.ctrl) {
          case 'pause':  this.pauseTest(id); break;
          case 'resume': this.resumeTest(id); break;
          case 'stop':
            if (confirm(`Parar o teste de "${test.lockName}"?`)) this.stopTest(id);
            break;
          case 'edit':
            this._editingId = id;
            this._render();
            break;
        }
      });
    });
  }

  // ─── EDIT FORM ───────────────────────────────────────────────────────────────

  _renderEditForm(test) {
    if (!this._detailContainer) return;
    this._detailContainer.classList.remove('hidden');
    const minCycles = Math.ceil(test.completedCycles);

    this._detailContainer.innerHTML = `
      <div class="bg-card border-border rounded-2xl border p-5 shadow-sm">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="font-semibold">Editar Parâmetros</h3>
            <p class="text-muted-foreground text-xs">${test.lockName} · ${test.completedCycles.toFixed(1)} ciclos já realizados</p>
          </div>
          <button id="btn-edit-cancel"
            class="text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors">Cancelar</button>
        </div>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Total de ciclos</label>
            <input type="number" id="edit-total-cycles" value="${test.totalCycles}" min="${minCycles}" max="99999"
              class="border-border bg-background focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"/>
            <span class="text-muted-foreground text-xs">Mín: ${minCycles}</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Intervalo (s)</label>
            <input type="number" id="edit-delay-action" value="${test.delayBeforeAction}" min="1" max="300"
              class="border-border bg-background focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"/>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Aberta (s)</label>
            <input type="number" id="edit-hold-time" value="${test.holdTime}" min="1" max="120"
              class="border-border bg-background focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"/>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Entre ciclos (s)</label>
            <input type="number" id="edit-delay-cycles" value="${test.delayBetweenCycles}" min="0" max="3600"
              class="border-border bg-background focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"/>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Falhas máx.</label>
            <input type="number" id="edit-max-failures" value="${test.maxConsecutiveFailures}" min="1" max="100"
              class="border-border bg-background focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"/>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Bat. alerta (%)</label>
            <input type="number" id="edit-battery-threshold" value="${test.lowBatteryThreshold}" min="0" max="100"
              class="border-border bg-background focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"/>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button id="btn-edit-cancel2"
            class="bg-muted text-muted-foreground hover:bg-secondary cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button id="btn-edit-save"
            class="bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer rounded-lg px-4 py-2 text-sm font-bold transition-colors">
            Salvar
          </button>
        </div>
      </div>`;

    const cancelFn = () => { this._editingId = null; this._render(); };
    document.getElementById('btn-edit-cancel')?.addEventListener('click', cancelFn);
    document.getElementById('btn-edit-cancel2')?.addEventListener('click', cancelFn);
    document.getElementById('btn-edit-save')?.addEventListener('click', () => {
      const newTotal = parseInt(document.getElementById('edit-total-cycles').value);
      const updates = {
        totalCycles: Math.max(minCycles, newTotal || minCycles),
        delayBeforeAction: Math.max(1, parseFloat(document.getElementById('edit-delay-action').value) || 1),
        holdTime: Math.max(1, parseFloat(document.getElementById('edit-hold-time').value) || 1),
        delayBetweenCycles: Math.max(0, parseFloat(document.getElementById('edit-delay-cycles').value) || 0),
        maxConsecutiveFailures: Math.max(1, parseInt(document.getElementById('edit-max-failures').value) || 1),
        lowBatteryThreshold: Math.max(0, parseInt(document.getElementById('edit-battery-threshold').value) || 0),
      };
      this.editTest(test.id, updates);
    });
  }

  // ─── UTILITIES ───────────────────────────────────────────────────────────────

  _addLog(test, type, message, level = 'info') {
    test.log.push({ time: Date.now(), type, message, level });
    if (test.log.length > 150) test.log.shift();
  }

  _calcETA(test) {
    if (test.status !== 'running' || test.completedCycles <= 0 || !test.startedAt) return null;
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
    return new Date(ts).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  _statusDot(status) {
    const map = {
      running: 'bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.4)]',
      paused: 'bg-yellow-500',
      completed: 'bg-blue-500',
      failed: 'bg-destructive',
      stopped: 'bg-muted-foreground',
    };
    return `<span class="inline-block h-2 w-2 shrink-0 rounded-full ${map[status] || map.stopped}"></span>`;
  }

  _statusBadge(status) {
    const styles = {
      running: 'bg-green-500/10 text-green-600 border-green-500/20',
      paused: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      failed: 'bg-destructive/10 text-destructive border-destructive/20',
      stopped: 'bg-muted text-muted-foreground border-border',
    };
    const labels = {
      running: 'Em execução',
      paused: 'Pausado',
      completed: 'Concluído',
      failed: 'Falhou',
      stopped: 'Parado',
    };
    return `<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[status] || styles.stopped}">${labels[status] || status}</span>`;
  }

  _logTypeBadge(type) {
    const styles = {
      UNLOCK: 'bg-green-500/10 text-green-700',
      LOCK:   'bg-blue-500/10 text-blue-700',
      BATTERY:'bg-yellow-500/10 text-yellow-700',
      SYSTEM: 'bg-muted text-muted-foreground',
    };
    return `<span class="rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${styles[type] || styles.SYSTEM}">${type}</span>`;
  }

  _logLevelClass(level) {
    return { success: 'text-green-600', error: 'text-destructive', warning: 'text-yellow-600', info: 'text-muted-foreground' }[level] || 'text-muted-foreground';
  }
}
