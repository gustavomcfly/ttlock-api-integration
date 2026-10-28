import { Router } from "express";
import prisma from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const FINAL_CYCLIC = ["completed", "failed", "stopped"];

// Nome do testador: o que veio na requisição > o que o usuário configurou > nome do usuário.
async function resolveTesterName(userId, preferred, fallback) {
  if (preferred) return preferred;
  if (fallback) return fallback;
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { testerName: true },
  });
  return settings?.testerName || null;
}

// ── Listar os relatórios DO USUÁRIO (mais recentes primeiro) ──
router.get("/", async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, list: reports });
  } catch (err) {
    console.error("[Reports] Erro ao listar:", err);
    res.status(500).json({ success: false, message: "Erro ao listar relatórios." });
  }
});

// ── Buscar um relatório específico (só se for do usuário) ─────
router.get("/:id", async (req, res) => {
  try {
    const report = await prisma.report.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!report) return res.status(404).json({ success: false, message: "Relatório não encontrado." });
    res.json({ success: true, report });
  } catch (err) {
    console.error("[Reports] Erro ao buscar:", err);
    res.status(500).json({ success: false });
  }
});

// ── Salvar relatório de ciclagem ──────────────────────────────
// Snapshot completo do CyclicTest + seus logs, ligado ao teste e ao usuário.
// Salvar duas vezes o mesmo teste devolve o relatório já existente.
router.post("/cyclic", async (req, res) => {
  try {
    const { testId, testerName } = req.body;
    if (!testId) return res.status(400).json({ success: false, message: "testId obrigatório." });

    const test = await prisma.cyclicTest.findFirst({
      where: { id: testId, userId: req.user.id },
      include: {
        lock: true,
        user: true,
        logs: { orderBy: { timestamp: "asc" } },
      },
    });
    if (!test) return res.status(404).json({ success: false, message: "Teste não encontrado." });

    if (!FINAL_CYCLIC.includes(test.status)) {
      return res.status(409).json({
        success: false,
        message: "O teste ainda está em andamento. Finalize-o antes de salvar o relatório.",
      });
    }

    const existing = await prisma.report.findUnique({ where: { cyclicTestId: test.id } });
    if (existing) return res.status(200).json({ success: true, report: existing, alreadySaved: true });

    const successCycles = test.logs.filter((l) => l.type === "LOCK" && l.level === "success").length;
    const title = `Ciclagem · ${test.lock.lockAlias} · ${test.completedCycles.toFixed(0)}/${test.totalCycles} ciclos`;
    const tester = await resolveTesterName(req.user.id, testerName, test.user?.name);

    try {
      const report = await prisma.report.create({
        data: {
          type: "cyclic",
          title,
          userId: req.user.id,
          lockId: test.lockId,
          cyclicTestId: test.id,
          lockAlias: test.lock.lockAlias,
          status: test.status,
          testerName: tester,
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
      // Duplo clique / requisições simultâneas: a coluna é UNIQUE, devolve o que já existe.
      if (err.code === "P2002") {
        const dup = await prisma.report.findUnique({ where: { cyclicTestId: test.id } });
        return res.status(200).json({ success: true, report: dup, alreadySaved: true });
      }
      throw err;
    }
  } catch (err) {
    console.error("[Reports] Erro ao salvar ciclagem:", err);
    res.status(500).json({ success: false, message: "Erro ao salvar relatório." });
  }
});

// ── Salvar relatório de qualidade ─────────────────────────────
// Agora o servidor monta o snapshot a partir da auditoria salva no banco
// (antes confiava no JSON que o navegador devolvia).
router.post("/quality", async (req, res) => {
  try {
    const { testerName } = req.body;
    const testId = req.body.testId || req.body.testSnapshot?.testId;
    if (!testId) return res.status(400).json({ success: false, message: "testId obrigatório." });

    const audit = await prisma.qualityAudit.findFirst({
      where: { id: testId, userId: req.user.id },
      include: { lock: true, steps: { orderBy: { position: "asc" } } },
    });
    if (!audit) return res.status(404).json({ success: false, message: "Teste não encontrado." });

    if (audit.status === "executando") {
      return res.status(409).json({
        success: false,
        message: "A auditoria ainda está em andamento. Aguarde a conclusão para salvar o relatório.",
      });
    }

    const existing = await prisma.report.findUnique({ where: { qualityAuditId: audit.id } });
    if (existing) return res.status(200).json({ success: true, report: existing, alreadySaved: true });

    const steps = audit.steps;
    const lockName = audit.params?.lockName || audit.lock.lockAlias;
    const successCount = steps.filter((s) => s.status === "sucesso").length;
    const failCount = steps.filter((s) => s.status === "falha").length;
    const finalStatus = steps.every((s) => s.status === "sucesso") ? "aprovado" : "reprovado";
    const title = `Qualidade · ${lockName} · ${successCount}/${steps.length} etapas OK`;
    const tester = await resolveTesterName(req.user.id, testerName, audit.testerName);

    try {
      const report = await prisma.report.create({
        data: {
          type: "quality",
          title,
          userId: req.user.id,
          lockId: audit.lockId,
          qualityAuditId: audit.id,
          lockAlias: lockName,
          status: finalStatus,
          testerName: tester,
          startedAt: audit.startedAt,
          completedAt: audit.completedAt ?? new Date(),
          payload: {
            testId: audit.id,
            totalSteps: steps.length,
            successCount,
            failCount,
            steps: steps.map((s) => ({
              id: s.stepKey,
              name: s.stepName,
              status: s.status,
              errorMsg: s.errorMsg,
              logs: s.logs,
            })),
          },
        },
      });
      res.status(201).json({ success: true, report });
    } catch (err) {
      if (err.code === "P2002") {
        const dup = await prisma.report.findUnique({ where: { qualityAuditId: audit.id } });
        return res.status(200).json({ success: true, report: dup, alreadySaved: true });
      }
      throw err;
    }
  } catch (err) {
    console.error("[Reports] Erro ao salvar qualidade:", err);
    res.status(500).json({ success: false, message: "Erro ao salvar relatório." });
  }
});

// ── Deletar relatório (só o próprio) ──────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { count } = await prisma.report.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (count === 0) return res.status(404).json({ success: false, message: "Relatório não encontrado." });
    res.json({ success: true });
  } catch (err) {
    console.error("[Reports] Erro ao deletar:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
