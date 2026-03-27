import { Router } from "express";
import { passcodeService } from "../services/passcode.service.js";

const router = Router();

router.post("/generate-random", async (req, res) => {
  const { accessToken, lockId, passcodeType, startDate, endDate } = req.body;
  try {
    const data = await passcodeService.getRandomPasscode(
      accessToken,
      lockId,
      passcodeType,
      startDate,
      endDate,
    );
    res.json(data);
  } catch (error) {
    res.status(500).json(
      error.response?.data || {
        errcode: -1,
        errmsg: "Falha ao tentar criar senha aleatória.",
      },
    );
  }
});

router.post("/add-custom", async (req, res) => {
  const {
    accessToken,
    lockId,
    passcode,
    name,
    startDate,
    endDate,
    isAllDay,
    weekDays,
    startTime,
    endTime,
  } = req.body;
  try {
    const data = await passcodeService.addCustomPasscode(
      accessToken,
      lockId,
      passcode,
      name,
      startDate,
      endDate,
      isAllDay,
      weekDays,
      startTime,
      endTime,
    );
    res.json(data);
  } catch (error) {
    res.status(500).json(
      error.response?.data || {
        errcode: -1,
        errmsg: "Falha ao adicionar senha customizada.",
      },
    );
  }
});

router.post("/list", async (req, res) => {
  const { accessToken, lockId, pageNo, pageSize } = req.body;
  try {
    const data = await passcodeService.getPasscodeList(
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
        errmsg: "Falha ao buscar lista de senhas.",
      },
    );
  }
});

router.post("/delete", async (req, res) => {
  const { accessToken, lockId, keyboardPwdId } = req.body;
  try {
    const data = await passcodeService.deletePasscode(
      accessToken,
      lockId,
      keyboardPwdId,
    );
    res.json(data);
  } catch (error) {
    res.status(500).json(
      error.response?.data || {
        errcode: -1,
        errmsg: "Falha ao excluir senha.",
      },
    );
  }
});

router.post("/change", async (req, res) => {
  const { accessToken, lockId, keyboardPwdId, newKeyboardPwd } = req.body;
  try {
    const data = await passcodeService.changePasscode(
      accessToken,
      lockId,
      keyboardPwdId,
      newKeyboardPwd,
    );
    res.json(data);
  } catch (error) {
    res.status(500).json(
      error.response?.data || {
        errcode: -1,
        errmsg: "Falha ao alterar senha.",
      },
    );
  }
});

export default router;
