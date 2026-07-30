const STORAGE_KEY = "ttlock_cyclic_tests_backup";
const _tests = new Map();
let _counter = 0;

try {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    const parsed = JSON.parse(savedData);
    parsed.forEach(test => {
      test._cancel = false; 
      test._isLooping = false;
      _tests.set(test.id, test);
    });
  }
} catch (e) {
  console.error("Erro ao puxar backup dos testes:", e);
}

setInterval(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(_tests.values())));
}, 1000);

export const cyclicTestStore = {
  create(config) {
    const id = `ctest_${Date.now()}_${++_counter}`;
    const test = {
      id,
      dbId: null, 
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