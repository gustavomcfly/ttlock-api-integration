// Cache local dos testes de ciclagem. A execução real vive no backend (cyclicEngine.js);
// este store só guarda o retrato mais recente obtido via polling em /db/cyclic-tests,
// para a UI renderizar sem refazer fetch a cada redesenho.
const _tests = new Map();

function mapLog(entry) {
  return {
    time: new Date(entry.timestamp).getTime(),
    type: entry.type,
    level: entry.level,
    message: entry.message,
  };
}

// Converte o formato retornado pelo backend (Prisma) para o formato usado pela UI.
function fromServer(row, lockNameFallback) {
  const existing = _tests.get(row.id);
  return {
    id: row.id,
    dbId: row.id,
    lockId: row.lockId,
    lockName: row.lock?.lockAlias || existing?.lockName || lockNameFallback || `Lock ${row.lockId}`,
    startedBy: row.user?.username || row.user?.name || existing?.startedBy || null,
    totalCycles: row.totalCycles,
    completedCycles: row.completedCycles,
    delayBetweenCycles: row.delayBetweenCycles,
    maxConsecutiveFailures: row.maxConsecutiveFailures,
    lowBatteryThreshold: row.lowBatteryThreshold,
    status: row.status,
    battery: row.battery ?? null,
    totalFailures: row.totalFailures,
    currentAction: describeStatus(row),
    startedAt: new Date(row.startedAt).getTime(),
    completedAt: row.completedAt ? new Date(row.completedAt).getTime() : null,
    log: (row.logs || []).map(mapLog).reverse(),
  };
}

function describeStatus(row) {
  switch (row.status) {
    case "running":
      return "Em execução no servidor...";
    case "paused":
      return "Pausado.";
    case "completed":
      return `Concluído! ${row.totalCycles} ciclos realizados.`;
    case "failed":
      return "Parado: falhas consecutivas no limite.";
    case "stopped":
      return "Teste interrompido.";
    default:
      return "";
  }
}

export const cyclicTestStore = {
  upsertFromServer(row, lockNameFallback) {
    const test = fromServer(row, lockNameFallback);
    _tests.set(test.id, test);
    return test;
  },

  get(id) {
    return _tests.get(id);
  },

  getAll() {
    return Array.from(_tests.values()).sort((a, b) => b.startedAt - a.startedAt);
  },

  delete(id) {
    _tests.delete(id);
  },
};
