import { Router } from "express";
import prisma from "../prismaClient.js";

const router = Router();

// ── Listar todos os relatórios (mais recentes primeiro) ───────
router.get("/", async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, list: reports });
  } catch (err) {
    console.error("[Reports] Erro ao listar:", err);
    res.status(500).json({ success: false, message: "Erro ao listar relatórios." });
  }
});

// ── Buscar um relatório específico ────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ success: false, message: "Relatório não encontrado." });
    res.json({ success: true, report });
  } catch (err) {
    console.error("[Reports] Erro ao buscar:", err);
    res.status(500).json({ success: false });
  }
});

// ── Salvar relatório de ciclagem ──────────────────────────────
// Chamado ao final do teste (status: completed/failed/stopped)
// O payload é o snapshot completo do CyclicTest + seus logs.
router.post("/cyclic", async (req, res) => {
  try {
    const { testId, testerName } = req.body;
    if (!testId) return res.status(400).json({ success: false, message: "testId obrigatório." });

    // Busca o teste com todos os dados
    const test = await prisma.cyclicTest.findUnique({
      where: { id: testId },
      include: {
        lock: true,
        user: true,
        logs: { orderBy: { timestamp: "asc" } },
      },
    });

    if (!test) return res.status(404).json({ success: false, message: "Teste não encontrado." });

    const successCycles = test.logs.filter((l) => l.type === "LOCK" && l.level === "success").length;
    const title = `Ciclagem · ${test.lock.lockAlias} · ${test.completedCycles.toFixed(0)}/${test.totalCycles} ciclos`;

    const report = await prisma.report.create({
      data: {
        type: "cyclic",
        title,
        lockId: test.lockId,
        lockAlias: test.lock.lockAlias,
        status: test.status,
        testerName: testerName || test.user?.name || null,
        startedAt: test.startedAt,
        completedAt: test.completedAt,
        payload: {
          testId: test.id,
          totalCycles: test.totalCycles,
          completedCycles: test.completedCycles,
          totalFailures: test.totalFailures,
          successCycles,
          batteryStart: test.batteryStart,
          batteryEnd: test.batteryEnd,
          battery: test.battery,
          delayBetweenCycles: test.delayBetweenCycles,
          maxConsecutiveFailures: test.maxConsecutiveFailures,
          lowBatteryThreshold: test.lowBatteryThreshold,
          lockMac: test.lock.lockMac,
          logs: test.logs.map((l) => ({
            type: l.type,
            level: l.level,
            message: l.message,
            timestamp: l.timestamp,
          })),
        },
      },
    });

    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error("[Reports] Erro ao salvar ciclagem:", err);
    res.status(500).json({ success: false, message: "Erro ao salvar relatório." });
  }
});

// ── Salvar relatório de qualidade ─────────────────────────────
// Recebe o snapshot do test em memória (qualityService) + testerName
router.post("/quality", async (req, res) => {
  try {
    const { testSnapshot, testerName } = req.body;
    if (!testSnapshot) return res.status(400).json({ success: false, message: "testSnapshot obrigatório." });

    const { testId, lockId, lockName, status, startTime, endTime, steps } = testSnapshot;

    const successCount = steps.filter((s) => s.status === "sucesso").length;
    const failCount    = steps.filter((s) => s.status === "falha").length;
    const finalStatus  = status === "concluido"
      ? steps.every((s) => s.status === "sucesso") ? "aprovado" : "reprovado"
      : status;

    const title = `Qualidade · ${lockName} · ${successCount}/${steps.length} etapas OK`;

    const report = await prisma.report.create({
      data: {
        type: "quality",
        title,
        lockId: parseInt(lockId),
        lockAlias: lockName,
        status: finalStatus,
        testerName: testerName || null,
        startedAt: new Date(startTime),
        completedAt: endTime ? new Date(endTime) : new Date(),
        payload: {
          testId,
          totalSteps: steps.length,
          successCount,
          failCount,
          steps: steps.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            errorMsg: s.errorMsg,
            logs: s.logs,
          })),
        },
      },
    });

    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error("[Reports] Erro ao salvar qualidade:", err);
    res.status(500).json({ success: false, message: "Erro ao salvar relatório." });
  }
});

// ── Deletar relatório ─────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await prisma.report.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error("[Reports] Erro ao deletar:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
