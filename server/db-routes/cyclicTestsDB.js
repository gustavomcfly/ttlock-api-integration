import express from 'express';
import prisma from '../prismaClient.js';
import { cyclicEngine } from '../cyclicEngine.js';

const router = express.Router();

// Testes ativos (running/paused), em qualquer fechadura — usado para "reidratar" a UI
// ao carregar/recarregar a página, mesmo que tenham sido iniciados em outra aba/sessão.
router.get('/active', async (req, res) => {
  try {
    const tests = await prisma.cyclicTest.findMany({
      where: { status: { in: ['running', 'paused'] } },
      orderBy: { startedAt: 'desc' },
      include: {
        lock: true,
        user: true,
        logs: { orderBy: { timestamp: 'desc' }, take: 50 },
      },
    });
    res.status(200).json({ success: true, list: tests });
  } catch (error) {
    console.error('[DB] Erro ao buscar testes ativos:', error);
    res.status(500).json({ success: false });
  }
});

router.post('/start', async (req, res) => {
  try {
    const {
      lockId,
      lockAlias,
      userId,
      totalCycles,
      delayBetweenCycles,
      maxConsecutiveFailures,
      lowBatteryThreshold,
      batteryStart,
      token,
    } = req.body;

    if (!lockId) {
      return res.status(400).json({ success: false, message: 'ID da fechadura obrigatório.' });
    }
    if (!totalCycles || parseInt(totalCycles) < 1) {
      return res.status(400).json({ success: false, message: 'Número de ciclos inválido.' });
    }
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token de acesso TTLock obrigatório para rodar o teste no backend.' });
    }

    await prisma.lock.upsert({
      where: { lockId: parseInt(lockId) },
      update: lockAlias ? { lockAlias } : {},
      create: {
        lockId: parseInt(lockId),
        lockAlias: lockAlias || `Fechadura ${lockId}`,
      },
    });

    const newTest = await prisma.cyclicTest.create({
      data: {
        lockId: parseInt(lockId),
        userId: userId || null,
        totalCycles: parseInt(totalCycles),
        delayBetweenCycles: parseInt(delayBetweenCycles ?? 5),
        maxConsecutiveFailures: Math.max(1, parseInt(maxConsecutiveFailures ?? 3)),
        lowBatteryThreshold: Math.max(0, parseInt(lowBatteryThreshold ?? 20)),
        status: 'running',
        batteryStart: batteryStart ? parseInt(batteryStart) : null,
      },
    });

    // Dispara o loop no backend. Isso continua rodando independentemente do navegador.
    cyclicEngine.start(
      newTest.id,
      parseInt(lockId),
      parseInt(totalCycles),
      parseInt(delayBetweenCycles ?? 5),
      token
    );

    res.status(201).json({ success: true, testId: newTest.id, test: newTest });
  } catch (error) {
    console.error('[DB] Erro ao iniciar teste:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor de banco de dados' });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const test = await prisma.cyclicTest.findUnique({ where: { id } });
    if (!test) return res.status(404).json({ success: false, message: 'Teste não encontrado.' });
    if (test.status !== 'running') {
      return res.status(409).json({ success: false, message: `Teste está "${test.status}", não pode ser pausado.` });
    }
    if (!cyclicEngine.isActive(id)) {
      return res.status(409).json({ success: false, message: 'O processo backend deste teste não está mais ativo (possível reinício do servidor). Inicie um novo teste.' });
    }
    const updated = await prisma.cyclicTest.update({ where: { id }, data: { status: 'paused' } });
    await prisma.cyclicTestLog.create({ data: { testId: id, type: 'SYSTEM', level: 'info', message: 'Teste pausado.' } });
    res.status(200).json({ success: true, test: updated });
  } catch (error) {
    console.error('[DB] Erro ao pausar teste:', error);
    res.status(500).json({ success: false });
  }
});

router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;
    const test = await prisma.cyclicTest.findUnique({ where: { id } });
    if (!test) return res.status(404).json({ success: false, message: 'Teste não encontrado.' });
    if (test.status !== 'paused') {
      return res.status(409).json({ success: false, message: `Teste está "${test.status}", não pode ser retomado.` });
    }
    if (!cyclicEngine.isActive(id)) {
      return res.status(409).json({ success: false, message: 'O processo backend deste teste não está mais ativo (possível reinício do servidor). Inicie um novo teste.' });
    }
    const updated = await prisma.cyclicTest.update({ where: { id }, data: { status: 'running' } });
    await prisma.cyclicTestLog.create({ data: { testId: id, type: 'SYSTEM', level: 'info', message: 'Teste retomado.' } });
    res.status(200).json({ success: true, test: updated });
  } catch (error) {
    console.error('[DB] Erro ao retomar teste:', error);
    res.status(500).json({ success: false });
  }
});

