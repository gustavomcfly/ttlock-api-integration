import express from 'express';
import prisma from '../prismaClient.js';
import { cyclicEngine } from '../cyclicEngine.js';

const router = express.Router();

router.post('/start', async (req, res) => {
  try {
    const { lockId, userId, totalCycles, delayBetweenCycles, batteryStart, token } = req.body;

    if (!lockId) {
      return res.status(400).json({ success: false, message: "ID da fechadura obrigatório." });
    }

    await prisma.lock.upsert({
      where: { lockId: parseInt(lockId) },
      update: {},
      create: {
        lockId: parseInt(lockId),
        lockAlias: `Fechadura ${lockId}`,
      }
    });

    const newTest = await prisma.cyclicTest.create({
      data: {
        lockId: parseInt(lockId),
        userId: userId || null,
        totalCycles: parseInt(totalCycles),
        delayBetweenCycles: parseInt(delayBetweenCycles || 5),
        status: 'running',
        batteryStart: batteryStart ? parseInt(batteryStart) : null,
      }
    });

    cyclicEngine.start(
      newTest.id,
      parseInt(lockId),
      parseInt(totalCycles),
      parseInt(delayBetweenCycles || 5),
      token 
    );

    res.status(201).json({ success: true, testId: newTest.id });
  } catch (error) {
    console.error("[DB] Erro ao iniciar teste:", error);
    res.status(500).json({ success: false, message: "Erro interno no servidor de banco de dados" });
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
      }
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
        data: updateData
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[DB] Erro ao registrar log:", error);
    res.status(500).json({ success: false });
  }
});

router.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, batteryEnd } = req.body;

    cyclicEngine.stop(id);

    const updatedTest = await prisma.cyclicTest.update({
      where: { id: id },
      data: {
        status: status || 'stopped', 
        batteryEnd: batteryEnd ? parseInt(batteryEnd) : null,
        completedAt: new Date(),
      }
    });

    res.status(200).json({ success: true, test: updatedTest });
  } catch (error) {
    console.error("[DB] Erro ao finalizar teste:", error);
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
          orderBy: { createdAt: 'desc' },
          take: 50 
        },
        _count: { select: { logs: true } }
      }
    });

    res.status(200).json({ success: true, list: tests });
  } catch (error) {
    console.error("[DB] Erro ao buscar histórico:", error);
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
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!test) {
      return res.status(404).json({ success: false, message: "Teste não encontrado." });
    }

    res.status(200).json({ success: true, test });
  } catch (error) {
    console.error("[DB] Erro ao buscar teste:", error);
    res.status(500).json({ success: false });
  }
});

export default router;