import prisma from './prismaClient.js';
import { lockService } from './services/lock.service.js'; // Importa o serviço nativo sem precisar de HTTP

const activeEngines = new Map();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const cyclicEngine = {
  async start(testId, lockId, totalCycles, delayBetweenCycles, token) {
    if (activeEngines.has(testId)) return;
    activeEngines.set(testId, true);

    let currentCycle = 0;
    let consecutiveFailures = 0;
    let totalFailures = 0;

    // Registra log e atualiza os ciclos imediatamente no PostgreSQL
    const updateProgressAndLog = async (type, level, message, isFailure = false, addedCycle = 0) => {
      currentCycle += addedCycle;
      if (isFailure) {
        totalFailures++;
        consecutiveFailures++;
      } else {
        consecutiveFailures = 0;
      }

      // 1. Salva a linha de log
      await prisma.cyclicTestLog.create({
        data: { testId, type, level, message }
      });

      // 2. Atualiza o contador de ciclos e falhas no registro do teste em tempo real
      await prisma.cyclicTest.update({
        where: { id: testId },
        data: {
          completedCycles: currentCycle,
          totalFailures: totalFailures
        }
      });
    };

    try {
      while (currentCycle < totalCycles && activeEngines.get(testId)) {
        
        // --- 1. SOLICITAR DESBLOQUEIO ---
        await updateProgressAndLog('UNLOCK', 'info', 'Solicitando desbloqueio');
        try {
          // Usa o serviço nativo passando o token e o lockId
          const res = await lockService.unlock(token, lockId);
          if (res && (res.errcode === 0 || res.success)) {
            await updateProgressAndLog('UNLOCK', 'success', `Desbloqueio OK · ${(currentCycle + 0.5).toFixed(1)} ciclos`, false, 0.5);
          } else {
            throw new Error(res?.errmsg || `Código de erro: ${res?.errcode}`);
          }
        } catch (e) {
          await updateProgressAndLog('UNLOCK', 'error', `Falha no desbloqueio: ${e.message}`, true);
          if (consecutiveFailures >= 3) {
            await updateProgressAndLog('SYSTEM', 'error', 'Teste interrompido por 3 falhas consecutivas.');
            break;
          }
        }

        if (!activeEngines.get(testId)) break;
        if (delayBetweenCycles > 0) await sleep(delayBetweenCycles * 1000);
        if (!activeEngines.get(testId)) break;

        // --- 2. SOLICITAR TRAVAMENTO ---
        await updateProgressAndLog('LOCK', 'info', 'Solicitando travamento');
        try {
          const res = await lockService.lock(token, lockId);
          if (res && (res.errcode === 0 || res.success)) {
            await updateProgressAndLog('LOCK', 'success', `Travamento OK · ciclo ${(currentCycle + 0.5).toFixed(1)} concluído`, false, 0.5);
          } else {
            throw new Error(res?.errmsg || `Código de erro: ${res?.errcode}`);
          }
        } catch (e) {
          await updateProgressAndLog('LOCK', 'error', `Falha no travamento: ${e.message}`, true);
          if (consecutiveFailures >= 3) {
            await updateProgressAndLog('SYSTEM', 'error', 'Teste interrompido por 3 falhas consecutivas.');
            break;
          }
        }

        if (delayBetweenCycles > 0 && currentCycle < totalCycles) {
          await sleep(delayBetweenCycles * 1000);
        }
      }

      // Finalização do Teste
      const finalStatus = consecutiveFailures >= 3 ? 'failed' : (activeEngines.get(testId) ? 'completed' : 'stopped');
      
      await prisma.cyclicTest.update({
        where: { id: testId },
        data: { status: finalStatus, completedAt: new Date() }
      });

    } catch (err) {
      console.error("[Engine] Erro crítico no robô de ciclagem:", err);
    } finally {
      activeEngines.delete(testId);
    }
  },

  stop(testId) {
    if (activeEngines.has(testId)) {
      activeEngines.set(testId, false);
    }
  }
};