// Edita parâmetros de um teste em andamento. O motor no backend relê esses valores
// do banco a cada ciclo, então uma edição feita aqui passa a valer na próxima volta do loop.
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const test = await prisma.cyclicTest.findUnique({ where: { id } });
    if (!test) return res.status(404).json({ success: false, message: 'Teste não encontrado.' });
    if (['completed', 'failed', 'stopped'].includes(test.status)) {
      return res.status(409).json({ success: false, message: 'Teste já finalizado, não pode ser editado.' });
    }

    const { totalCycles, delayBetweenCycles, maxConsecutiveFailures, lowBatteryThreshold } = req.body;
    const data = {};
    if (totalCycles !== undefined) data.totalCycles = Math.max(Math.ceil(test.completedCycles), parseInt(totalCycles));
    if (delayBetweenCycles !== undefined) data.delayBetweenCycles = Math.max(0, parseInt(delayBetweenCycles));
    if (maxConsecutiveFailures !== undefined) data.maxConsecutiveFailures = Math.max(1, parseInt(maxConsecutiveFailures));
    if (lowBatteryThreshold !== undefined) data.lowBatteryThreshold = Math.max(0, parseInt(lowBatteryThreshold));

    const updated = await prisma.cyclicTest.update({ where: { id }, data });
    res.status(200).json({ success: true, test: updated });
  } catch (error) {
    console.error('[DB] Erro ao editar teste:', error);
    res.status(500).json({ success: false });
  }
});

router.post('/:id/log', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, level, message, currentCycle, isFailure } = req.body;

    await prisma.cyclicTestLog.create({
      data: {
        testId: id,
        type: type || 'SYSTEM',
        level: level || 'info',
        message: message || '',
      },
    });

    const updateData = {};
    if (currentCycle !== undefined) {
      updateData.completedCycles = currentCycle;
    }
    if (isFailure) {
      updateData.totalFailures = { increment: 1 };
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.cyclicTest.update({
        where: { id: id },
        data: updateData,
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[DB] Erro ao registrar log:', error);
    res.status(500).json({ success: false });
  }
});

router.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, batteryEnd } = req.body;

    const updatedTest = await prisma.cyclicTest.update({
      where: { id: id },
      data: {
        status: status || 'stopped',
        batteryEnd: batteryEnd ? parseInt(batteryEnd) : undefined,
        completedAt: new Date(),
      },
    });
    // O motor relê o status a cada iteração/tick de sleep e encerra sozinho ao ver "stopped".

    res.status(200).json({ success: true, test: updatedTest });
  } catch (error) {
    console.error('[DB] Erro ao finalizar teste:', error);
    res.status(500).json({ success: false });
  }
});

// Histórico de testes de um usuário específico (todas as fechaduras) — base para relatórios.
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tests = await prisma.cyclicTest.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: {
        lock: true,
        logs: { orderBy: { timestamp: 'desc' }, take: 50 },
        _count: { select: { logs: true } },
      },
    });
    res.status(200).json({ success: true, list: tests });
  } catch (error) {
    console.error('[DB] Erro ao buscar testes do usuário:', error);
    res.status(500).json({ success: false });
  }
});

// Relatório agregado, filtrável por usuário e/ou fechadura.
// Ex: /db/cyclic-tests/reports/summary?userId=...&lockId=...
router.get('/reports/summary', async (req, res) => {
  try {
    const { userId, lockId } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (lockId) where.lockId = parseInt(lockId);

    const [totalTests, byStatus, agg] = await Promise.all([
      prisma.cyclicTest.count({ where }),
      prisma.cyclicTest.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.cyclicTest.aggregate({
        where,
        _sum: { totalFailures: true, completedCycles: true },
      }),
    ]);

    const byStatusMap = byStatus.reduce((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      report: {
        totalTests,
        byStatus: byStatusMap,
        totalCyclesRun: agg._sum.completedCycles || 0,
        totalFailures: agg._sum.totalFailures || 0,
      },
    });
  } catch (error) {
    console.error('[DB] Erro ao gerar relatório:', error);
    res.status(500).json({ success: false });
  }
});

router.get('/lock/:lockId', async (req, res) => {
  try {
    const { lockId } = req.params;

    const tests = await prisma.cyclicTest.findMany({
      where: { lockId: parseInt(lockId) },
      orderBy: { startedAt: 'desc' },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        user: true,
        _count: { select: { logs: true } },
      },
    });

    res.status(200).json({ success: true, list: tests });
  } catch (error) {
    console.error('[DB] Erro ao buscar histórico:', error);
    res.status(500).json({ success: false });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const test = await prisma.cyclicTest.findUnique({
      where: { id: id },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
        },
        user: true,
        lock: true,
      },
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Teste não encontrado.' });
    }

    res.status(200).json({ success: true, test });
  } catch (error) {
    console.error('[DB] Erro ao buscar teste:', error);
    res.status(500).json({ success: false });
  }
});

export default router;
