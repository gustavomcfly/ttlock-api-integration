const _tests = new Map();
let _counter = 0;

export const cyclicTestStore = {
  create(config) {
    const id = `ctest_${Date.now()}_${++_counter}`;
    const test = {
      id,
      lockId: config.lockId,
      lockName: config.lockName,
      totalCycles: config.totalCycles,
      completedCycles: 0,
      delayBetweenCycles: config.delayBetweenCycles,
      maxConsecutiveFailures: config.maxConsecutiveFailures,
      lowBatteryThreshold: config.lowBatteryThreshold,
      status: "running",
      battery: null,
      totalFailures: 0,
      consecutiveFailures: 0,
      currentAction: "Iniciando...",
      createdAt: Date.now(),
      startedAt: Date.now(),
      completedAt: null,
      log: [],
      _cancel: false,
    };
    _tests.set(id, test);
    return test;
  },

  get(id) {
    return _tests.get(id);
  },

  getAll() {
    return Array.from(_tests.values());
  },

  update(id, fields) {
    const t = _tests.get(id);
    if (t) Object.assign(t, fields);
    return t;
  },

  delete(id) {
    _tests.delete(id);
  },
};
