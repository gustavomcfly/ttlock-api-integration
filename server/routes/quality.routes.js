import { Router } from "express";
import { qualityService } from "../services/quality.service.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/start", async (req, res) => {
  const { accessToken, lockId, criteria, testParams } = req.body;

  if (
    !accessToken ||
    !lockId ||
    !Array.isArray(criteria) ||
    criteria.length === 0
  ) {
    return res
      .status(400)
      .json({
        errcode: -1,
        errmsg: "accessToken, lockId e criteria são obrigatórios.",
      });
  }

  try {
    const data = await qualityService.startTest(
      req.user.id,
      accessToken,
      lockId,
      criteria,
      testParams || {},
    );
    res.json({ errcode: 0, data });
  } catch (error) {
    console.error("[Quality] Erro ao iniciar teste:", error);
    res.status(500).json({ errcode: -1, errmsg: "Erro ao iniciar teste" });
  }
});

router.post("/status", async (req, res) => {
  const { testId } = req.body;
  try {
    const data = await qualityService.getStatus(req.user.id, testId);
    res.json({ errcode: 0, data });
  } catch (error) {
    console.error("[Quality] Erro ao obter status:", error);
    res.status(500).json({ errcode: -1, errmsg: "Erro ao obter status" });
  }
});

router.post("/list", async (req, res) => {
  const { lockId } = req.body;
  try {
    const data = await qualityService.getAllTests(req.user.id, lockId);
    res.json({ errcode: 0, list: data });
  } catch (error) {
    console.error("[Quality] Erro ao listar testes:", error);
    res.status(500).json({ errcode: -1, errmsg: "Erro ao obter testes" });
  }
});

router.post("/delete", async (req, res) => {
  const { testId } = req.body;
  if (!testId) {
    return res
      .status(400)
      .json({ errcode: -1, errmsg: "testId é obrigatório." });
  }
  try {
    const result = await qualityService.deleteTest(req.user.id, testId);
    if (result.deleted) return res.json({ errcode: 0 });
    if (result.reason === "running")
      return res.status(409).json({
        errcode: -1,
        errmsg: "Não é possível apagar uma auditoria em execução.",
      });
    return res
      .status(404)
      .json({ errcode: -1, errmsg: "Auditoria não encontrada." });
  } catch (error) {
    console.error("[Quality] Erro ao apagar teste:", error);
    res.status(500).json({ errcode: -1, errmsg: "Erro ao apagar auditoria" });
  }
});

export default router;
