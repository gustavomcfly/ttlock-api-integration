import { lockService } from "./lock.service.js";
import { passcodeService } from "./passcode.service.js";
import { rfidService } from "./rfid.service.js";
import { fingerprintService } from "./fingerprint.service.js";
import { recordService } from "./record.service.js";

const activeQualityTests = new Map();

export const qualityService = {
  startTest(accessToken, lockId, criteria, testParams) {
    const testId = `Q-${Math.floor(Math.random() * 1000000)}`;

    const steps = criteria.map((c) => ({
      id: c,
      name: this.getStepName(c),
      status: "pendente",
      errorMsg: null,
      logs: [],
    }));

    const testState = {
      testId,
      lockId,
      lockName: testParams.lockName || `Lock ${lockId}`,
      status: "executando",
      startTime: Date.now(),
      endTime: null,
      steps: steps,
      params: testParams,
    };

    activeQualityTests.set(testId, testState);
    this.runScript(accessToken, lockId, testId);

    return testState;
  },

  getStepName(stepId) {
    const names = {
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
    return names[stepId] || stepId;
  },

  async runScript(accessToken, lockId, testId) {
    const test = activeQualityTests.get(testId);
    if (!test) return;

    for (let i = 0; i < test.steps.length; i++) {
      const step = test.steps[i];
      step.status = "executando";

      const log = (msg) => {
        step.logs.push(msg);
      };

      try {
        await new Promise((res) => setTimeout(res, 1500));

        let result = {};
        switch (step.id) {
          case "get_info":
            log("Solicitando parâmetros via Gateway...");
            result = await lockService.getLockDetails(accessToken, lockId);
            if (!result.errcode || result.errcode === 0) {
              result.success = true;
              log(`Bateria: ${result.electricQuantity || 0}%`);
              log(`MAC Address: ${result.lockMac || "Desconhecido"}`);
              log(`Firmware: ${result.firmwareRevision || "Desconhecido"}`);
            }
            break;

          case "remote_unlock":
            log("Enviando comando de abertura remota...");
            result = await lockService.remoteUnlock(accessToken, lockId);
            if (!result.errcode || result.errcode === 0) {
              log("Fechadura desbloqueada.");
              log("Aguardando 3 segundos...");
              await new Promise((res) => setTimeout(res, 3000));
              log("Enviando comando de bloqueio remoto...");

              const lockRes = await lockService.remoteLock(accessToken, lockId);
              if (!lockRes.errcode || lockRes.errcode === 0) {
                log("Fechadura bloqueada.");
                result.success = true;
              } else {
                result.success = false;
                result.errmsg = lockRes.errmsg || "Falha ao bloquear";
              }
            }
            break;

          case "add_passcode":
            log(`Configurando senha numérica: ${test.params.stdPasscode}`);
            result = await passcodeService.addCustomPasscode(
              accessToken,
              lockId,
              test.params.stdPasscode,
              `${test.params.testerName} (QA)`,
              Date.now(),
              0,
              1,
              "",
              "",
              "",
            );
            if (!result.errcode || result.errcode === 0) {
              result.success = true;
              log("Senha sincronizada com sucesso.");
            }
            break;

          case "add_rfid":
            log(`Sincronizando ID RFID: ${test.params.stdCard}`);
            result = await rfidService.addCard(
              accessToken,
              lockId,
              test.params.stdCard,
              `${test.params.testerName} (QA)`,
              0,
              0,
            );
            if (!result.errcode || result.errcode === 0) {
              result.success = true;
              log("Cartão RFID sincronizado com sucesso.");
            }
            break;

          case "add_fingerprint":
            log(`Sincronizando ID Biométrico: ${test.params.stdFingerprint}`);
            result = await fingerprintService.addFingerprint(
              accessToken,
              lockId,
              test.params.stdFingerprint,
              `${test.params.testerName} (QA)`,
              0,
              0,
            );
            if (!result.errcode || result.errcode === 0) {
              result.success = true;
              log("Biometria sincronizada com sucesso.");
            }
            break;

          case "rename_lock":
            log("Alterando nome da fechadura para 'Pado QA Test'...");
            result = await lockService.renameLock(
              accessToken,
              lockId,
              "Pado QA Test",
            );
            if (!result.errcode || result.errcode === 0) {
              result.success = true;
              log("Nome atualizado com sucesso.");
            }
            break;

          case "passage_mode":
            log("Ativando Modo Passagem (Always Open)...");
            const pmOn = await lockService.configPassageMode(
              accessToken,
              lockId,
              1,
              1,
            );
            if (!pmOn.errcode || pmOn.errcode === 0) {
              log("Modo Passagem ativado.");
              log("Aguardando 2 segundos...");
              await new Promise((res) => setTimeout(res, 2000));
              log("Desativando Modo Passagem...");
              const pmOff = await lockService.configPassageMode(
                accessToken,
                lockId,
                0,
                1,
              );
              if (!pmOff.errcode || pmOff.errcode === 0) {
                log("Modo Passagem desativado.");
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

          case "get_records":
            log("Solicitando histórico do Datalog...");
            result = await recordService.getRecords(accessToken, lockId, 1, 20);
            if (!result.errcode || result.errcode === 0) {
              result.success = true;
              const count = result.list ? result.list.length : 0;
              log(
                `Histórico puxado com sucesso (${count} registros retornados).`,
              );
            }
            break;

          case "check_update":
            log("Verificando atualizações de firmware...");
            result = await lockService.checkUpdate(accessToken, lockId);
            if (!result.errcode || result.errcode === 0) {
              result.success = true;
              if (result.needUpgrade === 1) {
                log("Atualização disponível (Necessário app via Bluetooth).");
              } else if (result.needUpgrade === 0) {
                log("Firmware atualizado.");
              } else {
                log("Status de versão desconhecido.");
              }
            }
            break;

          default:
            result.success = true;
        }

        if (result.success) {
          step.status = "sucesso";
        } else {
          step.status = "falha";
          step.errorMsg = result.errmsg || "Falha de Sincronização no Gateway";
        }
      } catch (error) {
        step.status = "falha";
        step.errorMsg =
          error.response?.data?.errmsg || error.message || "Erro Desconhecido";
      }
    }

    test.status = "concluido";
    test.endTime = Date.now();
  },

  getStatus(testId) {
    return activeQualityTests.get(testId) || null;
  },

  // NOVO MODO PARA BUSCAR A LISTA DE TESTES
  getAllTests(lockId) {
    const tests = Array.from(activeQualityTests.values());
    if (lockId) {
      return tests.filter((t) => t.lockId == lockId);
    }
    return tests;
  },
};
