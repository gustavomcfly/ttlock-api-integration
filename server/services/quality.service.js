import prisma from "../prismaClient.js";
import { lockService } from "./lock.service.js";
import { passcodeService } from "./passcode.service.js";
import { rfidService } from "./rfid.service.js";
import { fingerprintService } from "./fingerprint.service.js";
import { recordService } from "./record.service.js";

const STEP_NAMES = {
  get_info: "Obter Parâmetros da Fechadura",
  remote_unlock: "Teste de Abertura Remota",
  add_passcode: "Registro de Senha Padrão",
  add_rfid: "Registro de Cartão RFID",
  add_fingerprint: "Registro de Biometria",
  rename_lock: "Renomear Fechadura",
  passage_mode: "Ativar/Desativar Modo Passagem",
  get_records: "Sincronizar Histórico de Registros",
  check_update: "Verificar Atualização de Firmware",
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const ok = (r) => !r.errcode || r.errcode === 0;

const include = {
  lock: true,
  steps: { orderBy: { position: "asc" } },
};

// Converte a linha do banco para o formato que o front já consome
// (o mesmo que o antigo estado em memória).
function toClientShape(audit) {
  return {
    testId: audit.id,
    lockId: audit.lockId,
    lockName:
      audit.params?.lockName || audit.lock?.lockAlias || `Lock ${audit.lockId}`,
    status: audit.status,
    startTime: audit.startedAt.getTime(),
    endTime: audit.completedAt ? audit.completedAt.getTime() : null,
    steps: audit.steps.map((s) => ({
      id: s.stepKey,
      name: s.stepName,
      status: s.status,
      errorMsg: s.errorMsg,
      logs: s.logs ?? [],
    })),
    params: audit.params,
  };
}

export const qualityService = {
  getStepName(stepId) {
    return STEP_NAMES[stepId] || stepId;
  },

  async startTest(userId, accessToken, lockId, criteria, testParams = {}) {
    const lockIdInt = parseInt(lockId);
    const lockName = testParams.lockName || `Lock ${lockIdInt}`;

    // Garante a fechadura no banco (testes de qualidade antes nunca gravavam isso).
    await prisma.lock.upsert({
      where: { lockId: lockIdInt },
      update: testParams.lockName ? { lockAlias: testParams.lockName } : {},
      create: { lockId: lockIdInt, lockAlias: lockName },
    });

    const audit = await prisma.qualityAudit.create({
      data: {
        lockId: lockIdInt,
        userId,
        status: "executando",
        testerName: testParams.testerName || null,
        params: { ...testParams, lockName },
        steps: {
          create: criteria.map((c, i) => ({
            position: i,
            stepKey: c,
            stepName: this.getStepName(c),
            status: "pendente",
            logs: [],
          })),
        },
      },
      include,
    });

    // Roda em background; o front acompanha por polling em /quality/status.
    this.runScript(accessToken, lockIdInt, audit.id).catch((err) =>
      console.error("[Quality] Erro crítico no script:", err),
    );

    return toClientShape(audit);
  },

  async runScript(accessToken, lockId, auditId) {
    const audit = await prisma.qualityAudit.findUnique({
      where: { id: auditId },
      include,
    });
    if (!audit) return;
    const params = audit.params || {};

    for (const step of audit.steps) {
      const logs = [];
      const log = async (msg) => {
        logs.push(msg);
        await prisma.qualityAuditStep.update({
          where: { id: step.id },
          data: { logs },
        });
      };

      await prisma.qualityAuditStep.update({
        where: { id: step.id },
        data: { status: "executando" },
      });

      let finalStatus = "falha";
      let errorMsg = null;

      try {
        await sleep(1500);

        let result = {};
        switch (step.stepKey) {
          case "get_info":
            await log("Solicitando parâmetros via Gateway...");
            result = await lockService.getLockDetails(accessToken, lockId);
            if (ok(result)) {
              result.success = true;
              await log(`Bateria: ${result.electricQuantity || 0}%`);
              await log(`MAC Address: ${result.lockMac || "Desconhecido"}`);
              await log(
                `Firmware: ${result.firmwareRevision || "Desconhecido"}`,
              );
            }
            break;

          case "remote_unlock":
            await log("Enviando comando de abertura remota...");
            result = await lockService.remoteUnlock(accessToken, lockId);
            if (ok(result)) {
              await log("Fechadura desbloqueada.");
              await log("Aguardando 3 segundos...");
              await sleep(3000);
              await log("Enviando comando de bloqueio remoto...");

              const lockRes = await lockService.remoteLock(accessToken, lockId);
              if (ok(lockRes)) {
                await log("Fechadura bloqueada.");
                result.success = true;
              } else {
                result.success = false;
                result.errmsg = lockRes.errmsg || "Falha ao bloquear";
              }
            }
            break;

          case "add_passcode":
            await log(`Configurando senha numérica: ${params.stdPasscode}`);
            result = await passcodeService.addCustomPasscode(
              accessToken,
              lockId,
              params.stdPasscode,
              `${params.testerName} (QA)`,
              Date.now(),
              0,
              1,
              "",
              "",
              "",
            );
            if (ok(result)) {
              result.success = true;
              await log("Senha sincronizada com sucesso.");
            }
            break;

          case "add_rfid":
            await log(`Sincronizando ID RFID: ${params.stdCard}`);
            result = await rfidService.addCard(
              accessToken,
              lockId,
              params.stdCard,
              `${params.testerName} (QA)`,
              0,
              0,
            );
            if (ok(result)) {
              result.success = true;
              await log("Cartão RFID sincronizado com sucesso.");
            }
            break;

          case "add_fingerprint":
            await log(`Sincronizando ID Biométrico: ${params.stdFingerprint}`);
            result = await fingerprintService.addFingerprint(
              accessToken,
              lockId,
              params.stdFingerprint,
              `${params.testerName} (QA)`,
              0,
              0,
            );
            if (ok(result)) {
              result.success = true;
              await log("Biometria sincronizada com sucesso.");
            }
            break;

          case "rename_lock":
            await log("Alterando nome da fechadura para 'Pado QA Test'...");
            result = await lockService.renameLock(
              accessToken,
              lockId,
              "Pado QA Test",
            );
            if (ok(result)) {
              result.success = true;
              await log("Nome atualizado com sucesso.");
            }
            break;

          case "passage_mode": {
            await log("Ativando Modo Passagem (Always Open)...");
            const pmOn = await lockService.configPassageMode(
              accessToken,
              lockId,
              1,
              1,
            );
            if (ok(pmOn)) {
              await log("Modo Passagem ativado.");
              await log("Aguardando 2 segundos...");
              await sleep(2000);
              await log("Desativando Modo Passagem...");
              const pmOff = await lockService.configPassageMode(
                accessToken,
                lockId,
                0,
                1,
              );
              if (ok(pmOff)) {
                await log("Modo Passagem desativado.");
                result.success = true;
              } else {
                result.success = false;
                result.errmsg =
                  pmOff.errmsg || "Falha ao desativar Modo Passagem";
              }
            } else {
              result.success = false;
              result.errmsg = pmOn.errmsg || "Falha ao ativar Modo Passagem";
            }
            break;
          }

          case "get_records": {
            await log("Solicitando histórico do Datalog...");
            result = await recordService.getRecords(accessToken, lockId, 1, 20);
            if (ok(result)) {
              result.success = true;
              const count = result.list ? result.list.length : 0;
              await log(
                `Histórico puxado com sucesso (${count} registros retornados).`,
              );
            }
            break;
          }

          case "check_update":
            await log("Verificando atualizações de firmware...");
            result = await lockService.checkUpdate(accessToken, lockId);
            if (ok(result)) {
              result.success = true;
              if (result.needUpgrade === 1) {
                await log(
                  "Atualização disponível (Necessário app via Bluetooth).",
                );
              } else if (result.needUpgrade === 0) {
                await log("Firmware atualizado.");
              } else {
                await log("Status de versão desconhecido.");
              }
            }
            break;

          default:
            result.success = true;
        }

        if (result.success) {
          finalStatus = "sucesso";
        } else {
          errorMsg = result.errmsg || "Falha de Sincronização no Gateway";
        }
      } catch (error) {
        errorMsg =
          error.response?.data?.errmsg || error.message || "Erro Desconhecido";
      }

      await prisma.qualityAuditStep.update({
        where: { id: step.id },
        data: { status: finalStatus, errorMsg, logs },
      });
    }

    await prisma.qualityAudit.update({
      where: { id: auditId },
      data: { status: "concluido", completedAt: new Date() },
    });
  },

  // Só devolve se a auditoria for do usuário informado.
  async getStatus(userId, testId) {
    const audit = await prisma.qualityAudit.findFirst({
      where: { id: testId, userId },
      include,
    });
    return audit ? toClientShape(audit) : null;
  },

  async getAllTests(userId, lockId) {
    const audits = await prisma.qualityAudit.findMany({
      where: { userId, ...(lockId ? { lockId: parseInt(lockId) } : {}) },
      orderBy: { startedAt: "desc" },
      include,
    });
    return audits.map(toClientShape);
  },

  // Apaga uma auditoria do histórico (etapas saem em cascata; relatórios salvos permanecem).
  // Auditoria em execução não pode ser apagada: o script ainda grava nas etapas.
  async deleteTest(userId, testId) {
    const audit = await prisma.qualityAudit.findFirst({
      where: { id: testId, userId },
      select: { id: true, status: true },
    });
    if (!audit) return { deleted: false, reason: "not_found" };
    if (audit.status === "executando")
      return { deleted: false, reason: "running" };
    await prisma.qualityAudit.delete({ where: { id: audit.id } });
    return { deleted: true };
  },

  // O script roda dentro do processo; se o servidor reiniciar no meio, a auditoria
  // ficaria "executando" para sempre. No boot, fecha as pendentes como reprovadas.
  async reconcileOrphaned() {
    const orphaned = await prisma.qualityAudit.findMany({
      where: { status: "executando" },
      select: { id: true },
    });
    for (const { id } of orphaned) {
      await prisma.qualityAuditStep.updateMany({
        where: { auditId: id, status: { in: ["pendente", "executando"] } },
        data: {
          status: "falha",
          errorMsg: "Interrompido: servidor reiniciado.",
        },
      });
      await prisma.qualityAudit.update({
        where: { id },
        data: { status: "concluido", completedAt: new Date() },
      });
    }
    return orphaned.length;
  },
};
