import prisma from './prismaClient.js';
import { lockService } from './services/lock.service.js'; // Usa o serviço nativo sem precisar de HTTP

// Guarda apenas UM registro por teste: "existe um loop Node vivo para este testId agora?"
// Todo o resto (pausar/retomar/parar/editar parâmetros) acontece via status no Postgres,
// e o loop abaixo relê o status/config do banco a cada iteração. Isso permite controlar
// o teste a partir de qualquer aba, ou nenhuma aba — o processo backend é quem sustenta o teste.
const activeEngines = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Dorme em pequenos passos, verificando periodicamente se o teste foi parado no banco,
// para que um "Parar" no meio de um delay longo tenha efeito quase imediato.
async function sleepCheckingStop(testId, ms) {
  const step = 400;
  let remaining = ms;
  while (remaining > 0) {
    const row = await prisma.cyclicTest.findUnique({
      where: { id: testId },
      select: { status: true },
    });
    if (!row || row.status === 'stopped' || row.status === 'failed') return false;
    const chunk = Math.min(step, remaining);
    await sleep(chunk);
    remaining -= chunk;
  }
  return true;
}

export const cyclicEngine = {
  isActive(testId) {
    return activeEngines.has(testId);
  },

  async start(testId, lockId, totalCycles, delayBetweenCycles, token) {
    if (activeEngines.has(testId)) return;
    activeEngines.set(testId, true);

    let currentCycle = 0;
    let consecutiveFailures = 0;
    let totalFailures = 0;
    let lastBattery = null;
    let lastKnownTotal = totalCycles;

    const log = async (type, level, message) => {
      await prisma.cyclicTestLog.create({ data: { testId, type, level, message } });
    };

    const persistProgress = async (extra = {}) => {
      await prisma.cyclicTest.update({
        where: { id: testId },
        data: { completedCycles: currentCycle, totalFailures, ...extra },
      });
    };

    try {
      mainLoop: while (currentCycle < totalCycles) {
        // Fonte única de verdade: relê status e parâmetros do banco a cada volta.
        // Isso permite pausar/retomar/editar de qualquer lugar sem depender de estado em memória.
        const cfg = await prisma.cyclicTest.findUnique({ where: { id: testId } });
        if (!cfg || cfg.status === 'stopped' || cfg.status === 'failed') break;

        if (cfg.status === 'paused') {
          await sleep(500);
          continue;
        }

        const effectiveTotal = cfg.totalCycles;
        lastKnownTotal = effectiveTotal;
        const effectiveDelay = cfg.delayBetweenCycles;
        const maxFailures = cfg.maxConsecutiveFailures || 3;
        const lowBatteryThreshold = cfg.lowBatteryThreshold ?? 20;

        if (currentCycle >= effectiveTotal) break;

        // --- 1. SOLICITAR DESBLOQUEIO ---
        await log('UNLOCK', 'info', 'Solicitando desbloqueio');
        let unlockOk = false;
        try {
          const res = await lockService.remoteUnlock(token, lockId);
          if (res && res.errcode === 0) {
            currentCycle += 0.5;
            consecutiveFailures = 0;
            unlockOk = true;
            await log('UNLOCK', 'success', `Desbloqueio OK · ${currentCycle.toFixed(1)} ciclos`);
            await persistProgress();
          } else {
            throw new Error(res?.errmsg || `Código de erro: ${res?.errcode}`);
          }
        } catch (e) {
          totalFailures++;
          consecutiveFailures++;
          await log('UNLOCK', 'error', `Falha no desbloqueio: ${e.message}`);
          await persistProgress();
          if (consecutiveFailures >= maxFailures) {
            await log('SYSTEM', 'error', `Teste interrompido por ${maxFailures} falhas consecutivas.`);
            await prisma.cyclicTest.update({ where: { id: testId }, data: { status: 'failed', completedAt: new Date() } });
            break mainLoop;
          }
        }

        if (!unlockOk) {
          if (!(await sleepCheckingStop(testId, effectiveDelay * 1000))) break;
          continue;
        }

        if (effectiveDelay > 0) {
          if (!(await sleepCheckingStop(testId, effectiveDelay * 1000))) break;
        }

        // --- 2. SOLICITAR TRAVAMENTO ---
        await log('LOCK', 'info', 'Solicitando travamento');
        try {
          const res = await lockService.remoteLock(token, lockId);
          if (res && res.errcode === 0) {
            currentCycle += 0.5;
            consecutiveFailures = 0;
            await log('LOCK', 'success', `Travamento OK · ciclo ${currentCycle.toFixed(1)} concluído`);
            await persistProgress();
          } else {
            throw new Error(res?.errmsg || `Código de erro: ${res?.errcode}`);
          }
        } catch (e) {
          totalFailures++;
          consecutiveFailures++;
          await log('LOCK', 'error', `Falha no travamento: ${e.message}`);
          await persistProgress();
          if (consecutiveFailures >= maxFailures) {
            await log('SYSTEM', 'error', `Teste interrompido por ${maxFailures} falhas consecutivas.`);
            await prisma.cyclicTest.update({ where: { id: testId }, data: { status: 'failed', completedAt: new Date() } });
            break mainLoop;
          }
        }

        // Checagem de bateria a cada 5 ciclos completos
        const fullCycles = Math.floor(currentCycle);
        if (fullCycles > 0 && fullCycles % 5 === 0 && currentCycle % 1 === 0) {
          try {
            const details = await lockService.getLockDetails(token, lockId);
            if (details?.electricQuantity !== undefined) {
              lastBattery = details.electricQuantity;
              await prisma.cyclicTest.update({ where: { id: testId }, data: { battery: lastBattery } });
              await log('BATTERY', 'info', `Bateria: ${lastBattery}%`);
              if (lowBatteryThreshold > 0 && lastBattery <= lowBatteryThreshold) {
                await log('BATTERY', 'warning', `ALERTA: ${lastBattery}% ≤ ${lowBatteryThreshold}%`);
              }
            }
          } catch (_) {
            // Falha ao consultar bateria não deve interromper o teste
          }
        }

        if (currentCycle < effectiveTotal && effectiveDelay > 0) {
          if (!(await sleepCheckingStop(testId, effectiveDelay * 1000))) break;
        }
      }

      // Finalização (se ainda não foi marcado como 'failed' dentro do loop)
      const finalRow = await prisma.cyclicTest.findUnique({ where: { id: testId }, select: { status: true } });
      if (finalRow && finalRow.status !== 'failed') {
        const finalStatus = currentCycle >= lastKnownTotal ? 'completed' : 'stopped';
        if (finalStatus === 'completed') {
          await log('SYSTEM', 'success', `Concluído. Total de falhas: ${totalFailures}.`);
        } else {
          await log('SYSTEM', 'info', 'Interrompido.');
        }
        await prisma.cyclicTest.update({
          where: { id: testId },
          data: { status: finalStatus, completedAt: new Date(), batteryEnd: lastBattery },
        });
      } else if (finalRow) {
        await prisma.cyclicTest.update({ where: { id: testId }, data: { batteryEnd: lastBattery } });
      }
    } catch (err) {
      console.error('[Engine] Erro crítico no robô de ciclagem:', err);
      try {
        await prisma.cyclicTest.update({
          where: { id: testId },
          data: { status: 'failed', completedAt: new Date() },
        });
        await log('SYSTEM', 'error', `Erro crítico: ${err.message}`);
      } catch (_) {}
    } finally {
      activeEngines.delete(testId);
    }
  },
};
