import { Router } from "express";
import { qualityService } from "../services/quality.service.js";

const router = Router();

router.post("/start", (req, res) => {
  const { accessToken, lockId, criteria, testParams } = req.body;
  try {
    const data = qualityService.startTest(
      accessToken,
      lockId,
      criteria,
      testParams,
    );
    res.json({ errcode: 0, data });
  } catch (error) {
    res.status(500).json({ errcode: -1, errmsg: "Erro ao iniciar teste" });
  }
});

router.post("/status", (req, res) => {
  const { testId } = req.body;
  try {
    const data = qualityService.getStatus(testId);
    res.json({ errcode: 0, data });
  } catch (error) {
    res.status(500).json({ errcode: -1, errmsg: "Erro ao obter status" });
  }
  ("");
});

router.post("/list", (req, res) => {
  const { lockId } = req.body;
  try {
    const data = qualityService.getAllTests(lockId);
    res.json({ errcode: 0, list: data });
  } catch (error) {
    res.status(500).json({ errcode: -1, errmsg: "Erro ao obter testes" });
  }
});

export default router;
