import { Router } from "express";
import { recordService } from "../services/record.service.js";

const router = Router();

router.post("/list", async (req, res) => {
  const { accessToken, lockId, pageNo, pageSize } = req.body;
  try {
    const data = await recordService.getRecords(
      accessToken,
      lockId,
      pageNo,
      pageSize,
    );
    res.json(data);
  } catch (error) {
    res.status(500).json(
      error.response?.data || {
        errcode: -1,
        errmsg: "Erro ao obter histórico de abertura",
      },
    );
  }
});

router.post("/clear", async (req, res) => {
  const { accessToken, lockId } = req.body;
  try {
    const data = await recordService.clearRecords(accessToken, lockId);
    res.json(data);
  } catch (error) {
    res.status(500).json(
      error.response?.data || {
        errcode: -1,
        errmsg: "Erro ao limpar histórico de abertura",
      },
    );
  }
});

export default router;
